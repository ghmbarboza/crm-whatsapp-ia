import { supabase } from '@/integrations/supabase/client'
import { isEvolutionConfigured } from '@/services/evolutionApi'
import type {
  BusinessHours,
  IntegrationLog,
  IntegrationSettings,
  WhatsappNumber,
} from '@/integrations/supabase/types'
import { phoneToDigits } from '@/utils/formatPhone'

export const integrationKeys = {
  settings: ['integration-settings'] as const,
  numbers: ['whatsapp-numbers'] as const,
  logs: (filters?: { event?: string; from?: string; to?: string }) =>
    ['integration-logs', filters] as const,
}

const TEST_COOLDOWN_MS = 30_000
let lastConnectivityTest = 0

export function canRunConnectivityTest(): boolean {
  return Date.now() - lastConnectivityTest >= TEST_COOLDOWN_MS
}

export function markConnectivityTestRun() {
  lastConnectivityTest = Date.now()
}

export function connectivityTestRemainingMs(): number {
  const elapsed = Date.now() - lastConnectivityTest
  return Math.max(0, TEST_COOLDOWN_MS - elapsed)
}

export async function fetchIntegrationSettings(): Promise<IntegrationSettings> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .eq('type', 'whatsapp')
    .single()
  if (error) throw error
  const settings = data as IntegrationSettings
  if (settings.parameters_json?.evolution_api_key) {
    settings.parameters_json = {
      ...settings.parameters_json,
      evolution_api_key: undefined,
    }
  }
  return settings
}

export function isEvolutionIntegrationConfigured(
  settings?: IntegrationSettings | null
): boolean {
  return isEvolutionConfigured(settings?.parameters_json)
}

export async function updateIntegrationParameters(
  parameters: IntegrationSettings['parameters_json']
): Promise<void> {
  const { error } = await supabase
    .from('integration_settings')
    .update({ parameters_json: parameters })
    .eq('type', 'whatsapp')
  if (error) throw error
  await logIntegrationEvent('settings_update', 'success', 'Parâmetros de atendimento atualizados')
}

export async function fetchWhatsappNumbers(): Promise<WhatsappNumber[]> {
  const { data, error } = await supabase
    .from('whatsapp_numbers')
    .select('*, equipes(id, nome)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WhatsappNumber[]
}

export async function addWhatsappNumber(
  phone: string,
  assignedTeamId: string | null
): Promise<void> {
  const digits = phoneToDigits(phone)
  if (digits.length < 10) throw new Error('Número inválido')
  const { error } = await supabase.from('whatsapp_numbers').insert({
    phone: digits,
    assigned_team_id: assignedTeamId,
    is_active: true,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Número já cadastrado')
    throw error
  }
  await logIntegrationEvent('number_add', 'success', `Número ${digits} adicionado`)
}

export async function updateWhatsappNumberTeam(
  id: string,
  assignedTeamId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_numbers')
    .update({ assigned_team_id: assignedTeamId })
    .eq('id', id)
  if (error) throw error
  await logIntegrationEvent('number_update', 'success', 'Time responsável atualizado')
}

export async function countActiveLeadsForPhone(phone: string): Promise<number> {
  const digits = phoneToDigits(phone)
  const { data, error } = await supabase
    .from('leads')
    .select('telefone, etapa_pipeline, deleted_at')
    .is('deleted_at', null)
    .neq('etapa_pipeline', 'Fechado')
  if (error) throw error
  return (data ?? []).filter((l) => phoneToDigits(l.telefone) === digits).length
}

export async function removeWhatsappNumber(id: string, phone: string): Promise<void> {
  const active = await countActiveLeadsForPhone(phone)
  if (active > 0) {
    throw new Error(`Número vinculado a ${active} lead(s) ativo(s). Não é possível remover.`)
  }
  const { error } = await supabase.from('whatsapp_numbers').delete().eq('id', id)
  if (error) throw error
  await logIntegrationEvent('number_remove', 'success', `Número ${phone} removido`)
}

export async function fetchIntegrationLogs(filters?: {
  event?: string
  from?: string
  to?: string
  limit?: number
}): Promise<IntegrationLog[]> {
  let query = supabase
    .from('integration_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.event && filters.event !== 'all') {
    query = query.eq('event', filters.event)
  }
  if (filters?.from) {
    query = query.gte('timestamp', filters.from)
  }
  if (filters?.to) {
    query = query.lte('timestamp', filters.to)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as IntegrationLog[]
}

export async function logIntegrationEvent(
  event: string,
  status: IntegrationLog['status'],
  description?: string
): Promise<void> {
  const { error } = await supabase.rpc('log_integration_event', {
    p_event: event,
    p_status: status,
    p_description: description ?? null,
  })
  if (error) {
    const { error: insertError } = await supabase.from('integration_logs').insert({
      event,
      status,
      description: description ?? null,
    })
    if (insertError) throw insertError
  }
}

export function exportIntegrationLogsCsv(logs: IntegrationLog[]): string {
  const header = 'Data,Evento,Status,Detalhes'
  const rows = logs.map((l) =>
    [
      l.timestamp,
      l.event,
      l.status,
      `"${(l.description ?? '').replace(/"/g, '""')}"`,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function validateBusinessHours(hours: BusinessHours): string | null {
  for (const [day, slot] of Object.entries(hours)) {
    if (!slot.enabled) continue
    if (!slot.start || !slot.end) return `Horário incompleto em ${day}`
    if (!/^\d{2}:\d{2}$/.test(slot.start) || !/^\d{2}:\d{2}$/.test(slot.end)) {
      return 'Use formato HH:mm'
    }
    if (slot.start >= slot.end) return `Faixa inválida em ${day}: início deve ser antes do fim`
  }
  return null
}

export function previewAutoMessage(message: string): string {
  return message
    .replace(/\{\{nome\}\}/gi, 'Maria Silva')
    .replace(/\{\{etapa\}\}/gi, 'Novo')
}

type IntegrationAction = 'setup' | 'connect' | 'status' | 'test'

function formatInvokeError(status: number, body: Record<string, unknown>): string {
  const raw = body.error
  if (typeof raw === 'string') {
    return raw.replace(/^Error:\s*/i, '')
  }
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return String((raw as { message?: string }).message ?? `Falha na integração (${status})`)
  }
  return `Falha na integração Evolution (${status})`
}

async function invokeIntegration(
  action: IntegrationAction,
  payload?: Record<string, unknown>
) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase não configurado no ambiente.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-integration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(formatInvokeError(response.status, body))
  }
  if (body.error) {
    throw new Error(formatInvokeError(response.status, body))
  }

  return body as {
    status?: 'connected' | 'disconnected'
    qr_code?: string | null
    ok?: boolean
    configured?: boolean
  }
}

export async function setupEvolutionConnection(
  evolutionUrl: string,
  evolutionApiKey: string
): Promise<{ status: 'connected' | 'disconnected'; qr_code?: string | null }> {
  const data = await invokeIntegration('setup', {
    evolution_url: evolutionUrl.trim(),
    evolution_api_key: evolutionApiKey.trim(),
  })
  return {
    status: data.status ?? 'disconnected',
    qr_code: data.qr_code,
  }
}

export async function pairWhatsappQr(): Promise<{ status: 'connected' | 'disconnected'; qr_code?: string | null }> {
  const data = await invokeIntegration('connect')
  return {
    status: data.status ?? 'disconnected',
    qr_code: data.qr_code,
  }
}

export async function refreshWhatsappConnectionStatus(): Promise<'connected' | 'disconnected'> {
  const data = await invokeIntegration('status')
  return data.status ?? 'disconnected'
}

export async function testWhatsappConnectivity(): Promise<boolean> {
  if (!canRunConnectivityTest()) {
    throw new Error('Aguarde 30 segundos entre testes de conectividade')
  }
  markConnectivityTestRun()
  const data = await invokeIntegration('test')
  return !!data.ok
}

export function connectionStatusLabel(status: 'connected' | 'disconnected' | 'conectado' | 'desconectado'): string {
  if (status === 'connected' || status === 'conectado') return 'Conectado'
  return 'Desconectado'
}

export function isConnectedStatus(status?: string | null): boolean {
  return status === 'connected' || status === 'conectado'
}

export const WEEK_DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const

export const LOG_EVENT_LABELS: Record<string, string> = {
  evolution_setup: 'Configuração Evolution',
  pair_qr: 'Pareamento QR',
  connectivity_test: 'Teste de conectividade',
  settings_update: 'Atualização de parâmetros',
  number_add: 'Número adicionado',
  number_update: 'Número atualizado',
  number_remove: 'Número removido',
}
