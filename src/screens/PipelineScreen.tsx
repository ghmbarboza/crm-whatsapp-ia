import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useLeads, useUpdateLeadStage } from '@/hooks/useLeads'
import { PIPELINE_STAGES, canTransition, getAdjacentStage } from '@/utils/pipelineRules'
import type { Lead, EtapaPipeline } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { classificacaoBadgeClass } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { t } from '@/i18n'

function LeadCard({ lead }: { lead: Lead }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const moveStage = (direction: 'next' | 'prev') => {
    const newStage = getAdjacentStage(lead.etapa_pipeline, direction)
    if (!newStage) return
    // handled by parent via keyboard - we'll use a custom event or pass callback
    document.dispatchEvent(new CustomEvent('lead-keyboard-move', { detail: { leadId: lead.id, stage: newStage } }))
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-white p-4 shadow-sm ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`Lead ${lead.nome}, etapa ${lead.etapa_pipeline}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') moveStage('next')
        if (e.key === 'ArrowLeft') moveStage('prev')
        if (e.key === 'Enter') navigate(`/chat/${lead.id}`)
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{lead.nome}</p>
        <Badge className={classificacaoBadgeClass(lead.classificacao)}>{lead.classificacao}</Badge>
      </div>
      <p className="text-xs text-gray-500">{lead.telefone}</p>
      <p className="mt-1 text-xs text-gray-400">{formatDateTime(lead.atualizado_em)}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/chat/${lead.id}`)
        }}
      >
        <MessageCircle className="h-4 w-4" />
        Chat
      </Button>
    </div>
  )
}

function PipelineColumn({ stage, leads }: { stage: EtapaPipeline; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-1 flex-col rounded-md bg-gray-100 p-3 ${isOver ? 'ring-2 ring-blue-600' : ''}`}
    >
      <h3 className="mb-3 text-center text-sm font-semibold text-gray-700">{stage}</h3>
      <div className="flex flex-1 flex-col gap-2">
        {leads.length === 0 ? (
          <EmptyState message={t('empty.leads')} />
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}

export function PipelineScreen() {
  const { data: leads, isLoading } = useLeads()
  const updateStage = useUpdateLeadStage()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !leads) return

    const lead = leads.find((l) => l.id === active.id)
    const toStage = over.id as EtapaPipeline
    if (!lead || !PIPELINE_STAGES.includes(toStage)) return

    if (!canTransition(lead.etapa_pipeline, toStage)) {
      toast.error('Transição inválida. Mova apenas para etapas adjacentes.')
      return
    }

    updateStage.mutate({ id: lead.id, stage: toStage })
  }

  // Keyboard move handler
  useEffect(() => {
    const handler = (e: Event) => {
      const { leadId, stage } = (e as CustomEvent).detail
      const lead = leads?.find((l) => l.id === leadId)
      if (!lead || !canTransition(lead.etapa_pipeline, stage)) {
        toast.error('Transição inválida')
        return
      }
      updateStage.mutate({ id: leadId, stage })
    }
    document.addEventListener('lead-keyboard-move', handler)
    return () => document.removeEventListener('lead-keyboard-move', handler)
  }, [leads, updateStage])

  if (isLoading) return <LoadingSpinner />

  const activeLead = leads?.find((l) => l.id === activeId)

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
      <p className="text-sm text-gray-500">
        Arraste cards entre colunas adjacentes ou use setas do teclado para mover.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={(leads || []).filter((l) => l.etapa_pipeline === stage)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="rounded-md border bg-white p-4 shadow-md">
              <p className="font-semibold">{activeLead.nome}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
