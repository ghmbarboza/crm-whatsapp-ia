import type { EtapaPipeline } from '@/integrations/supabase/types'

export const PIPELINE_STAGES: EtapaPipeline[] = [
  'Novo',
  'Em Contato',
  'Qualificado',
  'Fechado',
]

export const STAGE_COLORS: Record<EtapaPipeline, string> = {
  Novo: '#2563EB',
  'Em Contato': '#D69E2E',
  Qualificado: '#22C55E',
  Fechado: '#6B7280',
}

export function getStageIndex(stage: EtapaPipeline): number {
  return PIPELINE_STAGES.indexOf(stage)
}

export function canTransition(from: EtapaPipeline, to: EtapaPipeline): boolean {
  if (from === to) return false
  const fromIndex = getStageIndex(from)
  const toIndex = getStageIndex(to)
  return Math.abs(fromIndex - toIndex) === 1
}

export function isForwardTransition(from: EtapaPipeline, to: EtapaPipeline): boolean {
  return getStageIndex(to) > getStageIndex(from)
}

export function isBackwardTransition(from: EtapaPipeline, to: EtapaPipeline): boolean {
  return getStageIndex(to) < getStageIndex(from)
}

export function getAdjacentStage(
  current: EtapaPipeline,
  direction: 'next' | 'prev'
): EtapaPipeline | null {
  const index = getStageIndex(current)
  const newIndex = direction === 'next' ? index + 1 : index - 1
  if (newIndex < 0 || newIndex >= PIPELINE_STAGES.length) return null
  return PIPELINE_STAGES[newIndex]
}

export function canUserMoveLead(
  lead: { responsavel_id: string | null },
  userId: string | undefined,
  role: 'admin' | 'gestor' | 'operacional'
): boolean {
  if (role === 'admin') return true
  if (role === 'gestor') return true
  return lead.responsavel_id === userId
}

