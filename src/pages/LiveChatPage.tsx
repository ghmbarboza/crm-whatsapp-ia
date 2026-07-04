import { useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLead } from '@/hooks/useLeads'
import { useChatInbox } from '@/hooks/useChatInbox'
import { useLiveChat } from '@/hooks/useLiveChat'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import { canAccessChat } from '@/services/liveChatService'
import type { Classificacao } from '@/integrations/supabase/types'
import { ChatInboxPanel } from '@/components/chat/ChatInboxPanel'
import { ChatThreadPanel } from '@/components/chat/ChatThreadPanel'
import { ChatAiSidebar } from '@/components/chat/ChatAiSidebar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

export function LiveChatPage() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Classificacao>('all')
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null)

  const { conversations, isLoading: inboxLoading } = useChatInbox(search)
  const { data: lead, isLoading: leadLoading, isError: leadError } = useLead(leadId ?? '')
  const { data: whatsappConfig, refetch: refetchWhatsapp } = useWhatsappStatus()
  const chat = useLiveChat(leadId ?? '', lead)

  const connected = whatsappConfig?.status === 'conectado'
  const handleSuggestionConsumed = useCallback(() => setPendingSuggestion(null), [])

  if (leadId && leadLoading) {
    return (
      <div className="-m-4 flex h-[calc(100dvh-4rem)] overflow-hidden md:-m-6 md:h-[calc(100dvh-5rem)]">
        <Skeleton className="hidden h-full w-[360px] md:block" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="hidden h-full w-[320px] xl:block" />
      </div>
    )
  }

  if (leadId && leadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-600">Erro ao carregar a conversa.</p>
        <Button asChild variant="outline">
          <Link to="/chat">Voltar à caixa de entrada</Link>
        </Button>
      </div>
    )
  }

  if (leadId && lead && profile && !canAccessChat(lead, profile.id, profile.role)) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-600">Você não tem permissão para acessar este chat.</p>
        <Button asChild>
          <Link to="/chat">Voltar às conversas</Link>
        </Button>
      </div>
    )
  }

  if (leadId && !leadLoading && !lead) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <MessageCircle className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">Conversa não encontrada</p>
        <Button asChild variant="outline">
          <Link to="/chat">Voltar à caixa de entrada</Link>
        </Button>
      </div>
    )
  }

  const showInbox = !leadId
  const showThread = Boolean(leadId && lead)

  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] overflow-hidden rounded-lg border border-[#d1d7db] bg-white shadow-sm md:-m-6 md:h-[calc(100dvh-5rem)]">
      {/* Inbox */}
      <div
        className={cn(
          'h-full shrink-0',
          showInbox ? 'flex w-full md:w-[360px]' : 'hidden md:flex md:w-[360px]'
        )}
      >
        <ChatInboxPanel
          conversations={conversations}
          isLoading={inboxLoading}
          selectedLeadId={leadId}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Thread */}
      <div
        className={cn(
          'h-full min-w-0 flex-1',
          showThread ? 'flex' : 'hidden md:flex'
        )}
      >
        {lead ? (
          <ChatThreadPanel
            lead={lead}
            messages={chat.messages}
            isLoading={chat.isLoading}
            suggestions={chat.suggestions}
            sendMutation={chat.sendMutation}
            acceptSuggestion={chat.acceptSuggestion}
            bottomRef={chat.bottomRef}
            connected={connected}
            onReconnect={() => refetchWhatsapp()}
            showBackButton
            onBack={() => navigate('/chat')}
            pendingSuggestion={pendingSuggestion}
            onSuggestionConsumed={handleSuggestionConsumed}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#f0f2f5] text-center">
            <div className="max-w-sm rounded-2xl border border-[#e9edef] bg-white p-8 shadow-sm">
              <MessageCircle className="mx-auto h-16 w-16 text-[#00a884]/40" />
              <h2 className="mt-4 text-xl font-medium text-[#111b21]">Chat ao vivo</h2>
              <p className="mt-2 text-sm text-[#667781]">
                Selecione uma conversa na caixa de entrada para visualizar mensagens e a qualificação
                pela IA em tempo real.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI sidebar */}
      {lead && (
        <div className="hidden h-full shrink-0 xl:flex">
          <ChatAiSidebar
            lead={lead}
            messages={chat.messages}
            suggestions={chat.suggestions}
            onApplySuggestion={setPendingSuggestion}
          />
        </div>
      )}
    </div>
  )
}
