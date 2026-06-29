import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizeEvolutionUrl } from "./evolutionApi.ts";

export interface StoredEvolutionConfig {
  url: string;
  key: string;
  instance: string;
}

export async function loadEvolutionConfigFromDb(
  service: ReturnType<typeof createClient>,
): Promise<StoredEvolutionConfig | null> {
  const { data: settings } = await service
    .from("integration_settings")
    .select("parameters_json")
    .eq("type", "whatsapp")
    .maybeSingle();

  const params = (settings?.parameters_json ?? {}) as Record<string, unknown>;
  const envUrl = Deno.env.get("EVOLUTION_API_URL");
  const envKey = Deno.env.get("EVOLUTION_API_KEY");

  const url = (params.evolution_url as string | undefined) || envUrl;
  const key = (params.evolution_api_key as string | undefined) || envKey;

  const { data: waConfig } = await service
    .from("whatsapp_config")
    .select("instance_name")
    .limit(1)
    .maybeSingle();

  const instance =
    waConfig?.instance_name ||
    (params.evolution_instance as string | undefined) ||
    Deno.env.get("EVOLUTION_INSTANCE") ||
    "crm-whatsapp";

  if (!url || !key) return null;

  return {
    url: normalizeEvolutionUrl(url),
    key,
    instance,
  };
}
