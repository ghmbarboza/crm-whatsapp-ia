import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function callAI(conteudo: string): Promise<AIResponse> {
  const apiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
  const apiKey = Deno.env.get("AI_API_KEY");
  const model = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

  if (!apiKey) {
    const lower = conteudo.toLowerCase();
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
    const result = await callAI(conteudo);

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

    if (result.classificacao === "quente") {
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

      const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
      const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
      const instance = Deno.env.get("EVOLUTION_INSTANCE") || "crm-whatsapp";
      const notifyPhone = Deno.env.get("EVOLUTION_NOTIFY_PHONE");

      if (evolutionUrl && evolutionKey && notifyPhone) {
        await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evolutionKey },
          body: JSON.stringify({ number: notifyPhone.replace(/\D/g, ""), text: followUpMsg }),
        });

        await supabase
          .from("alertas")
          .update({ enviado: true, enviado_em: new Date().toISOString() })
          .eq("lead_id", lead_id)
          .eq("tipo", "lead_quente")
          .is("enviado_em", null);
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
