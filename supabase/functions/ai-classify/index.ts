import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEvolutionTextMessage } from "../_shared/evolutionApi.ts";
import { loadEvolutionConfigFromDb } from "../_shared/evolutionConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassifyRequest {
  lead_id: string;
  mensagem_id: string;
  conteudo: string;
}

interface AIResponse {
  classificacao: "quente" | "morno" | "frio";
  sentimento: "positivo" | "neutro" | "negativo";
  sugestao_resposta?: string;
}

interface AISettings {
  keywords_quente: string[];
  keywords_frio: string[];
  trigger_notify_quente: boolean;
  trigger_notify_morno: boolean;
  trigger_notify_frio: boolean;
  classifier_version: string;
}

async function loadSettings(supabase: ReturnType<typeof createClient>): Promise<AISettings> {
  const { data } = await supabase.from("ai_classification_settings").select("param_name, param_value");
  const map = Object.fromEntries((data ?? []).map((r: { param_name: string; param_value: unknown }) => [r.param_name, r.param_value]));
  return {
    keywords_quente: (map.keywords_quente as string[]) ?? ["comprar", "urgente", "interessado"],
    keywords_frio: (map.keywords_frio as string[]) ?? ["cancelar", "não tenho interesse"],
    trigger_notify_quente: map.trigger_notify_quente !== false,
    trigger_notify_morno: map.trigger_notify_morno === true,
    trigger_notify_frio: map.trigger_notify_frio === true,
    classifier_version: (map.classifier_version as string) ?? "1.0.0",
  };
}

async function callAI(conteudo: string, settings: AISettings): Promise<AIResponse> {
  const lower = conteudo.toLowerCase();
  if (settings.keywords_quente.some((k) => lower.includes(k.toLowerCase()))) {
    return {
      classificacao: "quente",
      sentimento: "positivo",
      sugestao_resposta: "Olá! Obrigado pelo contato. Como posso ajudá-lo hoje?",
    };
  }
  if (settings.keywords_frio.some((k) => lower.includes(k.toLowerCase()))) {
    return {
      classificacao: "frio",
      sentimento: "negativo",
      sugestao_resposta: "Entendido. Fico à disposição caso mude de ideia.",
    };
  }

  const apiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
  const apiKey = Deno.env.get("AI_API_KEY");
  const model = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

  if (!apiKey) {
    const quente = ["comprar", "urgente", "interessado", "orçamento", "preço"].some((w) => lower.includes(w));
    const negativo = ["não", "cancelar", "reclamação", "ruim"].some((w) => lower.includes(w));
    return {
      classificacao: quente ? "quente" : "morno",
      sentimento: negativo ? "negativo" : quente ? "positivo" : "neutro",
      sugestao_resposta: "Olá! Obrigado pelo contato. Como posso ajudá-lo hoje?",
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `Você é um assistente de CRM em pt-BR. Analise a mensagem e retorne JSON com:
- classificacao: "quente", "morno" ou "frio"
- sentimento: "positivo", "neutro" ou "negativo"
- sugestao_resposta: uma sugestão breve de resposta para o vendedor`,
        },
        { role: "user", content: conteudo },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  return {
    classificacao: parsed.classificacao || "morno",
    sentimento: parsed.sentimento || "neutro",
    sugestao_resposta: parsed.sugestao_resposta,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lead_id, mensagem_id, conteudo }: ClassifyRequest = await req.json();
    const settings = await loadSettings(supabase);
    const result = await callAI(conteudo, settings);

    await supabase
      .from("mensagens_whatsapp")
      .update({ sentimento: result.sentimento, analisado: true })
      .eq("id", mensagem_id);

    await supabase
      .from("leads")
      .update({
        classificacao: result.classificacao,
        sentimento: result.sentimento,
      })
      .eq("id", lead_id);

    await supabase.from("lead_auto_classifications").insert({
      lead_id,
      classification_enum: result.classificacao,
      sentiment: result.sentimento,
      trigger_source: "ai_classify",
      classifier_version: settings.classifier_version,
      initial_message: conteudo.slice(0, 500),
    });

    if (result.classificacao === "quente" && settings.trigger_notify_quente) {
      const { data: existingAlert } = await supabase
        .from("alertas")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("tipo", "lead_quente")
        .limit(1)
        .maybeSingle();

      if (!existingAlert) {
        const { data: lead } = await supabase
          .from("leads")
          .select("responsavel_id, nome")
          .eq("id", lead_id)
          .single();

        const followUpMsg = `🔥 Lead quente: ${lead?.nome || "Novo lead"} demonstrou alto interesse. Responda rapidamente!`;

        await supabase.from("alertas").insert({
          lead_id,
          user_id: lead?.responsavel_id,
          tipo: "lead_quente",
          mensagem: followUpMsg,
          enviado: false,
        });

        const notifyPhone = Deno.env.get("EVOLUTION_NOTIFY_PHONE");
        const evolution = await loadEvolutionConfigFromDb(supabase);

        if (evolution && notifyPhone) {
          await sendEvolutionTextMessage(
            evolution.url,
            evolution.key,
            evolution.instance,
            notifyPhone.replace(/\D/g, ""),
            followUpMsg,
          );

          await supabase
            .from("alertas")
            .update({ enviado: true, enviado_em: new Date().toISOString() })
            .eq("lead_id", lead_id)
            .eq("tipo", "lead_quente")
            .is("enviado_em", null);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
