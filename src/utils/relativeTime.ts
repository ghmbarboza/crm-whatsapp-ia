import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatRelativeContact(iso: string | null | undefined): string {
  if (!iso) return 'Sem contato registrado'

  try {
    const date = parseISO(iso)
    const now = new Date()
    const minutes = differenceInMinutes(now, date)
    const hours = differenceInHours(now, date)

    if (minutes < 1) return 'há instantes'
    if (minutes < 60) return `há ${minutes} min`
    if (hours < 24) return `há ${hours} h`
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return iso
  }
}
