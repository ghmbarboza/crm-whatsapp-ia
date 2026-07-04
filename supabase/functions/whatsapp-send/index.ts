import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEvolutionTextMessage } from "../_shared/evolutionApi.ts";
import { loadEvolutionConfigFromDb } from "../_shared/evolutionConfig.ts";
import { toEvolutionNumber } from "../_shared/phoneUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, conteudo, anexo_url } = await req.json();
    if (!lead_id || !conteudo) {
      return new Response(JSON.stringify({ error: "lead_id e conteudo obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("telefone")
      .eq("id", lead_id)
      .single();

    if (!lead) throw new Error("Lead não encontrado");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const evolution = await loadEvolutionConfigFromDb(serviceClient);
    if (!evolution) {
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada. Conecte em Configurações > WhatsApp." }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const evolutionNumber = toEvolutionNumber(lead.telefone);
    if (!evolutionNumber) {
      return new Response(JSON.stringify({ error: "Telefone do lead inválido para envio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendEvolutionTextMessage(
      evolution.url,
      evolution.key,
      evolution.instance,
      evolutionNumber,
      conteudo,
    );

    const { data: mensagem, error } = await serviceClient
      .from("mensagens_whatsapp")
      .insert({
        lead_id,
        enviado_por: user.id,
        conteudo,
        anexo_url,
        tipo: "enviada",
        analisado: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, mensagem }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[whatsapp-send]", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
