export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function phoneToDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Last 11 digits (DDD + número) for BR mobiles. */
export function normalizeBrazilDigits(phone: string): string {
  let d = phoneToDigits(phone)
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length === 10) d = `${d.slice(0, 2)}9${d.slice(2)}`
  return d
}

/** Evolution API expects country code (e.g. 5511999999999). */
export function toEvolutionNumber(phone: string): string {
  const local = normalizeBrazilDigits(phone)
  if (!local) return ''
  return `55${local}`
}

export const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/
