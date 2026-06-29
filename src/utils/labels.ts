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

export function sentimentoBadgeClass(s: string): string {
  switch (s) {
    case 'positivo':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'negativo':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200'
  }
}
