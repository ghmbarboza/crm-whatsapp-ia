import { useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import type { Classificacao, EtapaPipeline, Profile } from '@/integrations/supabase/types'
import type { PipelineFilters } from '@/hooks/usePipelineFilters'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface PipelineFiltersBarProps {
  filters: PipelineFilters
  profiles: Profile[]
  onUpdate: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void
  onReset: () => void
  showMobileSheet?: boolean
}

function FilterFields({
  filters,
  profiles,
  onUpdate,
  onReset,
}: Omit<PipelineFiltersBarProps, 'showMobileSheet'>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="filter-etapa">Etapa</Label>
        <Select
          value={filters.etapa}
          onValueChange={(v) => onUpdate('etapa', v as EtapaPipeline | 'all')}
        >
          <SelectTrigger id="filter-etapa">
            <SelectValue placeholder="Todas etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-classificacao">Classificação</Label>
        <Select
          value={filters.classificacao}
          onValueChange={(v) => onUpdate('classificacao', v as Classificacao | 'all')}
        >
          <SelectTrigger id="filter-classificacao">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="quente">Quente</SelectItem>
            <SelectItem value="morno">Morno</SelectItem>
            <SelectItem value="frio">Frio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-responsavel">Responsável</Label>
        <Select
          value={filters.responsavelId}
          onValueChange={(v) => onUpdate('responsavelId', v)}
        >
          <SelectTrigger id="filter-responsavel">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button variant="outline" className="w-full" onClick={onReset}>
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      </div>
    </div>
  )
}

export function PipelineFiltersBar(props: PipelineFiltersBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const hasActiveFilters =
    props.filters.etapa !== 'all' ||
    props.filters.classificacao !== 'all' ||
    props.filters.responsavelId !== 'all'

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={props.filters.search}
            onChange={(e) => props.onUpdate('search', e.target.value)}
            className="pl-9"
            aria-label="Buscar leads por nome ou telefone"
          />
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0 lg:hidden">
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-[#1565C0]" aria-label="Filtros ativos" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="max-h-full overflow-y-auto">
            <h2 className="text-lg font-semibold">Filtros avançados</h2>
            <div className="mt-4">
              <FilterFields {...props} />
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="outline"
          className="hidden shrink-0 lg:inline-flex"
          onClick={() => {
            const el = document.getElementById('pipeline-advanced-filters')
            el?.classList.toggle('hidden')
          }}
        >
          <Filter className="h-4 w-4" />
          Filtros avançados
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-[#1565C0]" aria-label="Filtros ativos" />
          )}
        </Button>
      </div>

      <div id="pipeline-advanced-filters" className="hidden rounded-lg border bg-white p-4 lg:block">
        <FilterFields {...props} />
      </div>
    </div>
  )
}
