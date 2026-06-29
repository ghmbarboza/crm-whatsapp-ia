import { describe, it, expect } from 'vitest'
import { canTransition, getAdjacentStage, PIPELINE_STAGES } from './pipelineRules'

describe('pipelineRules', () => {
  it('allows adjacent transitions', () => {
    expect(canTransition('Novo', 'Em Contato')).toBe(true)
    expect(canTransition('Em Contato', 'Novo')).toBe(true)
    expect(canTransition('Em Contato', 'Qualificado')).toBe(true)
  })

  it('blocks non-adjacent transitions', () => {
    expect(canTransition('Novo', 'Qualificado')).toBe(false)
    expect(canTransition('Novo', 'Fechado')).toBe(false)
  })

  it('returns adjacent stages', () => {
    expect(getAdjacentStage('Novo', 'next')).toBe('Em Contato')
    expect(getAdjacentStage('Em Contato', 'prev')).toBe('Novo')
    expect(getAdjacentStage('Novo', 'prev')).toBeNull()
    expect(getAdjacentStage('Fechado', 'next')).toBeNull()
  })

  it('has 4 pipeline stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(4)
  })
})
