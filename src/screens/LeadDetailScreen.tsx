import { Link, useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { useLead } from '@/hooks/useLeads'
import { useChat } from '@/hooks/useChat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { classificacaoBadgeClass, classificacaoLabel, sentimentoLabel } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'

export function LeadDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: lead, isLoading } = useLead(id)
  const { data: mensagens } = useChat(id)

  if (isLoading) return <LoadingSpinner />
  if (!lead) return <EmptyState message="Lead não encontrado" />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lead.nome}</h1>
          <p className="text-sm text-gray-500">{lead.empresa ?? 'Sem empresa'}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge className={classificacaoBadgeClass(lead.classificacao)}>
            {classificacaoLabel(lead.classificacao)}
          </Badge>
          <Badge variant="outline">{lead.etapa_pipeline}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500">Telefone</p>
              <p className="font-medium">{lead.telefone}</p>
            </div>
            {lead.email && (
              <div>
                <p className="text-gray-500">E-mail</p>
                <p className="font-medium">{lead.email}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Origem</p>
              <p className="font-medium">{lead.origem}</p>
            </div>
            <div>
              <p className="text-gray-500">Sentimento</p>
              <p className="font-medium">{sentimentoLabel(lead.sentimento)}</p>
            </div>
            <div>
              <p className="text-gray-500">Última atualização</p>
              <p className="font-medium">{formatDateTime(lead.atualizado_em)}</p>
            </div>
            {lead.anotacoes && (
              <div>
                <p className="text-gray-500">Anotações</p>
                <p className="font-medium">{lead.anotacoes}</p>
              </div>
            )}
            <Button asChild className="w-full">
              <Link to={`/chat/${lead.id}`}>
                <MessageCircle className="h-4 w-4" />
                Abrir Chat
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            {(mensagens || []).length === 0 ? (
              <EmptyState message="Nenhuma mensagem registrada" />
            ) : (
              <ul className="max-h-96 space-y-3 overflow-y-auto">
                {(mensagens || []).map((msg) => (
                  <li
                    key={msg.id}
                    className={`rounded-lg px-4 py-2 text-sm ${
                      msg.tipo === 'recebida' ? 'bg-gray-100' : 'bg-blue-50 ml-8'
                    }`}
                  >
                    <p>{msg.conteudo}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(msg.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
