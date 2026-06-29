import { subHours } from 'date-fns'
import type { Classificacao, Lead } from '@/integrations/supabase/types'
import { supabase } from '@/integrations/supabase/client'

export const dashboardKeys = {
  stats: (filters?: { inicio?: string; fim?: string }) => ['dashboard', filters] as const,
}

const HEAT_SCORES: Record<Classificacao, number> = {
  quente: 100,
  morno: 50,
  frio: 0,
}

export function computeMediaCalor(leads: Pick<Lead, 'classificacao'>[]): number {
  if (leads.length === 0) return 0
  const sum = leads.reduce((acc, l) => acc + (HEAT_SCORES[l.classificacao] ?? 0), 0)
  return Math.round(sum / leads.length)
}

export function heatLevelLabel(score: number): string {
  if (score >= 70) return 'Alta'
  if (score >= 40) return 'Média'
  return 'Baixa'
}

export async function fetchDashboardStats(filters?: { inicio?: string; fim?: string }) {
  const last24h = subHours(new Date(), 24).toISOString()

  let leadsQuery = supabase.from('leads').select('*').is('deleted_at', null)
  if (filters?.inicio) leadsQuery = leadsQuery.gte('criado_em', filters.inicio)
  if (filters?.fim) leadsQuery = leadsQuery.lte('criado_em', filters.fim)

  const [
    leadsRes,
    etapaRes,
    classRes,
    sentRes,
    tempoRes,
    mensagensTotalRes,
    mensagens24hRes,
    mensagensEnviadasRes,
    mensagensRecebidasRes,
    alertasNaoLidosRes,
    profilesRes,
  ] = await Promise.all([
    leadsQuery,
    supabase.from('v_leads_por_etapa').select('*'),
    supabase.from('v_leads_por_classificacao').select('*'),
    supabase.from('v_leads_por_sentimento').select('*'),
    supabase.from('v_tempo_medio_resposta').select('*').single(),
    supabase.from('mensagens_whatsapp').select('*', { count: 'exact', head: true }),
    supabase
      .from('mensagens_whatsapp')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', last24h),
    supabase
      .from('mensagens_whatsapp')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'enviada'),
    supabase
      .from('mensagens_whatsapp')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'recebida'),
    supabase
      .from('alertas')
      .select('*', { count: 'exact', head: true })
      .eq('lido', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  if (leadsRes.error) throw leadsRes.error

  const leads = leadsRes.data || []
  return {
    total: leads.length,
    novos: leads.filter((l) => l.etapa_pipeline === 'Novo').length,
    quentes: leads.filter((l) => l.classificacao === 'quente').length,
    emContato: leads.filter((l) => l.etapa_pipeline === 'Em Contato').length,
    qualificados: leads.filter((l) => l.etapa_pipeline === 'Qualificado').length,
    fechados: leads.filter((l) => l.etapa_pipeline === 'Fechado').length,
    porEtapa: etapaRes.data || [],
    porClassificacao: classRes.data || [],
    porSentimento: sentRes.data || [],
    tempoMedioSegundos: tempoRes.data?.segundos_medio ?? 0,
    mediaCalor: computeMediaCalor(leads),
    mensagensTotal: mensagensTotalRes.count ?? 0,
    mensagens24h: mensagens24hRes.count ?? 0,
    mensagensEnviadas: mensagensEnviadasRes.count ?? 0,
    mensagensRecebidas: mensagensRecebidasRes.count ?? 0,
    alertasNaoLidos: alertasNaoLidosRes.count ?? 0,
    usuariosAtivos: profilesRes.count ?? 0,
    leads,
  }
}

export async function exportLeadsCSV(filters?: { inicio?: string; fim?: string }) {
  let query = supabase.from('leads').select('*').is('deleted_at', null)
  if (filters?.inicio) query = query.gte('criado_em', filters.inicio)
  if (filters?.fim) query = query.lte('criado_em', filters.fim)
  const { data, error } = await query
  if (error) throw error

  const headers = ['nome', 'telefone', 'email', 'classificacao', 'sentimento', 'etapa_pipeline', 'criado_em']
  const csv = [
    headers.join(','),
    ...(data || []).map((row) =>
      headers.map((h) => JSON.stringify(row[h as keyof typeof row] ?? '')).join(',')
    ),
  ].join('\n')
  return csv
}

export async function exportAuditLogs(filters?: { inicio?: string; fim?: string; entidade?: string }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  const response = await supabase.functions.invoke('export-logs', { body: filters || {} })
  if (response.error) throw response.error
  return response.data as string
}
