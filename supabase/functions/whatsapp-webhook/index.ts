import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  digitsOnly,
  formatBrazilPhone,
  normalizeBrazilDigits,
  phonesMatch,
} from "../_shared/phoneUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
}

interface MessageUpsertItem {
  key?: MessageKey;
  message?: Record<string, unknown>;
  pushName?: string;
  messageTimestamp?: number;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractPhoneFromJid(remoteJid?: string): string {
  if (!remoteJid) return "";
  if (remoteJid.includes("@g.us") || remoteJid.includes("status@broadcast")) return "";
  const localPart = remoteJid.split("@")[0] ?? "";
  return digitsOnly(localPart);
}

function extractMessageContent(message?: Record<string, unknown>): string {
  if (!message) return "";

  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }

  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text?.trim()) return extended.text.trim();

  const image = message.imageMessage as { caption?: string } | undefined;
  if (image?.caption?.trim()) return image.caption.trim();
  if (image) return "[Imagem]";

  const video = message.videoMessage as { caption?: string } | undefined;
  if (video?.caption?.trim()) return video.caption.trim();
  if (video) return "[Vídeo]";

  const document = message.documentMessage as { caption?: string; fileName?: string } | undefined;
  if (document?.caption?.trim()) return document.caption.trim();
  if (document?.fileName) return `[Documento] ${document.fileName}`;

  if (message.audioMessage) return "[Áudio]";
  if (message.stickerMessage) return "[Sticker]";
  if (message.locationMessage) return "[Localização]";
  if (message.contactMessage) return "[Contato]";

  const buttons = message.buttonsResponseMessage as { selectedDisplayText?: string } | undefined;
  if (buttons?.selectedDisplayText?.trim()) return buttons.selectedDisplayText.trim();

  const list = message.listResponseMessage as { title?: string; singleSelectReply?: { selectedRowId?: string } } | undefined;
  if (list?.title?.trim()) return list.title.trim();
  if (list?.singleSelectReply?.selectedRowId) return list.singleSelectReply.selectedRowId;

  return "";
}

function isMessagesUpsertEvent(event: string): boolean {
  const normalized = event.toLowerCase().replace(/_/g, ".");
  return normalized === "messages.upsert";
}

function isConnectionUpdateEvent(event: string): boolean {
  const normalized = event.toLowerCase().replace(/_/g, ".");
  return normalized === "connection.update";
}

function extractMessageItems(payload: Record<string, unknown>): MessageUpsertItem[] {
  const data = payload.data;
  if (Array.isArray(data)) return data as MessageUpsertItem[];
  if (data && typeof data === "object") return [data as MessageUpsertItem];
  return [];
}

async function findLeadByPhone(
  supabase: ReturnType<typeof createClient>,
  rawPhone: string,
) {
  const formatted = formatBrazilPhone(rawPhone);
  const localDigits = normalizeBrazilDigits(rawPhone);

  const { data: exact } = await supabase
    .from("leads")
    .select("*")
    .eq("telefone", formatted)
    .is("deleted_at", null)
    .maybeSingle();

  if (exact) return exact;

  const suffix = localDigits.slice(-8);
  if (suffix.length < 8) return null;

  const { data: candidates } = await supabase
    .from("leads")
    .select("*")
    .is("deleted_at", null)
    .ilike("telefone", `%${suffix}%`)
    .limit(20);

  return (candidates ?? []).find((lead) => phonesMatch(lead.telefone, rawPhone)) ?? null;
}

async function handleConnectionUpdate(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  const data = payload.data as Record<string, unknown> | undefined;
  const instance = String(payload.instance ?? "");
  const state =
    (data?.state as string | undefined) ||
    ((data?.instance as Record<string, unknown> | undefined)?.state as string | undefined);

  if (!instance || !state) {
    return jsonResponse({ ok: true, skipped: true, reason: "connection_update_incomplete" });
  }

  const connected = state === "open";
  await supabase
    .from("whatsapp_config")
    .update({
      status: connected ? "conectado" : "desconectado",
      qr_code: connected ? null : undefined,
    })
    .eq("instance_name", instance);

  await supabase
    .from("integration_settings")
    .update({ status: connected ? "connected" : "disconnected" })
    .eq("type", "whatsapp");

  return jsonResponse({ ok: true, connection: connected ? "open" : state });
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof createClient>,
  item: MessageUpsertItem,
) {
  if (item.key?.fromMe === true) {
    return { skipped: true, reason: "from_me" };
  }

  const phone = extractPhoneFromJid(item.key?.remoteJid);
  const content = extractMessageContent(item.message);
  const pushName = item.pushName || "Lead WhatsApp";

  if (!phone) return { skipped: true, reason: "invalid_jid" };
  if (!content) return { skipped: true, reason: "empty_content" };

  let lead = await findLeadByPhone(supabase, phone);

  if (!lead) {
    const formattedPhone = formatBrazilPhone(phone);
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

  return { ok: true, lead_id: lead.id, mensagem_id: mensagem.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json() as Record<string, unknown>;
    const event = String(payload.event ?? "");

    if (isConnectionUpdateEvent(event)) {
      return await handleConnectionUpdate(supabase, payload);
    }

    if (!isMessagesUpsertEvent(event)) {
      return jsonResponse({ ok: true, skipped: true, reason: "ignored_event", event });
    }

    const items = extractMessageItems(payload);
    if (items.length === 0) {
      return jsonResponse({ ok: true, skipped: true, reason: "no_message_data" });
    }

    const results = [];
    for (const item of items) {
      results.push(await handleIncomingMessage(supabase, item));
    }

    const processed = results.filter((r) => "ok" in r && r.ok);
    if (processed.length > 0) {
      return jsonResponse({ ok: true, processed: results });
    }

    return jsonResponse({ ok: true, skipped: true, results });
  } catch (error) {
    console.error("[whatsapp-webhook]", error);
    return jsonResponse({ error: String(error) }, 500);
  }
});
