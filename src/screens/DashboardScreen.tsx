import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardKeys, fetchDashboardStats } from '@/services/dashboardService'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/loading'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COLORS = ['#2563EB', '#EF4444', '#FBBF24', '#9CA3AF', '#22C55E']

export function DashboardScreen() {
  const { checkRole, profile } = useAuth()
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const isLimited = !checkRole(['admin', 'gestor'])

  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.stats({ inicio, fim }),
    queryFn: () => fetchDashboardStats({ inicio: inicio || undefined, fim: fim || undefined }),
  })

  const filteredLeads = isLimited
    ? (data?.leads || []).filter((l) => l.responsavel_id === profile?.id)
    : data?.leads || []

  const stats = isLimited
    ? {
        total: filteredLeads.length,
        novos: filteredLeads.filter((l) => l.etapa_pipeline === 'Novo').length,
        quentes: filteredLeads.filter((l) => l.classificacao === 'quente').length,
        emContato: filteredLeads.filter((l) => l.etapa_pipeline === 'Em Contato').length,
        fechados: filteredLeads.filter((l) => l.etapa_pipeline === 'Fechado').length,
        porEtapa: Object.entries(
          filteredLeads.reduce<Record<string, number>>((acc, l) => {
            acc[l.etapa_pipeline] = (acc[l.etapa_pipeline] || 0) + 1
            return acc
          }, {})
        ).map(([etapa_pipeline, total]) => ({ etapa_pipeline, total })),
        porClassificacao: Object.entries(
          filteredLeads.reduce<Record<string, number>>((acc, l) => {
            acc[l.classificacao] = (acc[l.classificacao] || 0) + 1
            return acc
          }, {})
        ).map(([classificacao, total]) => ({ classificacao, total })),
        tempoMedioSegundos: data?.tempoMedioSegundos ?? 0,
      }
    : data

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  const tempoMin = stats?.tempoMedioSegundos
    ? Math.round(stats.tempoMedioSegundos / 60)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {!isLimited && (
          <div className="flex gap-4">
            <div>
              <Label htmlFor="inicio">Início</Label>
              <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fim">Fim</Label>
              <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Leads', value: stats?.total ?? 0 },
          { label: 'Novos', value: stats?.novos ?? 0 },
          { label: 'Quentes', value: stats?.quentes ?? 0 },
          { label: 'Em Contato', value: stats?.emContato ?? 0 },
          { label: 'Fechados', value: stats?.fechados ?? 0 },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{tempoMin} min</p>
          <p className="text-sm text-gray-500">Meta: &lt; 3 min</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.porEtapa || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etapa_pipeline" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classificação</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.porClassificacao || []}
                  dataKey="total"
                  nameKey="classificacao"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {(stats?.porClassificacao || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
