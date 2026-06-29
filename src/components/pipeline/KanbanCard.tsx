import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate, useParams } from 'react-router-dom'
import { Thermometer, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { Lead } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  classificacaoBadgeClass,
  classificacaoLabel,
  sentimentoBadgeClass,
  sentimentoLabel,
} from '@/utils/labels'
import { formatRelativeContact } from '@/utils/relativeTime'
import { cn } from '@/lib/utils'

interface KanbanCardProps {
  lead: Lead
  responsavelName?: string
  canDrag: boolean
  onKeyboardMove: (leadId: string, direction: 'next' | 'prev') => void
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function KanbanCard({ lead, responsavelName, canDrag, onKeyboardMove }: KanbanCardProps) {
  const navigate = useNavigate()
  const { id: activeLeadId } = useParams()
  const isActive = activeLeadId === lead.id

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canDrag,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const contactTime = formatRelativeContact(lead.atualizado_em)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all duration-200',
        'hover:border-[#1565C0] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565C0]',
        isDragging && 'scale-[1.02] opacity-60 ring-2 ring-[#63B3ED]',
        isActive && 'border-[#1565C0] ring-2 ring-[#63B3ED]/50'
      )}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      tabIndex={0}
      role="button"
      aria-label={`Lead ${lead.nome}, etapa ${lead.etapa_pipeline}, classificação ${lead.classificacao}`}
      onClick={() => navigate(`/leads/${lead.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          onKeyboardMove(lead.id, 'next')
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onKeyboardMove(lead.id, 'prev')
        }
        if (e.key === 'Enter') navigate(`/leads/${lead.id}`)
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{lead.nome}</p>
        <Badge className={cn('shrink-0 gap-1', classificacaoBadgeClass(lead.classificacao))}>
          <Thermometer className="h-3 w-3" aria-hidden />
          {classificacaoLabel(lead.classificacao)}
        </Badge>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <Badge className={sentimentoBadgeClass(lead.sentimento)} variant="outline">
          {sentimentoLabel(lead.sentimento)}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[10px]">{getInitials(responsavelName)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-gray-500">{responsavelName ?? 'Sem responsável'}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400" title={contactTime}>
          {contactTime}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/chat/${lead.id}`} aria-label={`Chat com ${lead.nome}`}>
            <MessageCircle className="h-4 w-4 text-[#0D4F8B]" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function KanbanCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-2 h-5 w-16 rounded-full bg-gray-200" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gray-200" />
        <div className="h-3 w-20 rounded bg-gray-200" />
      </div>
      <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
    </div>
  )
}
