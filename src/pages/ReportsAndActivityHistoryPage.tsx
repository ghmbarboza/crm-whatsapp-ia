import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  BarChartBig,
  DownloadCloud,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Timer,
  TrendingUp,
  Users,
  Flame,
  Clock,
  Target,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { fetchTeamMemberIdsForGestor } from '@/services/teamManagementService'
import {
  reportsKeys,
  fetchReportMetrics,
  fetchActivityLogsPage,
  fetchVendedores,
  loadPersistedFilters,
  persistFilters,
  validateDateRange,
  logExportAction,
  buildLeadsCsv,
  buildActivityCsv,
  buildExcelContent,
  buildPdfHtml,
  downloadBlob,
  scheduleReport,
  entityLink,
  EXPORT_LIMIT,
  type ReportFilters,
  type ActivityFilters,
  type ActivityLogRow,
} from '@/services/reportsService'
import type { EtapaPipeline } from '@/integrations/supabase/types'
import { formatDateTime } from '@/utils/dates'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['#E53E3E', '#D69E2E', '#A0AEC0']
const FUNNEL_COLORS = ['#2563EB', '#D69E2E', '#22C55E', '#6B7280']

const DEFAULT_REPORT_FILTERS: ReportFilters = {
  inicio: '',
  fim: '',
  vendedorId: 'all',
  etapas: [],
  motivoPerda: '',
}

function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg bg-[#0D4F8B] p-4 text-white shadow-sm transition-transform duration-300 hover:scale-[1.02]">
      <Icon className="mb-2 h-5 w-5 opacity-80" />
      <p className="text-2xl font-bold md:text-3xl">{value}</p>
      <p className="text-sm opacity-90">{label}</p>
      {sub && <p className="mt-1 text-xs opacity-75">{sub}</p>}
    </div>
  )
}

export function ReportsAndActivityHistoryPage() {
  const queryClient = useQueryClient()
  const { profile, checkRole } = useAuth()
  const isAdmin = checkRole(['admin'])
  const exportLock = useRef(false)

  const [reportFilters, setReportFilters] = useState<ReportFilters>(() => ({
    ...DEFAULT_REPORT_FILTERS,
    ...loadPersistedFilters(),
  }))
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>({
    search: '',
    inicio: '',
    fim: '',
    userId: 'all',
    eventType: 'all',
  })
  const debouncedSearch = useDebouncedValue(activityFilters.search)

  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv')
  const [complianceConfirmOpen, setComplianceConfirmOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleEmail, setScheduleEmail] = useState(profile?.email ?? '')
  const [scheduleFreq, setScheduleFreq] = useState<'weekly' | 'monthly'>('weekly')
  const [exporting, setExporting] = useState(false)

  const dateError = validateDateRange(reportFilters.inicio, reportFilters.fim)

  useEffect(() => {
    persistFilters(reportFilters)
  }, [reportFilters])

  const { data: teamMemberIds } = useQuery({
    queryKey: ['gestor-team-ids-reports', profile?.id],
    queryFn: () => fetchTeamMemberIdsForGestor(profile!.id),
    enabled: !!profile && !isAdmin,
  })

  const { data: vendedores } = useQuery({
    queryKey: ['report-vendedores'],
    queryFn: fetchVendedores,
  })

  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: reportsKeys.data(reportFilters),
    queryFn: () => fetchReportMetrics(reportFilters, isAdmin ? null : teamMemberIds),
    enabled: !dateError && (isAdmin || !!teamMemberIds),
  })

  const activityQueryFilters = useMemo(
    () => ({ ...activityFilters, search: debouncedSearch }),
    [activityFilters, debouncedSearch]
  )

  const {
    data: activityPages,
    isLoading: activityLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: reportsKeys.activity(activityQueryFilters, 0),
    queryFn: ({ pageParam = 0 }) =>
      fetchActivityLogsPage(activityQueryFilters, pageParam, {
        isAdmin,
        teamMemberIds: isAdmin ? null : teamMemberIds,
      }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
    initialPageParam: 0,
  })

  const allActivityLogs = useMemo(
    () => activityPages?.pages.flatMap((p) => p.logs) ?? [],
    [activityPages]
  )

  const toggleEtapa = (etapa: EtapaPipeline) => {
    setReportFilters((f) => ({
      ...f,
      etapas: f.etapas.includes(etapa) ? f.etapas.filter((e) => e !== etapa) : [...f.etapas, etapa],
    }))
  }

  const handleExport = useCallback(async () => {
    if (!metrics || exportLock.current) return
    exportLock.current = true
    setExporting(true)
    try {
      const count = Math.min(metrics.rows.length, EXPORT_LIMIT)
      const csv = buildLeadsCsv(metrics.rows)
      const ts = Date.now()

      if (exportFormat === 'csv') {
        downloadBlob(csv, `relatorio_leads_${ts}.csv`, 'text/csv;charset=utf-8')
      } else if (exportFormat === 'excel') {
        downloadBlob(buildExcelContent(csv), `relatorio_leads_${ts}.xls`, 'application/vnd.ms-excel')
      } else {
        const html = buildPdfHtml(metrics, reportFilters)
        downloadBlob(html, `relatorio_leads_${ts}.html`, 'text/html;charset=utf-8')
        toast.info('Abra o arquivo HTML e use Imprimir → Salvar como PDF')
      }

      await logExportAction(exportFormat, count)
      toast.success('Relatório exportado')
      setExportOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na exportação')
    } finally {
      setExporting(false)
      exportLock.current = false
    }
  }, [metrics, exportFormat, reportFilters])

  const exportComplianceLogs = async () => {
    if (exportLock.current) return
    exportLock.current = true
    setExporting(true)
    try {
      const csv = buildActivityCsv(allActivityLogs)
      downloadBlob(csv, `activity_logs_${Date.now()}.csv`, 'text/csv;charset=utf-8')
      await logExportAction('compliance_csv', Math.min(allActivityLogs.length, EXPORT_LIMIT))
      toast.success('Logs exportados')
      setComplianceConfirmOpen(false)
    } catch {
      toast.error('Falha ao exportar logs')
    } finally {
      setExporting(false)
      exportLock.current = false
    }
  }

  const scheduleMutation = useMutation({
    mutationFn: () =>
      scheduleReport({ email: scheduleEmail, frequency: scheduleFreq, filters: reportFilters }),
    onSuccess: () => {
      toast.success('Envio automático agendado')
      setScheduleOpen(false)
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules })
    },
    onError: () => toast.error('Falha ao agendar envio'),
  })

  const visibleSystemLogs = isAdmin
    ? allActivityLogs
    : allActivityLogs.filter((l) => l.log_category !== 'system')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChartBig className="h-7 w-7 text-blue-700" />
            Relatórios e Histórico
          </h2>
          <p className="text-sm text-gray-500">Performance comercial e auditoria completa do sistema</p>
        </div>
        <Button onClick={() => setExportOpen(true)} disabled={!metrics?.rows.length || exporting}>
          <DownloadCloud className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Data início</Label>
            <Input
              type="date"
              max={formatDateInput(new Date())}
              value={reportFilters.inicio}
              onChange={(e) => setReportFilters((f) => ({ ...f, inicio: e.target.value }))}
            />
          </div>
          <div>
            <Label>Data fim</Label>
            <Input
              type="date"
              max={formatDateInput(new Date())}
              value={reportFilters.fim}
              onChange={(e) => setReportFilters((f) => ({ ...f, fim: e.target.value }))}
            />
          </div>
          <div>
            <Label>Vendedor</Label>
            <Select
              value={reportFilters.vendedorId}
              onValueChange={(v) => setReportFilters((f) => ({ ...f, vendedorId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(vendedores ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo de perda (anotações)</Label>
            <Input
              placeholder="Buscar em anotações..."
              value={reportFilters.motivoPerda}
              onChange={(e) => setReportFilters((f) => ({ ...f, motivoPerda: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Label>Etapas do pipeline</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {PIPELINE_STAGES.map((etapa) => (
                <label key={etapa} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={reportFilters.etapas.includes(etapa)}
                    onCheckedChange={() => toggleEtapa(etapa)}
                  />
                  {etapa}
                </label>
              ))}
            </div>
          </div>
          {dateError && <p className="text-sm text-red-600 md:col-span-2 lg:col-span-4">{dateError}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="reports">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="history">Histórico de Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {metricsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Erro ao carregar relatórios.{' '}
              <button type="button" className="underline" onClick={() => refetchMetrics()}>
                Tentar novamente
              </button>
            </div>
          )}

          {metricsLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
              <Skeleton className="col-span-full h-64" />
            </div>
          ) : !metrics?.totalLeads ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-white p-12 text-center">
              <TrendingUp className="h-12 w-12 animate-pulse text-blue-500" />
              <h3 className="text-lg font-semibold">Automatize seus relatórios</h3>
              <p className="max-w-md text-sm text-gray-500">
                Com leads registrados, você verá KPIs, gráficos e exportações customizáveis aqui.
              </p>
              <Button variant="outline" onClick={() => setScheduleOpen(true)}>
                <Timer className="mr-2 h-4 w-4" />
                Agendar envio automático
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
                <KpiCard icon={Users} label="Total de leads" value={metrics.totalLeads} />
                <KpiCard
                  icon={TrendingUp}
                  label="Novos/dia (média)"
                  value={
                    metrics.novosPorDia.length
                      ? Math.round(
                          metrics.novosPorDia.reduce((s, d) => s + d.total, 0) / metrics.novosPorDia.length
                        )
                      : 0
                  }
                />
                <KpiCard icon={BarChartBig} label="Taxa de conversão" value={`${metrics.taxaConversao}%`} />
                <KpiCard icon={Flame} label="Leads quentes" value={metrics.leadsQuentes} />
                <KpiCard
                  icon={Target}
                  label="Meta mensal"
                  value={`${metrics.metaAtingida}/${metrics.metaMensal}`}
                  sub={`${Math.round((metrics.metaAtingida / metrics.metaMensal) * 100)}% atingido`}
                />
                <KpiCard icon={Clock} label="Tempo médio resposta" value={`${metrics.tempoMedioMinutos} min`} />
                <KpiCard
                  icon={Users}
                  label="Top vendedor"
                  value={metrics.topVendedor?.nome ?? '—'}
                  sub={metrics.topVendedor ? `${metrics.topVendedor.total} leads` : undefined}
                />
                <KpiCard
                  icon={Activity}
                  label="NPS médio"
                  value={metrics.npsScore ?? '—'}
                  sub={metrics.npsScore !== null ? 'Últimas pesquisas' : 'Sem dados NPS'}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="transition-opacity duration-300">
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição por classificação</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.porClassificacao}
                          dataKey="total"
                          nameKey="classificacao"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ classificacao, total }) => `${classificacao}: ${total}`}
                        >
                          {metrics.porClassificacao.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="transition-opacity duration-300">
                  <CardHeader>
                    <CardTitle className="text-base">Performance do time</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.porVendedor.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#0D4F8B" name="Leads" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fechados" fill="#22C55E" name="Fechados" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="transition-opacity duration-300 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Leads por dia</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.novosPorDia}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Funil de vendas</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.funil} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="etapa" width={100} />
                        <Tooltip />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                          {metrics.funil.map((_, i) => (
                            <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Busca global</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar atividades..."
                    value={activityFilters.search}
                    onChange={(e) => setActivityFilters((f) => ({ ...f, search: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>De</Label>
                <Input
                  type="date"
                  max={formatDateInput(new Date())}
                  value={activityFilters.inicio}
                  onChange={(e) => setActivityFilters((f) => ({ ...f, inicio: e.target.value }))}
                />
              </div>
              <div>
                <Label>Até</Label>
                <Input
                  type="date"
                  max={formatDateInput(new Date())}
                  value={activityFilters.fim}
                  onChange={(e) => setActivityFilters((f) => ({ ...f, fim: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tipo de ação</Label>
                <Select
                  value={activityFilters.eventType}
                  onValueChange={(v) => setActivityFilters((f) => ({ ...f, eventType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="export_report">Exportação</SelectItem>
                    <SelectItem value="permission_change">Permissão</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="pair_qr">Integração WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setComplianceConfirmOpen(true)} disabled={exporting}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar logs (compliance)
              </Button>
            </div>
          )}

          {activityLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : visibleSystemLogs.length === 0 ? (
            <EmptyState message="Nenhuma atividade encontrada para os filtros selecionados." />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-3">Evento</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Entidade</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSystemLogs.map((log) => (
                    <ActivityRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
              {hasNextPage && (
                <div className="border-t p-4 text-center">
                  <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar relatório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Máximo de {EXPORT_LIMIT.toLocaleString('pt-BR')} registros por exportação.</p>
          <div className="grid gap-2">
            {(
              [
                ['csv', 'CSV', FileText],
                ['excel', 'Excel', FileSpreadsheet],
                ['pdf', 'PDF (HTML para impressão)', FileText],
              ] as const
            ).map(([fmt, label, Icon]) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setExportFormat(fmt)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  exportFormat === fmt ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
                )}
              >
                <Icon className="h-5 w-5 text-blue-700" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
            Confirmar exportação
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={complianceConfirmOpen} onOpenChange={setComplianceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Exportar logs de compliance?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação exporta dados sensíveis de auditoria. Confirme que possui autorização para download
            e armazenamento conforme política LGPD interna.
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={exportComplianceLogs} disabled={exporting}>
              Confirmar exportação
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Agendar envio automático
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail destino</Label>
              <Input
                type="email"
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Frequência</Label>
              <Select value={scheduleFreq} onValueChange={(v) => setScheduleFreq(v as 'weekly' | 'monthly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending || !scheduleEmail}
            >
              Agendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ActivityRow({ log }: { log: ActivityLogRow }) {
  const link = entityLink(log.entity_type, log.entity_id)
  return (
    <tr className="border-b transition-colors hover:bg-gray-50">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{log.event_type}</span>
        </div>
      </td>
      <td className="max-w-xs truncate p-3 text-gray-600" title={log.description}>
        {log.description}
      </td>
      <td className="p-3 whitespace-nowrap text-gray-500">{formatDateTime(log.created_at)}</td>
      <td className="p-3">
        {link ? (
          <Link to={link} className="text-blue-600 hover:underline">
            {log.entity_type}
          </Link>
        ) : (
          log.entity_type
        )}
      </td>
      <td className="p-3">
        {log.status ? (
          <Badge variant="outline">{log.status}</Badge>
        ) : log.log_category === 'system' ? (
          <Badge className="bg-purple-100 text-purple-800">Sistema</Badge>
        ) : (
          <Badge variant="outline">OK</Badge>
        )}
      </td>
    </tr>
  )
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}
