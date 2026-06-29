import { useEffect, useState } from 'react'
import type { Classificacao, EtapaPipeline } from '@/integrations/supabase/types'

export interface PipelineFilters {
  search: string
  etapa: EtapaPipeline | 'all'
  classificacao: Classificacao | 'all'
  responsavelId: string | 'all'
}

const STORAGE_KEY = 'crm_pipeline_filters'

const DEFAULT_FILTERS: PipelineFilters = {
  search: '',
  etapa: 'all',
  classificacao: 'all',
  responsavelId: 'all',
}

function loadFilters(): PipelineFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FILTERS
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_FILTERS
  }
}

function saveFilters(filters: PipelineFilters): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
}

export function usePipelineFilters() {
  const [filters, setFilters] = useState<PipelineFilters>(loadFilters)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  const updateFilter = <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  return { filters, debouncedSearch, updateFilter, resetFilters }
}
