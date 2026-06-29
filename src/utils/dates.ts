import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR })
  } catch {
    return iso
  }
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}
