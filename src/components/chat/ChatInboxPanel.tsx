import { Link } from 'react-router-dom'
import { MessageCircle, Search } from 'lucide-react'
import type { Classificacao } from '@/integrations/supabase/types'
import type { InboxConversation } from '@/services/liveChatService'
import { formatChatListTime } from '@/utils/relativeTime'
import { classificacaoLabel } from '@/utils/labels'
import { formatPhone } from '@/utils/formatPhone'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

const CLASSIFICATION_DOT: Record<Classificacao, string> = {
  quente: 'bg-red-500',
  morno: 'bg-amber-400',
  frio: 'bg-gray-400',
}

function leadInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function previewText(conversation: InboxConversation) {
  const { lastMessage } = conversation
  if (!lastMessage) return 'Nenhuma mensagem ainda'
  const prefix = lastMessage.tipo === 'enviada' ? 'Você: ' : ''
  const text = lastMessage.conteudo.replace(/\n/g, ' ')
  return `${prefix}${text.length > 56 ? `${text.slice(0, 56)}…` : text}`
}

interface ChatInboxPanelProps {
  conversations: InboxConversation[]
  isLoading: boolean
  selectedLeadId?: string
  search: string
  onSearchChange: (value: string) => void
  filter: 'all' | Classificacao
  onFilterChange: (value: 'all' | Classificacao) => void
}

export function ChatInboxPanel({
  conversations,
  isLoading,
  selectedLeadId,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: ChatInboxPanelProps) {
  const filtered =
    filter === 'all'
      ? conversations
      : conversations.filter((c) => c.lead.classificacao === filter)

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#d1d7db] bg-white md:w-[360px] md:shrink-0">
      <header className="shrink-0 bg-[#f0f2f5] px-4 py-3">
        <h2 className="text-lg font-semibold text-[#111b21]">Conversas</h2>
        <p className="text-xs text-[#667781]">Caixa de entrada WhatsApp</p>
      </header>

      <div className="shrink-0 border-b border-[#e9edef] px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar contato ou número"
            className="h-9 border-none bg-[#f0f2f5] pl-9 text-sm focus-visible:ring-[#00a884]"
          />
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {(['all', 'quente', 'morno', 'frio'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
              )}
            >
              {key === 'all' ? 'Todas' : classificacaoLabel(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-[#e9edef]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageCircle className="h-12 w-12 text-[#cfd4d8]" />
            <p className="text-sm text-[#667781]">
              {search || filter !== 'all'
                ? 'Nenhuma conversa encontrada com esse filtro.'
                : 'Nenhuma conversa ativa. Leads aparecerão aqui ao receber mensagens.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#e9edef]">
            {filtered.map(({ lead, lastMessage }) => {
              const active = lead.id === selectedLeadId
              const time = formatChatListTime(lastMessage?.timestamp ?? lead.atualizado_em)

              return (
                <li key={lead.id}>
                  <Link
                    to={`/chat/${lead.id}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f5f6f6]',
                      active && 'bg-[#f0f2f5]'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#dfe5e7] text-sm font-medium text-[#54656f]">
                          {leadInitials(lead.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
                          CLASSIFICATION_DOT[lead.classificacao]
                        )}
                        title={classificacaoLabel(lead.classificacao)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium text-[#111b21]">{lead.nome}</p>
                        <span className="shrink-0 text-[11px] text-[#667781]">{time}</span>
                      </div>
                      <p className="truncate text-sm text-[#667781]">{previewText({ lead, lastMessage, unreadCount: 0 })}</p>
                      <p className="truncate text-[11px] text-[#8696a0]">{formatPhone(lead.telefone)}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
