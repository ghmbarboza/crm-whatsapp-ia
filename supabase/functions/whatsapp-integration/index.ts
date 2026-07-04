import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  connectEvolutionInstance,
  extractQrCode,
  getEvolutionConnectionState,
  getSupabaseWebhookUrl,
  isEvolutionConnected,
  normalizeEvolutionUrl,
  provisionEvolutionInstance,
  setEvolutionWebhook,
  verifyEvolutionCredentials,
} from "../_shared/evolutionApi.ts";
import { loadEvolutionConfigFromDb } from "../_shared/evolutionConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "setup" | "connect" | "status" | "test";

async function assertAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data: roleRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    throw new Error("Permissão negada para pareamento");
  }
}

async function persistEvolutionSetup(
  service: ReturnType<typeof createClient>,
  config: {
    url: string;
    key: string;
    instanceName: string;
    connected: boolean;
    qrCode: string | null;
    existingParams?: Record<string, unknown>;
  },
) {
  const nextParams = {
    ...(config.existingParams ?? {}),
    evolution_url: config.url,
    evolution_api_key: config.key,
    evolution_instance: config.instanceName,
    evolution_configured: true,
  };

  await service
    .from("integration_settings")
    .update({
      parameters_json: nextParams,
      status: config.connected ? "connected" : "disconnected",
    })
    .eq("type", "whatsapp");

  const { data: waRow } = await service
    .from("whatsapp_config")
    .select("id, instance_name")
    .limit(1)
    .maybeSingle();

  const waPayload = {
    instance_name: config.instanceName,
    status: config.connected ? "conectado" : "desconectado",
    qr_code: config.connected ? null : config.qrCode,
  };

  if (waRow?.id) {
    await service.from("whatsapp_config").update(waPayload).eq("id", waRow.id);
  } else {
    await service.from("whatsapp_config").insert(waPayload);
  }
}

async function syncConnectionState(
  service: ReturnType<typeof createClient>,
  config: { url: string; key: string; instance: string },
) {
  const state = await getEvolutionConnectionState(config.url, config.key, config.instance);
  const connected = isEvolutionConnected(state);

  await service
    .from("whatsapp_config")
    .update({
      status: connected ? "conectado" : "desconectado",
      qr_code: connected ? null : undefined,
    })
    .eq("instance_name", config.instance);

  await service
    .from("integration_settings")
    .update({ status: connected ? "connected" : "disconnected" })
    .eq("type", "whatsapp");

  return connected;
}

function evolutionErrorStatus(message: string): number {
  const normalized = message.toLowerCase();
  if (normalized.includes("permissão negada")) return 403;
  if (normalized.includes("unauthorized") || normalized.includes("api key")) return 401;
  if (normalized.includes("sessão inválida") || normalized.includes("não autorizado")) return 401;
  if (normalized.includes("timeout") || normalized.includes("fetch failed") || normalized.includes("connection")) {
    return 502;
  }
  return 500;
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action as Action;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "setup") {
      await assertAdmin(supabase, user.id);

      const evolutionUrl = body.evolution_url as string | undefined;
      const evolutionKey = body.evolution_api_key as string | undefined;

      if (!evolutionUrl?.trim() || !evolutionKey?.trim()) {
        return new Response(JSON.stringify({ error: "URL e API Key são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = normalizeEvolutionUrl(evolutionUrl);
      const key = evolutionKey.trim();

      await verifyEvolutionCredentials(url, key);

      const { data: settings } = await service
        .from("integration_settings")
        .select("parameters_json")
        .eq("type", "whatsapp")
        .maybeSingle();

      const existingParams = (settings?.parameters_json ?? {}) as Record<string, unknown>;
      const preferredInstance =
        (existingParams.evolution_instance as string | undefined) ||
        undefined;

      const webhookUrl = getSupabaseWebhookUrl();
      const provisioned = await provisionEvolutionInstance(
        url,
        key,
        preferredInstance,
        webhookUrl,
      );

      await persistEvolutionSetup(service, {
        url,
        key,
        instanceName: provisioned.instanceName,
        connected: provisioned.connected,
        qrCode: provisioned.qrCode,
        existingParams,
      });

      await service.from("integration_logs").insert({
        event: "evolution_setup",
        status: "success",
        description: `Instância ${provisioned.instanceName} provisionada`,
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({
          status: provisioned.connected ? "connected" : "disconnected",
          qr_code: provisioned.qrCode,
          configured: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = await loadEvolutionConfigFromDb(service);
    if (!config) {
      return new Response(
        JSON.stringify({ error: "Configure a URL e a API Key da Evolution" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "connect") {
      await assertAdmin(supabase, user.id);

      await setEvolutionWebhook(
        config.url,
        config.key,
        config.instance,
        getSupabaseWebhookUrl(),
      );

      const connected = await syncConnectionState(service, config);
      let qr: string | null = null;

      if (!connected) {
        const data = await connectEvolutionInstance(config.url, config.key, config.instance);
        qr = extractQrCode(data);
        await service
          .from("whatsapp_config")
          .update({ qr_code: qr, status: "desconectado" })
          .eq("instance_name", config.instance);
      }

      await service.from("integration_logs").insert({
        event: "pair_qr",
        status: connected ? "success" : "info",
        description: connected ? "WhatsApp conectado" : "QR gerado",
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({
          status: connected ? "connected" : "disconnected",
          qr_code: qr,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "status") {
      const connected = await syncConnectionState(service, config);
      return new Response(JSON.stringify({ status: connected ? "connected" : "disconnected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      await setEvolutionWebhook(
        config.url,
        config.key,
        config.instance,
        getSupabaseWebhookUrl(),
      );

      const connected = await syncConnectionState(service, config);
      await service.from("integration_logs").insert({
        event: "connectivity_test",
        status: connected ? "success" : "error",
        description: connected ? "Instância aberta" : "Instância desconectada",
        user_id: user.id,
      });
      return new Response(JSON.stringify({ ok: connected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message.replace(/^Error:\s*/i, ""), evolutionErrorStatus(message));
  }
});
