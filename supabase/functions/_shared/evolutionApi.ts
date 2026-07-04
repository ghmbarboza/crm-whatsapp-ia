/**
 * Evolution API v2 client — endpoints mapped from prd/CrawlEvolution docs.
 * Auth: header `apikey` (global or per-instance).
 */

export const EVOLUTION_API_VERSION = "2.3.7";

/** Documented Evolution API endpoints (Evolution API / Baileys). */
export const EVOLUTION_ENDPOINTS = {
  health: { method: "GET", path: "/" },
  createInstance: { method: "POST", path: "/instance/create" },
  fetchInstances: { method: "GET", path: "/instance/fetchInstances" },
  connectInstance: { method: "GET", path: "/instance/connect/{instanceName}" },
  connectionState: { method: "GET", path: "/instance/connectionState/{instanceName}" },
  sendText: { method: "POST", path: "/message/sendText/{instanceName}" },
  setWebhook: { method: "POST", path: "/webhook/set/{instanceName}" },
  findMessages: { method: "POST", path: "/chat/findMessages/{instanceName}" },
} as const;

export const EVOLUTION_WEBHOOK_EVENTS = [
  "MESSAGES_UPSERT",
  "CONNECTION_UPDATE",
] as const;

export function getSupabaseWebhookUrl(): string {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("SUPABASE_URL não configurado");
  return `${base.replace(/\/+$/, "")}/functions/v1/whatsapp-webhook`;
}

export type EvolutionConnectionState = "open" | "close" | "connecting" | string;

export interface EvolutionInstanceSummary {
  name: string;
  connectionStatus?: string;
}

export function normalizeEvolutionUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function generateInstanceName(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `crm-${suffix}`;
}

export function extractQrCode(data: Record<string, unknown>): string | null {
  if (typeof data.base64 === "string" && data.base64.length > 0) {
    return data.base64;
  }
  const qrcode = data.qrcode as Record<string, unknown> | undefined;
  if (typeof qrcode?.base64 === "string" && qrcode.base64.length > 0) {
    return qrcode.base64;
  }
  return null;
}

export function isEvolutionConnected(state: EvolutionConnectionState | undefined): boolean {
  return state === "open";
}

function pathWithInstance(template: string, instanceName: string): string {
  return template.replace("{instanceName}", encodeURIComponent(instanceName));
}

export async function evolutionRequest<T = Record<string, unknown>>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${normalizeEvolutionUrl(baseUrl)}${path}`;
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const nestedResponse = data.response as Record<string, unknown> | undefined;
    const nestedError = data.error as Record<string, unknown> | string | undefined;
    const message =
      (nestedResponse?.message as string) ||
      (typeof nestedError === "object" && nestedError !== null
        ? String((nestedError as Record<string, unknown>).message ?? "")
        : "") ||
      (typeof nestedError === "string" ? nestedError : "") ||
      (data.message as string) ||
      text ||
      `Evolution API error ${res.status}`;
    throw new Error(message.trim() || `Evolution API error ${res.status}`);
  }

  return data as T;
}

export async function verifyEvolutionCredentials(
  baseUrl: string,
  apiKey: string,
): Promise<{ version?: string; message?: string }> {
  const health = await evolutionRequest<Record<string, unknown>>(baseUrl, apiKey, "/");
  // Per Evolution API docs, apikey is required on instance endpoints — health may not validate it.
  await fetchEvolutionInstances(baseUrl, apiKey);
  return {
    version: health.version as string | undefined,
    message: health.message as string | undefined,
  };
}

export async function fetchEvolutionInstances(
  baseUrl: string,
  apiKey: string,
): Promise<EvolutionInstanceSummary[]> {
  const data = await evolutionRequest<unknown>(baseUrl, apiKey, "/instance/fetchInstances");
  if (Array.isArray(data)) {
    return data.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name ?? ""),
        connectionStatus: row.connectionStatus as string | undefined,
      };
    });
  }
  return [];
}

export async function createEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl?: string,
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };

  if (webhookUrl) {
    body.webhook = {
      enabled: true,
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: [...EVOLUTION_WEBHOOK_EVENTS],
    };
  }

  return evolutionRequest(baseUrl, apiKey, "/instance/create", {
    method: "POST",
    body,
  });
}

export async function connectEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<Record<string, unknown>> {
  return evolutionRequest(
    baseUrl,
    apiKey,
    pathWithInstance(EVOLUTION_ENDPOINTS.connectInstance.path, instanceName),
  );
}

export async function getEvolutionConnectionState(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<EvolutionConnectionState> {
  const data = await evolutionRequest<Record<string, unknown>>(
    baseUrl,
    apiKey,
    pathWithInstance(EVOLUTION_ENDPOINTS.connectionState.path, instanceName),
  );
  const instance = data.instance as Record<string, unknown> | undefined;
  return (instance?.state as EvolutionConnectionState) ?? (data.state as EvolutionConnectionState);
}

export async function sendEvolutionTextMessage(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  number: string,
  text: string,
): Promise<Record<string, unknown>> {
  return evolutionRequest(
    baseUrl,
    apiKey,
    pathWithInstance(EVOLUTION_ENDPOINTS.sendText.path, instanceName),
    {
      method: "POST",
      body: { number, text },
    },
  );
}

export async function setEvolutionWebhook(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
): Promise<Record<string, unknown>> {
  return evolutionRequest(
    baseUrl,
    apiKey,
    pathWithInstance(EVOLUTION_ENDPOINTS.setWebhook.path, instanceName),
    {
      method: "POST",
      body: {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: [...EVOLUTION_WEBHOOK_EVENTS],
        },
      },
    },
  );
}

export async function provisionEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  preferredName?: string,
  webhookUrl?: string,
): Promise<{ instanceName: string; qrCode: string | null; connected: boolean }> {
  const normalizedUrl = normalizeEvolutionUrl(baseUrl);
  await verifyEvolutionCredentials(normalizedUrl, apiKey);

  let instanceName = preferredName?.trim() || generateInstanceName();
  const instances = await fetchEvolutionInstances(normalizedUrl, apiKey);
  const existing = instances.find((i) => i.name === instanceName);

  if (!existing) {
    try {
      const created = await createEvolutionInstance(
        normalizedUrl,
        apiKey,
        instanceName,
        webhookUrl,
      );
      const state = await getEvolutionConnectionState(normalizedUrl, apiKey, instanceName);
      return {
        instanceName,
        qrCode: extractQrCode(created),
        connected: isEvolutionConnected(state),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already|exists|conflict/i.test(message)) throw error;
      instanceName = generateInstanceName();
      const created = await createEvolutionInstance(
        normalizedUrl,
        apiKey,
        instanceName,
        webhookUrl,
      );
      const state = await getEvolutionConnectionState(normalizedUrl, apiKey, instanceName);
      return {
        instanceName,
        qrCode: extractQrCode(created),
        connected: isEvolutionConnected(state),
      };
    }
  }

  if (webhookUrl) {
    await setEvolutionWebhook(normalizedUrl, apiKey, instanceName, webhookUrl);
  }

  const state = await getEvolutionConnectionState(normalizedUrl, apiKey, instanceName);
  if (isEvolutionConnected(state)) {
    return { instanceName, qrCode: null, connected: true };
  }

  const connected = await connectEvolutionInstance(normalizedUrl, apiKey, instanceName);
  return {
    instanceName,
    qrCode: extractQrCode(connected),
    connected: false,
  };
}
