import { supabase } from '@/integrations/supabase/client'

export const dashboardKeys = {
  stats: (filters?: { inicio?: string; fim?: string }) => ['dashboard', filters] as const,
}

export async function fetchDashboardStats(filters?: { inicio?: string; fim?: string }) {
  let leadsQuery = supabase.from('leads').select('*').is('deleted_at', null)
  if (filters?.inicio) leadsQuery = leadsQuery.gte('criado_em', filters.inicio)
  if (filters?.fim) leadsQuery = leadsQuery.lte('criado_em', filters.fim)

  const [leadsRes, etapaRes, classRes, sentRes, tempoRes] = await Promise.all([
    leadsQuery,
    supabase.from('v_leads_por_etapa').select('*'),
    supabase.from('v_leads_por_classificacao').select('*'),
    supabase.from('v_leads_por_sentimento').select('*'),
    supabase.from('v_tempo_medio_resposta').select('*').single(),
  ])

  if (leadsRes.error) throw leadsRes.error

  const leads = leadsRes.data || []
  return {
    total: leads.length,
    novos: leads.filter((l) => l.etapa_pipeline === 'Novo').length,
    quentes: leads.filter((l) => l.classificacao === 'quente').length,
    emContato: leads.filter((l) => l.etapa_pipeline === 'Em Contato').length,
    fechados: leads.filter((l) => l.etapa_pipeline === 'Fechado').length,
    porEtapa: etapaRes.data || [],
    porClassificacao: classRes.data || [],
    porSentimento: sentRes.data || [],
    tempoMedioSegundos: tempoRes.data?.segundos_medio ?? 0,
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
