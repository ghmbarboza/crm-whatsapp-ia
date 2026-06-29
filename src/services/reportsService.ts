import { format, parseISO, eachDayOfInterval, startOfDay, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import type { Classificacao, EtapaPipeline } from '@/integrations/supabase/types'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'

export const EXPORT_LIMIT = 5000
export const ACTIVITY_PAGE_SIZE = 50
export const MONTHLY_GOAL = 100
export const FILTERS_STORAGE_KEY = 'crm-reports-filters'

export const reportsKeys = {
  data: (filters: ReportFilters) => ['reports', filters] as const,
  activity: (filters: ActivityFilters, page: number) => ['activity-logs', filters, page] as const,
  schedules: ['report-schedules'] as const,
}

export interface ReportFilters {
  inicio: string
  fim: string
  vendedorId: string
  etapas: EtapaPipeline[]
  motivoPerda: string
}

export interface ActivityFilters {
  search: string
  inicio: string
  fim: string
  userId: string
  eventType: string
}

export interface LeadReportRow {
  lead_id: string
  nome: string
  telefone: string
  email: string | null
  etapa_pipeline: EtapaPipeline
  classificacao: Classificacao
  sentimento: string
  responsavel_id: string | null
  vendedor_nome: string | null
  equipe_id: string | null
  equipe_nome: string | null
  origem: string
  anotacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface ActivityLogRow {
  id: string
  event_type: string
  entity_id: string | null
  user_id: string | null
  description: string
  created_at: string
  entity_type: string
  log_category: string
  status: string | null
  profiles?: { full_name: string } | null
}

export interface ReportMetrics {
  totalLeads: number
  novosPorDia: { date: string; total: number }[]
  taxaConversao: number
  leadsQuentes: number
  metaMensal: number
  metaAtingida: number
  tempoMedioMinutos: number
  topVendedor: { nome: string; total: number } | null
  npsScore: number | null
  porEtapa: { etapa_pipeline: string; total: number }[]
  porClassificacao: { classificacao: string; total: number }[]
  porVendedor: { vendedor: string; total: number; fechados: number }[]
  funil: { etapa: string; total: number }[]
  rows: LeadReportRow[]
}

export function loadPersistedFilters(): Partial<ReportFilters> {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<ReportFilters>) : {}
  } catch {
    return {}
  }
}

export function persistFilters(filters: ReportFilters) {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
}

export function validateDateRange(inicio: string, fim: string): string | null {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (inicio && inicio > today) return 'Data inicial não pode ser no futuro'
  if (fim && fim > today) return 'Data final não pode ser no futuro'
  if (inicio && fim && inicio > fim) return 'Data inicial deve ser anterior à final'
  return null
}

function applyLeadFilters(rows: LeadReportRow[], filters: ReportFilters): LeadReportRow[] {
  let result = rows
  if (filters.inicio) {
    result = result.filter((r) => r.criado_em >= `${filters.inicio}T00:00:00`)
  }
  if (filters.fim) {
    result = result.filter((r) => r.criado_em <= `${filters.fim}T23:59:59`)
  }
  if (filters.vendedorId && filters.vendedorId !== 'all') {
    result = result.filter((r) => r.responsavel_id === filters.vendedorId)
  }
  if (filters.etapas.length > 0) {
    result = result.filter((r) => filters.etapas.includes(r.etapa_pipeline))
  }
  if (filters.motivoPerda.trim()) {
    const q = filters.motivoPerda.toLowerCase()
    result = result.filter((r) => (r.anotacoes ?? '').toLowerCase().includes(q))
  }
  return result
}

export async function fetchReportMetrics(
  filters: ReportFilters,
  teamMemberIds?: Set<string> | null
): Promise<ReportMetrics> {
  const { data, error } = await supabase.from('lead_reports').select('*')
  if (error) throw error

  let rows = (data ?? []) as LeadReportRow[]
  if (teamMemberIds) {
    rows = rows.filter((r) => !r.responsavel_id || teamMemberIds.has(r.responsavel_id))
  }
  rows = applyLeadFilters(rows, filters)

  const fechados = rows.filter((r) => r.etapa_pipeline === 'Fechado').length
  const quentes = rows.filter((r) => r.classificacao === 'quente').length

  const porEtapaMap = new Map<string, number>()
  const porClassMap = new Map<string, number>()
  const vendedorMap = new Map<string, { total: number; fechados: number }>()

  for (const row of rows) {
    porEtapaMap.set(row.etapa_pipeline, (porEtapaMap.get(row.etapa_pipeline) ?? 0) + 1)
    porClassMap.set(row.classificacao, (porClassMap.get(row.classificacao) ?? 0) + 1)
    const vendedor = row.vendedor_nome ?? 'Sem responsável'
    const cur = vendedorMap.get(vendedor) ?? { total: 0, fechados: 0 }
    cur.total += 1
    if (row.etapa_pipeline === 'Fechado') cur.fechados += 1
    vendedorMap.set(vendedor, cur)
  }

  const porVendedor = [...vendedorMap.entries()]
    .map(([vendedor, stats]) => ({ vendedor, ...stats }))
    .sort((a, b) => b.total - a.total)

  const topVendedor = porVendedor[0] ? { nome: porVendedor[0].vendedor, total: porVendedor[0].total } : null

  let novosPorDia: { date: string; total: number }[] = []
  if (filters.inicio && filters.fim) {
    const start = parseISO(filters.inicio)
    const end = parseISO(filters.fim)
    if (!isAfter(start, end)) {
      const days = eachDayOfInterval({ start, end })
      novosPorDia = days.map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const total = rows.filter((r) => r.criado_em.startsWith(key)).length
        return { date: format(day, 'dd/MM', { locale: ptBR }), total }
      })
    }
  } else {
    const dayMap = new Map<string, number>()
    rows.forEach((r) => {
      const key = format(parseISO(r.criado_em), 'dd/MM', { locale: ptBR })
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
    })
    novosPorDia = [...dayMap.entries()].slice(-14).map(([date, total]) => ({ date, total }))
  }

  const tempoRes = await supabase.from('v_tempo_medio_resposta').select('*').single()
  const tempoMedioMinutos = tempoRes.data?.segundos_medio
    ? Math.round(Number(tempoRes.data.segundos_medio) / 60)
    : 0

  const { data: npsData } = await supabase.from('nps_survey_results').select('score')
  const npsScore =
    npsData && npsData.length > 0
      ? Math.round(npsData.reduce((s, r) => s + r.score, 0) / npsData.length)
      : null

  const monthStart = format(startOfDay(new Date()), 'yyyy-MM') + '-01'
  const metaAtingida = rows.filter((r) => r.criado_em >= monthStart && r.etapa_pipeline === 'Fechado').length

  return {
    totalLeads: rows.length,
    novosPorDia,
    taxaConversao: rows.length > 0 ? Math.round((fechados / rows.length) * 100) : 0,
    leadsQuentes: quentes,
    metaMensal: MONTHLY_GOAL,
    metaAtingida,
    tempoMedioMinutos,
    topVendedor,
    npsScore,
    porEtapa: PIPELINE_STAGES.map((e) => ({ etapa_pipeline: e, total: porEtapaMap.get(e) ?? 0 })),
    porClassificacao: [...porClassMap.entries()].map(([classificacao, total]) => ({ classificacao, total })),
    porVendedor,
    funil: PIPELINE_STAGES.map((e) => ({ etapa: e, total: porEtapaMap.get(e) ?? 0 })),
    rows,
  }
}

export async function fetchActivityLogsPage(
  filters: ActivityFilters,
  page: number,
  options: { isAdmin: boolean; teamMemberIds?: Set<string> | null }
): Promise<{ logs: ActivityLogRow[]; hasMore: boolean }> {
  const from = page * ACTIVITY_PAGE_SIZE
  const to = from + ACTIVITY_PAGE_SIZE - 1

  if (options.isAdmin) {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to + 1)

    if (filters.inicio) query = query.gte('created_at', `${filters.inicio}T00:00:00`)
    if (filters.fim) query = query.lte('created_at', `${filters.fim}T23:59:59`)
    if (filters.userId && filters.userId !== 'all') query = query.eq('user_id', filters.userId)
    if (filters.eventType && filters.eventType !== 'all') query = query.eq('event_type', filters.eventType)
    if (filters.search.trim()) query = query.ilike('description', `%${filters.search.trim()}%`)

    const { data, error } = await query
    if (error) throw error
    const rows = (data ?? []) as ActivityLogRow[]
    const hasMore = rows.length > ACTIVITY_PAGE_SIZE
    return { logs: rows.slice(0, ACTIVITY_PAGE_SIZE), hasMore }
  }

  let query = supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .order('criado_em', { ascending: false })
    .range(from, to + 1)

  if (filters.inicio) query = query.gte('criado_em', `${filters.inicio}T00:00:00`)
  if (filters.fim) query = query.lte('criado_em', `${filters.fim}T23:59:59`)
  if (filters.userId && filters.userId !== 'all') query = query.eq('user_id', filters.userId)
  if (filters.eventType && filters.eventType !== 'all') query = query.eq('acao', filters.eventType)
  if (filters.search.trim()) query = query.ilike('acao', `%${filters.search.trim()}%`)

  const { data, error } = await query
  if (error) throw error

  let rows = (data ?? []).map((r) => ({
    id: r.id,
    event_type: r.acao,
    entity_id: r.entidade_id,
    user_id: r.user_id,
    description: `${r.acao} — ${r.entidade}`,
    created_at: r.criado_em,
    entity_type: r.entidade,
    log_category: 'user_action',
    status: null,
    profiles: r.profiles as { full_name: string } | null,
  })) as ActivityLogRow[]

  if (options.teamMemberIds) {
    rows = rows.filter((l) => l.user_id && options.teamMemberIds!.has(l.user_id))
  }

  const hasMore = rows.length > ACTIVITY_PAGE_SIZE
  return { logs: rows.slice(0, ACTIVITY_PAGE_SIZE), hasMore }
}

export async function logExportAction(format: string, recordCount: number) {
  await supabase.rpc('log_audit', {
    p_acao: 'export_report',
    p_entidade: 'reports',
    p_detalhes: { format, recordCount, exported_at: new Date().toISOString() },
  })
}

export function buildLeadsCsv(rows: LeadReportRow[]): string {
  const limited = rows.slice(0, EXPORT_LIMIT)
  const headers = [
    'nome',
    'telefone',
    'email',
    'classificacao',
    'sentimento',
    'etapa_pipeline',
    'vendedor',
    'equipe',
    'criado_em',
  ]
  const lines = limited.map((r) =>
    [
      r.nome,
      r.telefone,
      r.email ?? '',
      r.classificacao,
      r.sentimento,
      r.etapa_pipeline,
      r.vendedor_nome ?? '',
      r.equipe_nome ?? '',
      r.criado_em,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [headers.join(','), ...lines].join('\n')
}

export function buildActivityCsv(logs: ActivityLogRow[]): string {
  const limited = logs.slice(0, EXPORT_LIMIT)
  const header = 'Data,Evento,Usuário,Descrição,Categoria'
  const rows = limited.map((l) =>
    [
      l.created_at,
      l.event_type,
      `"${(l.profiles?.full_name ?? '').replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      l.log_category,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function buildExcelContent(csv: string): string {
  return '\uFEFF' + csv.replace(/,/g, '\t')
}

export function buildPdfHtml(metrics: ReportMetrics, filters: ReportFilters): string {
  const etapas = metrics.porEtapa.map((e) => `<tr><td>${e.etapa_pipeline}</td><td>${e.total}</td></tr>`).join('')
  const classificacao = metrics.porClassificacao
    .map((c) => `<tr><td>${c.classificacao}</td><td>${c.total}</td></tr>`)
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório CRM</title>
<style>body{font-family:sans-serif;padding:24px;color:#111}h1{color:#0D4F8B}table{border-collapse:collapse;width:100%;margin:16px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#0D4F8B;color:#fff}.kpi{display:inline-block;margin:8px;padding:12px;background:#f3f4f6;border-radius:8px}</style></head>
<body><h1>Relatório de Performance Comercial</h1>
<p>Período: ${filters.inicio || '—'} a ${filters.fim || '—'}</p>
<div class="kpi"><strong>${metrics.totalLeads}</strong><br>Total leads</div>
<div class="kpi"><strong>${metrics.taxaConversao}%</strong><br>Conversão</div>
<div class="kpi"><strong>${metrics.leadsQuentes}</strong><br>Quentes</div>
<div class="kpi"><strong>${metrics.metaAtingida}/${metrics.metaMensal}</strong><br>Meta mensal</div>
<h2>Leads por etapa</h2><table><thead><tr><th>Etapa</th><th>Total</th></tr></thead><tbody>${etapas}</tbody></table>
<h2>Classificação</h2><table><thead><tr><th>Tipo</th><th>Total</th></tr></thead><tbody>${classificacao}</tbody></table>
</body></html>`
}

export function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function scheduleReport(params: {
  email: string
  frequency: 'weekly' | 'monthly'
  filters: ReportFilters
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('report_schedules').insert({
    created_by: user?.id,
    email: params.email,
    frequency: params.frequency,
    report_type: 'performance',
    filters: params.filters,
    active: true,
  })
  if (error) throw error
  await logExportAction('schedule', 0)
}

export async function fetchVendedores() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['operacional', 'gestor'])
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export function entityLink(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  if (entityType === 'leads' || entityType === 'lead') return `/leads/${entityId}`
  return null
}
