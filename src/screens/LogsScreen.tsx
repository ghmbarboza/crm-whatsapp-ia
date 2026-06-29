import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { formatDateTime } from '@/utils/dates'
import type { AuditLog } from '@/integrations/supabase/types'

export function LogsScreen() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .order('criado_em', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as AuditLog[]
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {(logs || []).length === 0 ? (
            <EmptyState message="Nenhum log registrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left font-semibold">Data/Hora</th>
                    <th className="p-3 text-left font-semibold">Usuário</th>
                    <th className="p-3 text-left font-semibold">Ação</th>
                    <th className="p-3 text-left font-semibold">Entidade</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs || []).map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="p-3">{formatDateTime(log.criado_em)}</td>
                      <td className="p-3">{log.profiles?.full_name ?? '—'}</td>
                      <td className="p-3">{log.acao}</td>
                      <td className="p-3">{log.entidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
