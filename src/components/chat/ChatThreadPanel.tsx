import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UseMutationResult } from '@tanstack/react-query'
import {
  ArrowLeft,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Send,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWelcomeTemplate } from '@/services/liveChatService'
import type { Lead, Mensagem } from '@/integrations/supabase/types'
import { sentimentoBadgeClass, sentimentoLabel } from '@/utils/labels'
import { formatChatListTime } from '@/utils/relativeTime'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
        'max-w-[78%] rounded-lg px-3 py-2 text-left shadow-sm transition-all',
        isVendor ? 'ml-auto rounded-tr-none bg-[#d9fdd3]' : 'mr-auto rounded-tl-none bg-white'
      )}
    >
      <p className="whitespace-pre-wrap text-[14.2px] leading-[19px] text-[#111b21]">{msg.conteudo}</p>
      {msg.anexo_url && (
        <a
          href={msg.anexo_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-flex items-center gap-1 text-xs text-[#027eb5] underline"
        >
          <Paperclip className="h-3 w-3" />
          Anexo
        </a>
      )}
      <div className="mt-1 flex items-center justify-end gap-1.5">
        {msg.sentimento && (
          <Badge className={cn('h-4 px-1 text-[9px]', sentimentoBadgeClass(msg.sentimento))}>
            {sentimentoLabel(msg.sentimento)}
          </Badge>
        )}
        <span className="text-[11px] text-[#667781]">{formatChatListTime(msg.timestamp)}</span>
      </div>
    </button>
  )
}

function MessageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="mr-auto h-14 w-2/3 rounded-lg bg-white/80" />
      <div className="ml-auto h-10 w-1/2 rounded-lg bg-[#d9fdd3]/80" />
      <div className="mr-auto h-12 w-3/5 rounded-lg bg-white/80" />
    </div>
  )
}

export interface ChatThreadPanelProps {
  lead: Lead
  messages: Mensagem[]
  isLoading: boolean
  suggestions: string[]
  sendMutation: UseMutationResult<unknown, Error, { conteudo: string; file?: File }, unknown>
  acceptSuggestion: (text: string) => Promise<void>
  bottomRef: React.RefObject<HTMLDivElement>
  connected: boolean
  onReconnect: () => void
  showBackButton?: boolean
  onBack?: () => void
  pendingSuggestion?: string | null
  onSuggestionConsumed?: () => void
}

export function ChatThreadPanel({
  lead,
  messages,
  isLoading,
  suggestions,
  sendMutation,
  acceptSuggestion,
  bottomRef,
  connected,
  onReconnect,
  showBackButton,
  onBack,
  pendingSuggestion,
  onSuggestionConsumed,
}: ChatThreadPanelProps) {
  const [message, setMessage] = useState('')
  const [selectedMsg, setSelectedMsg] = useState<Mensagem | null>(null)
  const [welcomeShown, setWelcomeShown] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)

  const initials = lead.nome
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  useEffect(() => {
    inputRef.current?.focus()
  }, [lead.id])

  useEffect(() => {
    if (!pendingSuggestion) return
    setMessage(pendingSuggestion)
    void acceptSuggestion(pendingSuggestion)
    inputRef.current?.focus()
    onSuggestionConsumed?.()
  }, [pendingSuggestion, acceptSuggestion, onSuggestionConsumed])

  useEffect(() => {
    if (welcomeShown || isLoading || messages.length > 0) return
    fetchWelcomeTemplate().then((text) => {
      if (!welcomeShown && messages.length === 0) {
        toast.info('Sugestão de boas-vindas', { description: text })
        setWelcomeShown(true)
      }
    })
  }, [messages.length, isLoading, welcomeShown])

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
    <section className="flex h-full min-h-0 w-full flex-col bg-[#efeae2]">
      {!connected && (
        <div className="flex shrink-0 items-center justify-between gap-2 bg-[#ea0038] px-4 py-2 text-sm text-white">
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            WhatsApp desconectado
          </span>
          <Button size="sm" variant="secondary" onClick={onReconnect}>
            Reconectar
          </Button>
        </div>
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onBack} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate font-medium text-[#111b21]">{lead.nome}</h1>
            <p className="truncate text-xs text-[#667781]">{lead.telefone}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Opções">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/leads/${lead.id}`}>Ver detalhe do lead</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cdc4\' fill-opacity=\'0.25\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {isLoading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-14 w-14 text-[#cfd4d8]" />
            <p className="max-w-xs text-sm text-[#667781]">
              Envie a primeira mensagem ou use as sugestões da IA na barra lateral.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onClick={() => setSelectedMsg(msg)} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="shrink-0 border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-2 xl:hidden">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#667781]">Sugestões IA</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySuggestion(s)}
                className="shrink-0 rounded-full border border-[#00a884]/30 bg-white px-3 py-1 text-xs text-[#008069]"
              >
                {s.length > 40 ? `${s.slice(0, 40)}…` : s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-2 md:px-4">
        <div className="flex items-end gap-2">
          <label className={cn('shrink-0', !connected && 'pointer-events-none opacity-50')}>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,audio/*"
              onChange={handleFile}
              disabled={sendMutation.isPending || !connected}
            />
            <span className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100">
              <Paperclip className="h-5 w-5 text-[#54656f]" />
            </span>
          </label>
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite uma mensagem"
            rows={1}
            disabled={sendMutation.isPending || !connected}
            className="min-h-[42px] max-h-28 resize-none border-none bg-white text-sm shadow-sm focus-visible:ring-[#00a884]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 bg-[#00a884] hover:bg-[#008069]"
            onClick={() => void handleSend()}
            disabled={!message.trim() || sendMutation.isPending || !connected}
            aria-label="Enviar"
          >
            {sendMutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

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
                  Sentimento IA: {sentimentoLabel(selectedMsg.sentimento)}
                </Badge>
              )}
              <p className="text-xs text-gray-400">{formatChatListTime(selectedMsg.timestamp)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
