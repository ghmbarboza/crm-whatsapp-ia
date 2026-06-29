import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    pushName?: string;
  };
}

function extractPhone(remoteJid?: string): string {
  if (!remoteJid) return "";
  return remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
}

function extractMessage(payload: EvolutionWebhookPayload): string {
  const msg = payload.data?.message;
  return msg?.conversation || msg?.extendedTextMessage?.text || "";
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

    const payload: EvolutionWebhookPayload = await req.json();
    const phone = extractPhone(payload.data?.key?.remoteJid);
    const content = extractMessage(payload);
    const pushName = payload.data?.pushName || "Lead WhatsApp";

    if (!phone || !content) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedPhone = phone.length === 11
      ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
      : phone;

    let { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("telefone", formattedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          nome: pushName,
          telefone: formattedPhone,
          origem: "WhatsApp",
          etapa_pipeline: "Novo",
          classificacao: "frio",
          sentimento: "neutro",
        })
        .select()
        .single();

      if (error) throw error;
      lead = newLead;
    }

    const { data: mensagem, error: msgError } = await supabase
      .from("mensagens_whatsapp")
      .insert({
        lead_id: lead.id,
        conteudo: content,
        tipo: "recebida",
        analisado: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Async AI classification (fire and forget)
    const aiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-classify`;
    fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        lead_id: lead.id,
        mensagem_id: mensagem.id,
        conteudo: content,
      }),
    }).catch(console.error);

    return new Response(JSON.stringify({ ok: true, lead_id: lead.id }), {
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
