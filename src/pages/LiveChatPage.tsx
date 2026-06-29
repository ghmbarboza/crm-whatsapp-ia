import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Frown,
  LogOut,
  Meh,
  MessageCircle,
  Paperclip,
  Send,
  Smile,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useLead } from '@/hooks/useLeads'
import { useLiveChat } from '@/hooks/useLiveChat'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import { canAccessChat, fetchWelcomeTemplate } from '@/services/liveChatService'
import type { Mensagem, Sentimento } from '@/integrations/supabase/types'
import {
  classificacaoBadgeClass,
  classificacaoLabel,
  sentimentoBadgeClass,
  sentimentoLabel,
} from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/loading'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SENTIMENT_ICONS: Record<Sentimento, typeof Smile> = {
  positivo: Smile,
  neutro: Meh,
  negativo: Frown,
}

function MessageBubble({
  msg,
  onClick,
}: {
  msg: Mensagem
  onClick: () => void
}) {
  const isVendor = msg.tipo === 'enviada'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'max-w-[85%] rounded-2xl px-4 py-2.5 text-left transition-all duration-200',
        isVendor
          ? 'ml-auto bg-[#0D4F8B] text-white'
          : 'mr-auto border bg-white text-gray-900 shadow-sm'
      )}
    >
      <p className="whitespace-pre-wrap text-sm">{msg.conteudo}</p>
      {msg.anexo_url && (
        <a
          href={msg.anexo_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs underline',
            isVendor ? 'text-blue-100' : 'text-[#0D4F8B]'
          )}
        >
          <Paperclip className="h-3 w-3" />
          Baixar anexo
        </a>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {msg.sentimento && (
          <Badge className={cn('text-[10px]', sentimentoBadgeClass(msg.sentimento))}>
            {sentimentoLabel(msg.sentimento)}
          </Badge>
        )}
        <span className={cn('text-[10px]', isVendor ? 'text-blue-200' : 'text-gray-400')}>
          {formatDateTime(msg.timestamp)}
        </span>
      </div>
    </button>
  )
}

function MessageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="mr-auto h-16 w-2/3 rounded-2xl bg-gray-200" />
      <div className="ml-auto h-12 w-1/2 rounded-2xl bg-gray-300" />
      <div className="mr-auto h-14 w-3/5 rounded-2xl bg-gray-200" />
    </div>
  )
}

export function LiveChatPage() {
  const { leadId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: lead, isLoading: leadLoading } = useLead(leadId)
  const { data: whatsappConfig, refetch: refetchWhatsapp } = useWhatsappStatus()
  const { messages, isLoading: msgLoading, suggestions, sendMutation, acceptSuggestion, bottomRef } =
    useLiveChat(leadId, lead)

  const [message, setMessage] = useState('')
  const [selectedMsg, setSelectedMsg] = useState<Mensagem | null>(null)
  const [welcomeShown, setWelcomeShown] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)

  const connected = whatsappConfig?.status === 'conectado'

  useEffect(() => {
    inputRef.current?.focus()
  }, [leadId])

  useEffect(() => {
    if (welcomeShown || msgLoading || messages.length > 0) return
    fetchWelcomeTemplate().then((text) => {
      if (!welcomeShown && messages.length === 0) {
        toast.info('Sugestão de boas-vindas', { description: text })
        setWelcomeShown(true)
      }
    })
  }, [messages.length, msgLoading, welcomeShown])

  if (leadLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-white">
        <Skeleton className="h-16 rounded-none" />
        <div className="flex-1 p-4">
          <MessageSkeleton />
        </div>
      </div>
    )
  }

  if (!lead || !profile) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <MessageCircle className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">Lead não encontrado</p>
        <Button asChild variant="outline">
          <Link to="/kanban">Voltar ao pipeline</Link>
        </Button>
      </div>
    )
  }

  if (!canAccessChat(lead, profile.id, profile.role)) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-600">Você não tem permissão para acessar este chat.</p>
        <Button asChild><Link to="/kanban">Voltar</Link></Button>
      </div>
    )
  }

  const SentimentIcon = SENTIMENT_ICONS[lead.sentimento]
  const initials = lead.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const handleSend = async () => {
    const text = message.trim()
    if (!text || sendMutation.isPending || sendingRef.current) return
    if (!connected) {
      toast.error('WhatsApp desconectado. Verifique a integração Evolution.')
      return
    }

    sendingRef.current = true
    try {
      await sendMutation.mutateAsync({ conteudo: text })
      setMessage('')
    } finally {
      sendingRef.current = false
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!connected) {
      toast.error('WhatsApp desconectado')
      return
    }
    sendMutation.mutate({ conteudo: `[Anexo: ${file.name}]`, file })
    e.target.value = ''
  }

  const applySuggestion = async (s: string) => {
    setMessage(s)
    await acceptSuggestion(s)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-xl border bg-white shadow-sm md:h-[calc(100vh-8rem)]">
      {/* Offline banner */}
      {!connected && (
        <div className="flex items-center justify-between gap-2 bg-red-600 px-4 py-2 text-sm text-white">
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Integração WhatsApp desconectada
          </span>
          <Button size="sm" variant="secondary" onClick={() => refetchWhatsapp()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-gray-900">{lead.nome}</h1>
              <Badge className={classificacaoBadgeClass(lead.classificacao)}>
                {classificacaoLabel(lead.classificacao)}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <SentimentIcon className="h-4 w-4" aria-label={sentimentoLabel(lead.sentimento)} />
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  connected ? 'text-green-600' : 'text-red-500'
                )}
              >
                <span
                  className={cn('h-2 w-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')}
                  aria-hidden
                />
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-gray-500">{lead.telefone}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/leads/${lead.id}`}>Detalhe</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} aria-label="Sair do chat">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {msgLoading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-14 w-14 text-gray-200" />
            <p className="text-sm text-gray-500">
              Inicie uma conversa para ver o histórico. Use as sugestões da IA abaixo ou envie uma mensagem.
            </p>
            {lead.classificacao === 'quente' && (
              <Badge className="bg-red-500 text-white">Lead quente — priorize o atendimento</Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onClick={() => setSelectedMsg(msg)} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div className="shrink-0 border-t bg-gray-50 px-4 py-2">
          <p className="mb-1.5 text-xs font-medium text-gray-500">Sugestões IA</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySuggestion(s)}
                className="shrink-0 rounded-full border border-[#1565C0]/30 bg-white px-3 py-1.5 text-xs text-[#0D4F8B] transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-[#1565C0]"
                aria-label={`Usar sugestão: ${s}`}
              >
                {s.length > 48 ? `${s.slice(0, 48)}…` : s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 border-t bg-white p-3 md:p-4">
        <div className="flex items-end gap-2">
          <label className="cursor-pointer shrink-0">
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,audio/*"
              onChange={handleFile}
              disabled={sendMutation.isPending || !connected}
            />
            <Button variant="secondary" size="icon" type="button" asChild disabled={!connected}>
              <span><Paperclip className="h-4 w-4" /></span>
            </Button>
          </label>
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={1}
            disabled={sendMutation.isPending || !connected}
            className="min-h-[44px] max-h-32 resize-none"
            aria-label="Campo de mensagem"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 bg-[#0D4F8B] hover:bg-[#1565C0]"
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending || !connected}
            aria-label="Enviar mensagem"
          >
            {sendMutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Message detail modal */}
      <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMsg?.tipo === 'enviada' ? 'Mensagem enviada' : 'Mensagem recebida'}
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-3 text-sm">
              <p>{selectedMsg.conteudo}</p>
              {selectedMsg.sentimento && (
                <Badge className={sentimentoBadgeClass(selectedMsg.sentimento)}>
                  Sentimento: {sentimentoLabel(selectedMsg.sentimento)}
                </Badge>
              )}
              {selectedMsg.anexo_url && (
                <a href={selectedMsg.anexo_url} target="_blank" rel="noopener noreferrer" className="text-[#0D4F8B] underline">
                  Baixar anexo
                </a>
              )}
              <p className="text-xs text-gray-400">{formatDateTime(selectedMsg.timestamp)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
