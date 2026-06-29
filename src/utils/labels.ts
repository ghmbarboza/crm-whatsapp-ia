import type { Classificacao } from '@/integrations/supabase/types'

export function classificacaoBadgeClass(c: Classificacao): string {
  switch (c) {
    case 'quente':
      return 'bg-red-500 text-white'
    case 'morno':
      return 'bg-yellow-400 text-gray-900'
    case 'frio':
      return 'bg-gray-400 text-white'
  }
}

export function classificacaoLabel(c: Classificacao): string {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

export function sentimentoLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
