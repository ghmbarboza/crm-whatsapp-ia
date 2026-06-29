import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { classificacaoBadgeClass, classificacaoLabel } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'

export function ChatListScreen() {
  const { data: leads, isLoading } = useLeads()

  if (isLoading) return <LoadingSpinner />

  const activeLeads = (leads || []).filter((l) => l.etapa_pipeline !== 'Fechado')

  return (
    <div className="space-y-4">
      {activeLeads.length === 0 ? (
        <EmptyState message="Nenhum lead ativo para atendimento. Comece recebendo leads pelo WhatsApp!" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {activeLeads.map((lead) => (
            <Link key={lead.id} to={`/chat/${lead.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D4F8B] text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{lead.nome}</p>
                    <p className="truncate text-sm text-gray-500">{lead.telefone}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(lead.atualizado_em)}</p>
                  </div>
                  <Badge className={classificacaoBadgeClass(lead.classificacao)}>
                    {classificacaoLabel(lead.classificacao)}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
