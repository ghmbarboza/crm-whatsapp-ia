import {
  ArrowRightLeft,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  StickyNote,
  UserCircle,
} from 'lucide-react'
import type { TimelineItem } from '@/hooks/useLeadDetail'
import type { TimelineEventType } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/loading'
import { sentimentoBadgeClass, sentimentoLabel } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { cn } from '@/lib/utils'

const EVENT_ICONS: Record<TimelineEventType, typeof MessageSquare> = {
  mudanca_etapa: ArrowRightLeft,
  registro_resultado: CheckCircle2,
  anotacao: StickyNote,
  conversao: CheckCircle2,
  atribuicao: UserCircle,
  mensagem_recebida: MessageSquare,
  mensagem_enviada: UserCircle,
  sugestao_ia_aceita: StickyNote,
  anexo_enviado: Paperclip,
}

const EVENT_LABELS: Record<TimelineEventType, string> = {
  mudanca_etapa: 'Mudança de etapa',
  registro_resultado: 'Registro de resultado',
  anotacao: 'Anotação interna',
  conversao: 'Lead convertido',
  atribuicao: 'Atribuição de responsável',
  mensagem_recebida: 'Mensagem recebida',
  mensagem_enviada: 'Mensagem enviada',
  sugestao_ia_aceita: 'Sugestão IA aceita',
  anexo_enviado: 'Anexo enviado',
}

function EventContent({ item, isLatest }: { item: Extract<TimelineItem, { kind: 'event' }>; isLatest: boolean }) {
  const Icon = EVENT_ICONS[item.data.tipo]
  const dados = item.data.dados

  let description = EVENT_LABELS[item.data.tipo]
  if (item.data.tipo === 'mudanca_etapa' || item.data.tipo === 'conversao') {
    description = `${String(dados.de)} → ${String(dados.para)}`
  } else if (item.data.tipo === 'registro_resultado') {
    description = String(dados.resultado)
  } else if (item.data.tipo === 'atribuicao') {
    description = `Responsável: ${String(dados.responsavel_nome ?? '—')}`
  } else if (item.data.tipo === 'anotacao') {
    description = String(dados.texto ?? 'Anotação atualizada')
  }

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border bg-white p-3 transition-all duration-300',
        isLatest && 'border-[#1565C0] bg-blue-50/50 shadow-sm ring-1 ring-[#63B3ED]/40'
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D4F8B]/10">
        <Icon className="h-4 w-4 text-[#0D4F8B]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {EVENT_LABELS[item.data.tipo]}
        </p>
        <p className="mt-0.5 text-sm text-gray-800">{description}</p>
        <p className="mt-1 text-xs text-gray-400">
          {formatDateTime(item.date)}
          {item.data.profiles?.full_name && ` · ${item.data.profiles.full_name}`}
        </p>
      </div>
    </div>
  )
}

function MessageContent({
  item,
  isLatest,
  onSelect,
}: {
  item: Extract<TimelineItem, { kind: 'message' }>
  isLatest: boolean
  onSelect: () => void
}) {
  const isVendor = item.data.tipo === 'enviada'
  const Icon = isVendor ? UserCircle : MessageSquare

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md',
        isVendor ? 'ml-4 border-blue-100 bg-blue-50' : 'mr-4 border-gray-200 bg-gray-50',
        isLatest && 'ring-1 ring-[#63B3ED]/40'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isVendor ? 'bg-blue-100' : 'bg-gray-200'
        )}
      >
        <Icon className="h-4 w-4 text-gray-700" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-600">
            {isVendor ? 'Vendedor' : 'Lead'}
          </span>
          {item.data.sentimento && (
            <Badge className={sentimentoBadgeClass(item.data.sentimento)}>
              {sentimentoLabel(item.data.sentimento)}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-800">{item.data.conteudo}</p>
        {item.data.anexo_url && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-[#0D4F8B]">
            <Paperclip className="h-3 w-3" />
            Anexo
          </span>
        )}
        <p className="mt-1 text-xs text-gray-400">{formatDateTime(item.date)}</p>
      </div>
    </button>
  )
}

interface LeadTimelineProps {
  items: TimelineItem[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onSelectMessage: (item: Extract<TimelineItem, { kind: 'message' }>) => void
}

export function LeadTimeline({ items, loading, hasMore, onLoadMore, onSelectMessage }: LeadTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <MessageSquare className="h-10 w-10 text-gray-300" aria-hidden />
        <p className="text-sm text-gray-500">
          Nenhum evento na timeline ainda. Inicie uma conversa pelo WhatsApp ou registre um resultado.
        </p>
        <Button variant="ghost" size="sm">
          Iniciar registro
        </Button>
      </div>
    )
  }

  const latestId = items[items.length - 1]?.id

  return (
    <div className="space-y-3">
      {hasMore && onLoadMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Carregar eventos anteriores
          </Button>
        </div>
      )}
      {items.map((item) =>
        item.kind === 'message' ? (
          <MessageContent
            key={item.id}
            item={item}
            isLatest={item.id === latestId}
            onSelect={() => onSelectMessage(item)}
          />
        ) : (
          <EventContent key={item.id} item={item} isLatest={item.id === latestId} />
        )
      )}
    </div>
  )
}