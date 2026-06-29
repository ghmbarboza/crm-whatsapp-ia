import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bell,
  FileText,
  Flame,
  Kanban,
  MessageSquare,
  MessageSquareText,
  PlusCircle,
  QrCode,
  Settings,
  Target,
  Timer,
  TrendingUp,
  Users,
  UsersRound,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { subHours, parseISO, isAfter, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  dashboardKeys,
  fetchDashboardStats,
  heatLevelLabel,
  computeMediaCalor,
} from '@/services/dashboardService'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { classificacaoBadgeClass, classificacaoLabel } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { PIPELINE_STAGES, STAGE_COLORS } from '@/utils/pipelineRules'
import { LeadFormDialog } from '@/components/leads/LeadFormDialog'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['#E53E3E', '#D69E2E', '#A0AEC0']
const SENTIMENT_COLORS = ['#22C55E', '#A0AEC0', '#EF4444']

const quickLinks = [
  { to: '/kanban', label: 'Pipeline', description: 'Funil visual', icon: Kanban, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/leads', label: 'Leads', description: 'Lista completa', icon: FileText, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/chat', label: 'Chat ao vivo', description: 'Atendimentos', icon: MessageSquare, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/admin/integration-whatsapp', label: 'WhatsApp', description: 'Conexão e QR', icon: QrCode, roles: ['admin', 'gestor'] as const },
  { to: '/admin/team', label: 'Equipe', description: 'Usuários', icon: UsersRound, roles: ['admin', 'gestor'] as const },
  { to: '/admin/reports', label: 'Relatórios', description: 'Métricas', icon: BarChart2, roles: ['admin', 'gestor'] as const },
  { to: '/admin/settings', label: 'Configurações', description: 'Templates', icon: Settings, roles: ['admin', 'gestor'] as const },
]

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'primary',
}: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
  accent?: 'primary' | 'heat' | 'success' | 'warning' | 'neutral'
}) {
  const accents = {
    primary: 'from-[#0D4F8B] to-[#1565C0]',
    heat: 'from-red-600 to-orange-500',
    success: 'from-emerald-600 to-green-500',
    warning: 'from-amber-500 to-yellow-400',
    neutral: 'from-slate-600 to-slate-500',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-md transition-transform hover:scale-[1.01]',
        accents[accent]
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <Icon className="relative mb-3 h-5 w-5 opacity-90" />
      <p className="relative text-3xl font-bold tracking-tight">{value}</p>
      <p className="relative text-sm font-medium opacity-95">{label}</p>
      {sub && <p className="relative mt-1 text-xs opacity-75">{sub}</p>}
    </div>
  )
}

function HeatGauge({ score }: { score: number }) {
  const level = heatLevelLabel(score)
  const barColor =
    score >= 70 ? 'bg-gradient-to-r from-red-500 to-orange-400' : score >= 40 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-slate-400 to-slate-300'

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-gray-900">{score}</p>
          <p className="text-sm text-gray-500">índice de 0 a 100</p>
        </div>
        <Badge
          className={cn(
            'text-sm',
            score >= 70 ? 'bg-red-100 text-red-700' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
          )}
        >
          <Flame className="mr-1 h-3.5 w-3.5" />
          {level}
        </Badge>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Frio</span>
        <span>Morno</span>
        <span>Quente</span>
      </div>
    </div>
  )
}

function StatusPill({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: typeof Wifi
  label: string
  value: string
  status: 'ok' | 'warn' | 'off'
}) {
  const dotClass = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    off: 'bg-red-500',
  }[status]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
      <div className={cn('h-2 w-2 shrink-0 rounded-full', dotClass, status === 'ok' && 'animate-pulse')} />
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="text-xs opacity-75">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

function PipelineFunnel({ porEtapa }: { porEtapa: { etapa_pipeline: string; total: number }[] }) {
  const funnelData = PIPELINE_STAGES.map((stage) => ({
    etapa: stage,
    total: porEtapa.find((e) => e.etapa_pipeline === stage)?.total ?? 0,
    fill: STAGE_COLORS[stage],
  }))
  const max = Math.max(...funnelData.map((d) => d.total), 1)

  return (
    <div className="space-y-3">
      {funnelData.map((item) => (
        <div key={item.etapa} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{item.etapa}</span>
            <span className="font-bold text-gray-900">{item.total}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.total / max) * 100}%`, backgroundColor: item.fill }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickNavCards() {
  const { checkRole } = useAuth()
  const items = quickLinks.filter((item) => checkRole([...item.roles]))

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(({ to, label, description, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-3 rounded-lg border bg-white p-3 transition-all hover:border-[var(--brand-accent,#1565C0)] hover:shadow-sm"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: 'var(--brand-accent, #1565C0)' }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[var(--brand-accent,#1565C0)]" />
        </Link>
      ))}
    </div>
  )
}

export function DashboardScreen() {
  const { checkRole, profile } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const isLimited = !checkRole(['admin', 'gestor'])
  const isManager = checkRole(['admin', 'gestor'])

  const { data: whatsappConfig } = useWhatsappStatus()
  const whatsappConnected = whatsappConfig?.status === 'conectado'

  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.stats({}),
    queryFn: () => fetchDashboardStats({}),
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles-map'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name')
      return Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]))
    },
    enabled: !isLoading,
  })

  const filteredLeads = isLimited
    ? (data?.leads || []).filter((l) => l.responsavel_id === profile?.id)
    : data?.leads || []

  const now = new Date()
  const last24h = subHours(now, 24)
  const novos24h = filteredLeads.filter((l) => isAfter(parseISO(l.criado_em), last24h)).length
  const quentes = filteredLeads.filter((l) => l.classificacao === 'quente').length
  const fechados = filteredLeads.filter((l) => l.etapa_pipeline === 'Fechado').length
  const emAtendimento = filteredLeads.filter((l) => l.etapa_pipeline === 'Em Contato').length
  const taxaConversao = filteredLeads.length > 0 ? Math.round((fechados / filteredLeads.length) * 100) : 0
  const tempoMin = data?.tempoMedioSegundos ? Math.round(data.tempoMedioSegundos / 60) : 0

  const mediaCalor = computeMediaCalor(filteredLeads)

  const porClassificacao = Object.entries(
    filteredLeads.reduce<Record<string, number>>((acc, l) => {
      acc[l.classificacao] = (acc[l.classificacao] || 0) + 1
      return acc
    }, {})
  ).map(([classificacao, total]) => ({ classificacao, total }))

  const porSentimento = (data?.porSentimento || []).map((s) => ({
    sentimento: s.sentimento,
    total: s.total,
  }))

  const porEtapaFiltered = PIPELINE_STAGES.map((stage) => ({
    etapa_pipeline: stage,
    total: filteredLeads.filter((l) => l.etapa_pipeline === stage).length,
  }))

  const recentLeads = [...filteredLeads]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 6)

  const atendimentosAtivos = [...filteredLeads]
    .filter((l) => l.etapa_pipeline !== 'Fechado')
    .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-gradient-to-br from-[#0D4F8B] to-[#1565C0] p-6 text-white shadow-lg md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider opacity-80">Central de Controle</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                Olá{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
              </h1>
              <p className="mt-2 max-w-lg text-sm opacity-90">
                Bem-vindo ao CRM. Conecte o WhatsApp ou cadastre seu primeiro lead para ativar os indicadores.
              </p>
            </div>
            <Activity className="hidden h-10 w-10 opacity-30 md:block" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Primeiros passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmptyState message="Nenhum lead registrado ainda. Conecte o WhatsApp ou cadastre um lead manualmente." />
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setFormOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Novo Lead
                </Button>
                {isManager && (
                  <Button variant="secondary" asChild>
                    <Link to="/admin/integration-whatsapp">
                      <QrCode className="h-4 w-4" />
                      Conectar WhatsApp
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acesso rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickNavCards />
            </CardContent>
          </Card>
        </div>

        <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Command center header */}
      <div className="rounded-xl bg-gradient-to-br from-[#0D4F8B] via-[#0F5A9A] to-[#1565C0] p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Central de Controle</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {isLimited ? 'Minha operação' : 'Visão da plataforma'}
            </h1>
            <p className="mt-2 text-sm opacity-85">
              {format(now, "EEEE, d 'de' MMMM · HH:mm", { locale: ptBR })}
              {profile?.full_name && ` · ${profile.full_name.split(' ')[0]}`}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <StatusPill
              icon={whatsappConnected ? Wifi : WifiOff}
              label="WhatsApp"
              value={whatsappConnected ? 'Conectado' : 'Desconectado'}
              status={whatsappConnected ? 'ok' : 'off'}
            />
            <StatusPill
              icon={MessageSquareText}
              label="Atendimentos ativos"
              value={`${emAtendimento} em andamento`}
              status={emAtendimento > 0 ? 'ok' : 'warn'}
            />
            {isManager && (
              <StatusPill
                icon={Bell}
                label="Alertas"
                value={`${data?.alertasNaoLidos ?? 0} não lidos`}
                status={(data?.alertasNaoLidos ?? 0) > 0 ? 'warn' : 'ok'}
              />
            )}
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Leads no pipeline" value={filteredLeads.length} sub={`${novos24h} novos nas últimas 24h`} />
        <MetricCard icon={MessageSquare} label="Atendimentos" value={data?.mensagensTotal ?? 0} sub={`${data?.mensagens24h ?? 0} mensagens hoje`} accent="success" />
        <MetricCard icon={Flame} label="Média de calor" value={mediaCalor} sub={heatLevelLabel(mediaCalor)} accent="heat" />
        <MetricCard icon={Target} label="Taxa de conversão" value={`${taxaConversao}%`} sub={`${fechados} fechados`} accent="warning" />
      </div>

      {/* Secondary metrics row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quentes}</p>
              <p className="text-xs text-gray-500">Leads quentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{emAtendimento}</p>
              <p className="text-xs text-gray-500">Em contato agora</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tempoMin} min</p>
              <p className="text-xs text-gray-500">Tempo médio resposta</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.mensagensEnviadas ?? 0}</p>
              <p className="text-xs text-gray-500">Mensagens enviadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main panels */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pipeline + charts */}
        <div className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Funil de vendas</CardTitle>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/kanban">
                  <Kanban className="h-3.5 w-3.5" />
                  Abrir
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <PipelineFunnel porEtapa={porEtapaFiltered} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Classificação</CardTitle>
              </CardHeader>
              <CardContent className="h-52">
                {porClassificacao.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={porClassificacao}
                        dataKey="total"
                        nameKey="classificacao"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        label={({ classificacao, percent }) =>
                          `${classificacaoLabel(classificacao as 'quente' | 'morno' | 'frio')} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {porClassificacao.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Sem dados de classificação" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sentimento</CardTitle>
              </CardHeader>
              <CardContent className="h-52">
                {porSentimento.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porSentimento} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="sentimento" width={70} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {porSentimento.map((_, i) => (
                          <Cell key={i} fill={SENTIMENT_COLORS[i % SENTIMENT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Sem dados de sentimento" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume por etapa</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={porEtapaFiltered}>
                  <defs>
                    <linearGradient id="etapaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa_pipeline" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#1565C0" fill="url(#etapaGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right column: heat + atendimentos + platform */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-orange-500" />
                Índice de calor da base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HeatGauge score={mediaCalor} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {(['quente', 'morno', 'frio'] as const).map((c) => {
                  const count = filteredLeads.filter((l) => l.classificacao === c).length
                  return (
                    <div key={c} className="rounded-lg bg-gray-50 p-2">
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500">{classificacaoLabel(c)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-[#1565C0]" />
                Atendimentos
              </CardTitle>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/chat">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{data?.mensagensRecebidas ?? 0}</p>
                  <p className="text-xs text-gray-500">Recebidas</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{data?.mensagensEnviadas ?? 0}</p>
                  <p className="text-xs text-gray-500">Enviadas</p>
                </div>
              </div>

              {atendimentosAtivos.length > 0 ? (
                <ul className="divide-y">
                  {atendimentosAtivos.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        to={`/chat/${lead.id}`}
                        className="flex items-center gap-3 py-2.5 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D4F8B] text-xs font-medium text-white">
                          {lead.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lead.nome}</p>
                          <p className="text-xs text-gray-500">{lead.etapa_pipeline}</p>
                        </div>
                        <Badge className={cn('shrink-0 text-xs', classificacaoBadgeClass(lead.classificacao))}>
                          {classificacaoLabel(lead.classificacao)}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Nenhum atendimento ativo no momento.</p>
              )}
            </CardContent>
          </Card>

          {isManager && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Saúde da plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    {whatsappConnected ? (
                      <Wifi className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Integração WhatsApp</span>
                  </div>
                  <Badge className={whatsappConnected ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}>
                    {whatsappConnected ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Usuários ativos</span>
                  </div>
                  <span className="font-semibold">{data?.usuariosAtivos ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Alertas pendentes</span>
                  </div>
                  <span className="font-semibold">{data?.alertasNaoLidos ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Acesso rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickNavCards />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent leads table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Leads recentes</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setFormOpen(true)} size="sm">
              <PlusCircle className="h-3.5 w-3.5" />
              Novo Lead
            </Button>
            {isManager && (
              <Button variant="secondary" size="sm" asChild>
                <Link to="/admin/reports">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Relatórios
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {recentLeads.map((lead) => {
              const responsavel = lead.responsavel_id ? profilesData?.[lead.responsavel_id] : null
              const initials = responsavel
                ?.split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
              return (
                <li key={lead.id}>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{lead.nome}</p>
                      <p className="text-sm text-gray-500">
                        {lead.etapa_pipeline}
                        {responsavel && ` · ${responsavel}`}
                      </p>
                    </div>
                    <Badge className={classificacaoBadgeClass(lead.classificacao)}>
                      {classificacaoLabel(lead.classificacao)}
                    </Badge>
                    <span className="hidden text-sm text-gray-400 md:inline">
                      {formatDateTime(lead.criado_em)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
