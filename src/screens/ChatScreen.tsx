import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Send, Paperclip, Wifi, WifiOff, Sparkles } from 'lucide-react'
import { useLead } from '@/hooks/useLeads'
import { useChat } from '@/hooks/useChat'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { classificacaoBadgeClass, sentimentoLabel } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { Card, CardContent } from '@/components/ui/card'
import { submitAiFeedback } from '@/services/templatesService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ChatScreen() {
  const { leadId = '' } = useParams()
  const navigate = useNavigate()
  const { data: lead, isLoading: leadLoading } = useLead(leadId)
  const { data: mensagens, isLoading: msgLoading, sendMutation } = useChat(leadId)
  const { data: whatsappConfig } = useWhatsappStatus()
  const [message, setMessage] = useState('')
  const [suggestion, setSuggestion] = useState('Olá! Como posso ajudá-lo hoje?')

  const connected = whatsappConfig?.status === 'conectado'

  const handleSend = async () => {
    if (!message.trim()) return
    await sendMutation.mutateAsync({ conteudo: message })
    setMessage('')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo excede o limite de 5MB')
      return
    }
    sendMutation.mutate({ conteudo: `[Anexo: ${file.name}]`, file })
  }

  const handleOverride = async (newClass: 'quente' | 'morno' | 'frio') => {
    if (!lead) return
    await submitAiFeedback({
      lead_id: lead.id,
      classificacao_ia: lead.classificacao,
      classificacao_manual: newClass,
      sentimento_ia: lead.sentimento,
    })
    toast.success('Feedback registrado para melhoria da IA')
  }

  if (leadLoading || msgLoading) return <LoadingSpinner />

  if (!lead) {
    return <EmptyState message="Lead não encontrado" />
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col rounded-md border bg-white shadow-md">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{lead.nome}</h1>
              <p className="text-sm text-gray-500">{lead.telefone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={classificacaoBadgeClass(lead.classificacao)}>{lead.classificacao}</Badge>
            <Badge variant="outline">{sentimentoLabel(lead.sentimento)}</Badge>
            <span className="flex items-center gap-1 text-sm">
              {connected ? (
                <><Wifi className="h-4 w-4 text-green-500" /> Conectado</>
              ) : (
                <><WifiOff className="h-4 w-4 text-red-500" /> Desconectado</>
              )}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(mensagens || []).length === 0 ? (
            <EmptyState message="Nenhuma mensagem ainda" />
          ) : (
            (mensagens || []).map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[80%] rounded-md p-3',
                  msg.tipo === 'enviada' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100'
                )}
              >
                <p className="text-sm">{msg.conteudo}</p>
                {msg.anexo_url && (
                  <Link to={msg.anexo_url} target="_blank" className="text-xs underline">
                    Ver anexo
                  </Link>
                )}
                <p className={cn('mt-1 text-xs', msg.tipo === 'enviada' ? 'text-blue-100' : 'text-gray-400')}>
                  {formatDateTime(msg.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFile} accept="image/*,.pdf,.doc,.docx" />
              <Button variant="secondary" size="icon" type="button" asChild>
                <span><Paperclip className="h-4 w-4" /></span>
              </Button>
            </label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              aria-label="Mensagem"
            />
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="w-full lg:w-80">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Sugestão IA</h2>
          </div>
          <Textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} rows={4} />
          <Button variant="secondary" className="w-full" onClick={() => setMessage(suggestion)}>
            Usar sugestão
          </Button>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Corrigir classificação</p>
            <div className="flex gap-2">
              {(['quente', 'morno', 'frio'] as const).map((c) => (
                <Button key={c} variant="outline" size="sm" onClick={() => handleOverride(c)}>
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
