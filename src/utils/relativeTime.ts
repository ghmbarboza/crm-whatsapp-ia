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

/** WhatsApp-style timestamp for conversation list */
export function formatChatListTime(iso: string | null | undefined): string {
  if (!iso) return ''

  try {
    const date = parseISO(iso)
    const now = new Date()
    const minutes = differenceInMinutes(now, date)
    const hours = differenceInHours(now, date)

    if (minutes < 1) return 'agora'
    if (hours < 24) return format(date, 'HH:mm', { locale: ptBR })
    if (hours < 48) return 'Ontem'
    return format(date, 'dd/MM/yy', { locale: ptBR })
  } catch {
    return ''
  }
}
