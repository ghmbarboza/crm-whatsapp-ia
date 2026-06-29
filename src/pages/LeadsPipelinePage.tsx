import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useLeads, useUpdateLeadStage } from '@/hooks/useLeads'
import { usePipelineFilters } from '@/hooks/usePipelineFilters'
import { fetchProfiles } from '@/services/equipesService'
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  canTransition,
  canUserMoveLead,
  getAdjacentStage,
  isBackwardTransition,
} from '@/utils/pipelineRules'
import type { EtapaPipeline, Lead } from '@/integrations/supabase/types'
import { KanbanColumn, KanbanColumnShimmer } from '@/components/pipeline/KanbanColumn'
import { PipelineFiltersBar } from '@/components/pipeline/PipelineFiltersBar'
import { LeadFormDialog } from '@/components/leads/LeadFormDialog'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface PendingMove {
  leadId: string
  from: EtapaPipeline
  to: EtapaPipeline
}

export function LeadsPipelinePage() {
  const { profile, checkRole } = useAuth()
  const { filters, debouncedSearch, updateFilter, resetFilters } = usePipelineFilters()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [defaultStage, setDefaultStage] = useState<EtapaPipeline>('Novo')
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      etapa: filters.etapa !== 'all' ? filters.etapa : undefined,
      classificacao: filters.classificacao !== 'all' ? filters.classificacao : undefined,
      responsavelId: filters.responsavelId !== 'all' ? filters.responsavelId : undefined,
    }),
    [debouncedSearch, filters]
  )

  const { data: leads, isLoading } = useLeads(apiFilters)
  const updateStage = useUpdateLeadStage()

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    enabled: checkRole(['admin', 'gestor']),
  })

  const responsavelMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p.full_name])),
    [profiles]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const stageCounts = useMemo(() => {
    const counts: Record<EtapaPipeline, number> = {
      Novo: 0,
      'Em Contato': 0,
      Qualificado: 0,
      Fechado: 0,
    }
    ;(leads || []).forEach((l) => {
      counts[l.etapa_pipeline] += 1
    })
    return counts
  }, [leads])

  const canDragLead = useCallback(
    (lead: Lead) => {
      if (!profile || updateStage.isPending || isDragging) return false
      return canUserMoveLead(lead, profile.id, profile.role)
    },
    [profile, updateStage.isPending, isDragging]
  )

  const executeMove = useCallback(
    (leadId: string, _from: EtapaPipeline, to: EtapaPipeline) => {
      if (updateStage.isPending) return
      updateStage.mutate({ id: leadId, stage: to })
    },
    [updateStage]
  )

  const requestMove = useCallback(
    (lead: Lead, toStage: EtapaPipeline) => {
      if (!canDragLead(lead)) {
        toast.error('Você não tem permissão para mover este lead')
        return
      }

      if (!canTransition(lead.etapa_pipeline, toStage)) {
        toast.error('Mova apenas para etapas adjacentes')
        return
      }

      if (isBackwardTransition(lead.etapa_pipeline, toStage)) {
        setPendingMove({ leadId: lead.id, from: lead.etapa_pipeline, to: toStage })
        return
      }

      executeMove(lead.id, lead.etapa_pipeline, toStage)
    },
    [canDragLead, executeMove]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true)
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    setActiveId(null)
    const { active, over } = event
    if (!over || !leads) return

    const lead = leads.find((l) => l.id === active.id)
    const toStage = over.id as EtapaPipeline
    if (!lead || !PIPELINE_STAGES.includes(toStage)) return

    requestMove(lead, toStage)
  }

  const handleKeyboardMove = useCallback(
    (leadId: string, direction: 'next' | 'prev') => {
      const lead = leads?.find((l) => l.id === leadId)
      if (!lead) return
      const newStage = getAdjacentStage(lead.etapa_pipeline, direction)
      if (!newStage) return
      requestMove(lead, newStage)
    },
    [leads, requestMove]
  )

  const activeLead = leads?.find((l) => l.id === activeId)
  const isAdmin = checkRole(['admin'])

  const leadsByStage = (stage: EtapaPipeline) =>
    (leads || []).filter((l) => l.etapa_pipeline === stage)

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header fixo do pipeline */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-white px-4 py-4 md:-mx-6 md:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel de Leads</h1>
            <p className="text-sm text-gray-500">
              {(leads || []).length} lead{(leads || []).length !== 1 ? 's' : ''} no pipeline
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                  aria-hidden
                />
                <span className="text-gray-600">{stage}</span>
                <span className="font-bold text-gray-900">{stageCounts[stage]}</span>
              </div>
            ))}
          </div>
        </div>

        <PipelineFiltersBar
          filters={filters}
          profiles={profiles}
          onUpdate={updateFilter}
          onReset={resetFilters}
        />
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumnShimmer key={stage} />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className={cn(
              'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none',
              'scrollbar-thin scrollbar-thumb-gray-300'
            )}
            role="region"
            aria-label="Pipeline Kanban de leads"
          >
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={leadsByStage(stage)}
                responsavelMap={responsavelMap}
                canDragLead={canDragLead}
                onKeyboardMove={handleKeyboardMove}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200 }}>
            {activeLead ? (
              <div className="w-[260px] rounded-lg border-2 border-[#1565C0] bg-white p-3 shadow-lg">
                <p className="font-semibold">{activeLead.nome}</p>
                <p className="text-xs text-gray-500">{activeLead.etapa_pipeline}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* FAB criar lead (admin) */}
      {isAdmin && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-[#0D4F8B] p-0 shadow-lg hover:bg-[#1565C0]"
          onClick={() => {
            setDefaultStage('Novo')
            setFormOpen(true)
          }}
          aria-label="Criar novo lead"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} defaultStage={defaultStage} />

      {/* Confirmação retrocesso de etapa */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Retroceder etapa do lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está movendo o lead de <strong>{pendingMove?.from}</strong> para{' '}
            <strong>{pendingMove?.to}</strong>. Retroceder etapas pode impactar métricas do funil.
            Deseja continuar?
          </AlertDialogDescription>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMove) {
                  executeMove(pendingMove.leadId, pendingMove.from, pendingMove.to)
                  setPendingMove(null)
                }
              }}
            >
              Confirmar retrocesso
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
