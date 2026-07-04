/** Normalize Brazilian WhatsApp numbers for storage and Evolution API. */

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Last 11 digits (DDD + número) for BR mobiles. */
export function normalizeBrazilDigits(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 10) d = `${d.slice(0, 2)}9${d.slice(2)}`;
  return d;
}

export function formatBrazilPhone(phone: string): string {
  const d = normalizeBrazilDigits(phone);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return d;
}

export function phonesMatch(a: string, b: string): boolean {
  return normalizeBrazilDigits(a) === normalizeBrazilDigits(b);
}

/** Evolution API expects country code (e.g. 5511999999999). */
export function toEvolutionNumber(phone: string): string {
  const local = normalizeBrazilDigits(phone);
  if (!local) return "";
  return `55${local}`;
}
