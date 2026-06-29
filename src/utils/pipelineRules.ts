import type { EtapaPipeline } from '@/integrations/supabase/types'

export const PIPELINE_STAGES: EtapaPipeline[] = [
  'Novo',
  'Em Contato',
  'Qualificado',
  'Fechado',
]

export function canTransition(from: EtapaPipeline, to: EtapaPipeline): boolean {
  if (from === to) return false
  const fromIndex = PIPELINE_STAGES.indexOf(from)
  const toIndex = PIPELINE_STAGES.indexOf(to)
  return Math.abs(fromIndex - toIndex) === 1
}

export function getAdjacentStage(
  current: EtapaPipeline,
  direction: 'next' | 'prev'
): EtapaPipeline | null {
  const index = PIPELINE_STAGES.indexOf(current)
  const newIndex = direction === 'next' ? index + 1 : index - 1
  if (newIndex < 0 || newIndex >= PIPELINE_STAGES.length) return null
  return PIPELINE_STAGES[newIndex]
}
