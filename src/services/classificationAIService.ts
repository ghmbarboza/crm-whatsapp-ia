import { supabase } from '@/integrations/supabase/client'
import { updateAiConfig } from '@/services/configService'
import type {
  AIClassificationSettings,
  ClassificationReviewLog,
  Classificacao,
  LeadAutoClassification,
  Sentimento,
} from '@/integrations/supabase/types'

export const classificationKeys = {
  settings: ['ai-classification-settings'] as const,
  history: ['lead-auto-classifications'] as const,
  reviewLogs: ['classification-review-logs'] as const,
}

export const SENSITIVITY_MIN = 0.1
export const SENSITIVITY_MAX = 1.0
export const THRESHOLD_MIN = 0.1
export const THRESHOLD_MAX = 0.95

export interface UndoSnapshot {
  settings: AIClassificationSettings
  changedAt: number
}

function parseParamValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof fallback === 'number' && typeof value === 'number') return value as T
  if (typeof fallback === 'boolean' && typeof value === 'boolean') return value as T
  if (typeof fallback === 'string' && typeof value === 'string') return value as T
  if (Array.isArray(fallback) && Array.isArray(value)) return value as T
  return fallback
}

export const DEFAULT_AI_SETTINGS: AIClassificationSettings = {
  sentiment_sensitivity: 0.5,
  threshold_quente: 0.7,
  threshold_morno: 0.4,
  positive_sentiment_ratio: 0.6,
  min_messages_volume: 1,
  keywords_quente: ['comprar', 'urgente', 'interessado', 'orçamento', 'preço', 'contratar'],
  keywords_frio: ['não tenho interesse', 'cancelar', 'spam', 'pare'],
  trigger_notify_quente: true,
  trigger_notify_morno: false,
  trigger_notify_frio: false,
  auto_message_preview:
    'Olá {{nome}}! Identificamos interesse na etapa {{etapa}}. Em breve entraremos em contato.',
  classifier_version: '1.0.0',
}

export async function fetchAIClassificationSettings(): Promise<AIClassificationSettings> {
  const { data, error } = await supabase.from('ai_classification_settings').select('param_name, param_value')
  if (error) throw error

  const map = Object.fromEntries((data ?? []).map((r) => [r.param_name, r.param_value]))
  return {
    sentiment_sensitivity: parseParamValue(map.sentiment_sensitivity, DEFAULT_AI_SETTINGS.sentiment_sensitivity),
    threshold_quente: parseParamValue(map.threshold_quente, DEFAULT_AI_SETTINGS.threshold_quente),
    threshold_morno: parseParamValue(map.threshold_morno, DEFAULT_AI_SETTINGS.threshold_morno),
    positive_sentiment_ratio: parseParamValue(
      map.positive_sentiment_ratio,
      DEFAULT_AI_SETTINGS.positive_sentiment_ratio
    ),
    min_messages_volume: parseParamValue(map.min_messages_volume, DEFAULT_AI_SETTINGS.min_messages_volume),
    keywords_quente: parseParamValue(map.keywords_quente, DEFAULT_AI_SETTINGS.keywords_quente),
    keywords_frio: parseParamValue(map.keywords_frio, DEFAULT_AI_SETTINGS.keywords_frio),
    trigger_notify_quente: parseParamValue(map.trigger_notify_quente, DEFAULT_AI_SETTINGS.trigger_notify_quente),
    trigger_notify_morno: parseParamValue(map.trigger_notify_morno, DEFAULT_AI_SETTINGS.trigger_notify_morno),
    trigger_notify_frio: parseParamValue(map.trigger_notify_frio, DEFAULT_AI_SETTINGS.trigger_notify_frio),
    auto_message_preview: parseParamValue(map.auto_message_preview, DEFAULT_AI_SETTINGS.auto_message_preview),
    classifier_version: parseParamValue(map.classifier_version, DEFAULT_AI_SETTINGS.classifier_version),
  }
}

async function upsertParam(name: string, value: unknown) {
  const { error } = await supabase.from('ai_classification_settings').upsert(
    { param_name: name, param_value: value, updated_at: new Date().toISOString() },
    { onConflict: 'param_name' }
  )
  if (error) throw error
}

function isDrasticChange(
  prev: AIClassificationSettings,
  next: AIClassificationSettings
): boolean {
  return (
    Math.abs(prev.threshold_quente - next.threshold_quente) >= 0.2 ||
    Math.abs(prev.threshold_morno - next.threshold_morno) >= 0.2 ||
    Math.abs(prev.sentiment_sensitivity - next.sentiment_sensitivity) >= 0.3
  )
}

export function validateAISettings(settings: AIClassificationSettings): string | null {
  if (settings.threshold_morno >= settings.threshold_quente) {
    return 'Threshold morno deve ser menor que threshold quente'
  }
  if (settings.sentiment_sensitivity < SENSITIVITY_MIN || settings.sentiment_sensitivity > SENSITIVITY_MAX) {
    return `Sensibilidade deve estar entre ${SENSITIVITY_MIN} e ${SENSITIVITY_MAX}`
  }
  if (settings.threshold_quente < THRESHOLD_MIN || settings.threshold_quente > THRESHOLD_MAX) {
    return `Threshold quente deve estar entre ${THRESHOLD_MIN} e ${THRESHOLD_MAX}`
  }
  if (settings.threshold_morno < THRESHOLD_MIN || settings.threshold_morno > THRESHOLD_MAX) {
    return `Threshold morno deve estar entre ${THRESHOLD_MIN} e ${THRESHOLD_MAX}`
  }
  if (settings.min_messages_volume < 1) return 'Volume mínimo de mensagens deve ser ≥ 1'
  if (!settings.auto_message_preview.trim()) return 'Mensagem automática é obrigatória'
  const quenteDup = new Set(settings.keywords_quente.map((k) => k.toLowerCase().trim()))
  if (quenteDup.size !== settings.keywords_quente.length) return 'Palavras-chave quente duplicadas'
  const frioDup = new Set(settings.keywords_frio.map((k) => k.toLowerCase().trim()))
  if (frioDup.size !== settings.keywords_frio.length) return 'Palavras-chave frio duplicadas'
  const overlap = settings.keywords_quente.filter((k) =>
    settings.keywords_frio.some((f) => f.toLowerCase() === k.toLowerCase())
  )
  if (overlap.length) return `Palavra-chave repetida entre listas: ${overlap[0]}`
  return null
}

export async function saveAIClassificationSettings(
  settings: AIClassificationSettings,
  previous?: AIClassificationSettings
): Promise<void> {
  const validationError = validateAISettings(settings)
  if (validationError) throw new Error(validationError)

  const entries: [string, unknown][] = Object.entries(settings)
  for (const [name, value] of entries) {
    await upsertParam(name, value)
  }

  await updateAiConfig({
    threshold_quente: settings.threshold_quente,
    threshold_morno: settings.threshold_morno,
  })

  const action = previous && isDrasticChange(previous, settings) ? 'drastic_change' : 'settings_update'
  await logClassificationReview(action, {
    previous: previous ?? null,
    next: settings,
    changed_params: entries.map(([k]) => k),
  })
}

export async function restoreAIClassificationSettings(snapshot: AIClassificationSettings): Promise<void> {
  await saveAIClassificationSettings(snapshot)
  await logClassificationReview('undo', { restored: snapshot })
}

export async function fetchRecentAutoClassifications(limit = 50): Promise<LeadAutoClassification[]> {
  const { data, error } = await supabase
    .from('lead_auto_classifications')
    .select('*, leads(id, nome, telefone, etapa_pipeline)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as LeadAutoClassification[]
}

export async function fetchClassificationReviewLogs(limit = 100): Promise<ClassificationReviewLog[]> {
  const { data, error } = await supabase
    .from('classification_review_logs')
    .select('*, profiles(full_name)')
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ClassificationReviewLog[]
}

export async function logClassificationReview(
  action: string,
  exampleData: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('log_classification_review', {
    p_action: action,
    p_example_data: exampleData,
  })
  if (error) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('classification_review_logs').insert({
      admin_id: user?.id,
      action,
      example_data: exampleData,
    })
    if (insertError) throw insertError
  }
}

export async function reviewClassification(
  classificationId: string,
  approved: boolean,
  record: LeadAutoClassification
): Promise<void> {
  await logClassificationReview(approved ? 'approve' : 'reject', {
    classification_id: classificationId,
    lead_id: record.lead_id,
    classification: record.classification_enum,
    sentiment: record.sentiment,
  })

  if (!approved) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ai_feedback').insert({
      lead_id: record.lead_id,
      classificacao_ia: record.classification_enum,
      classificacao_manual: record.classification_enum === 'quente' ? 'morno' : 'quente',
      sentimento_ia: record.sentiment,
      user_id: user?.id,
    })
  }
}

export function previewClassification(
  sampleMessage: string,
  settings: AIClassificationSettings
): { classificacao: Classificacao; sentimento: Sentimento } {
  const lower = sampleMessage.toLowerCase()
  const sensitivity = settings.sentiment_sensitivity

  if (settings.keywords_quente.some((k) => lower.includes(k.toLowerCase()))) {
    return { classificacao: 'quente', sentimento: 'positivo' }
  }
  if (settings.keywords_frio.some((k) => lower.includes(k.toLowerCase()))) {
    return { classificacao: 'frio', sentimento: 'negativo' }
  }

  const positive = ['obrigado', 'interessado', 'ótimo', 'bom', 'quero', 'preciso']
  const negative = ['não', 'ruim', 'cancelar', 'reclamação', 'péssimo']
  let score = 0.5
  positive.forEach((w) => {
    if (lower.includes(w)) score += 0.12 * sensitivity
  })
  negative.forEach((w) => {
    if (lower.includes(w)) score -= 0.12 * sensitivity
  })
  score = Math.max(0, Math.min(1, score))

  const sentimento: Sentimento =
    score >= settings.positive_sentiment_ratio
      ? 'positivo'
      : score <= 1 - settings.positive_sentiment_ratio
        ? 'negativo'
        : 'neutro'

  let classificacao: Classificacao = 'frio'
  if (score >= settings.threshold_quente) classificacao = 'quente'
  else if (score >= settings.threshold_morno) classificacao = 'morno'

  return { classificacao, sentimento }
}

export function previewAutoMessage(template: string): string {
  return template.replace(/\{\{nome\}\}/gi, 'João Silva').replace(/\{\{etapa\}\}/gi, 'Novo')
}

export function exportReviewLogsCsv(logs: ClassificationReviewLog[]): string {
  const header = 'Data,Ação,Admin,Detalhes'
  const rows = logs.map((l) =>
    [
      l.timestamp,
      l.action,
      `"${(l.profiles?.full_name ?? '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.example_data).replace(/"/g, '""')}"`,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export const REVIEW_ACTION_LABELS: Record<string, string> = {
  settings_update: 'Atualização de critérios',
  drastic_change: 'Mudança drástica de critério',
  undo: 'Desfazer alteração',
  approve: 'Classificação aprovada',
  reject: 'Classificação rejeitada',
}
