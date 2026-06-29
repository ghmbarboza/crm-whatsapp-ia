import { useDroppable } from '@dnd-kit/core'
import { ArrowLeft, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Lead, EtapaPipeline } from '@/integrations/supabase/types'
import { STAGE_COLORS } from '@/utils/pipelineRules'
import { KanbanCard, KanbanCardSkeleton } from '@/components/pipeline/KanbanCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  stage: EtapaPipeline
  leads: Lead[]
  responsavelMap: Record<string, string>
  canDragLead: (lead: Lead) => boolean
  onKeyboardMove: (leadId: string, direction: 'next' | 'prev') => void
  loading?: boolean
}

export function KanbanColumn({
  stage,
  leads,
  responsavelMap,
  canDragLead,
  onKeyboardMove,
  loading,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      className={cn(
        'flex w-[280px] shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50/80 md:w-auto md:min-w-0 md:flex-1',
        isOver && 'border-[#1565C0] bg-blue-50/50 ring-2 ring-[#63B3ED] transition-all duration-200'
      )}
    >
      <div
        className="flex items-center gap-2 rounded-t-xl border-b bg-white px-3 py-3"
        style={{ borderTopColor: STAGE_COLORS[stage], borderTopWidth: 3 }}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STAGE_COLORS[stage] }}
          aria-hidden
        />
        <h3 className="flex-1 text-sm font-semibold text-gray-800">{stage}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {leads.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 min-h-[320px] max-h-[calc(100vh-280px)]">
        {loading ? (
          <>
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
          </>
        ) : leads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <Inbox className="h-8 w-8 text-gray-300" aria-hidden />
            <p className="text-sm text-gray-500">Nenhum lead nesta etapa</p>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao dashboard
              </Link>
            </Button>
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              responsavelName={lead.responsavel_id ? responsavelMap[lead.responsavel_id] : undefined}
              canDrag={canDragLead(lead)}
              onKeyboardMove={onKeyboardMove}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function KanbanColumnShimmer() {
  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-xl border bg-gray-50 md:flex-1 animate-pulse">
      <div className="h-12 rounded-t-xl bg-gray-200" />
      <div className="space-y-2 p-3">
        <div className="h-24 rounded-lg bg-gray-200" />
        <div className="h-24 rounded-lg bg-gray-200" />
      </div>
    </div>
  )
}
