import { supabase } from '@/integrations/supabase/client'
import type { Alerta } from '@/integrations/supabase/types'

export const alertasKeys = {
  all: ['alertas'] as const,
  unread: ['alertas', 'unread'] as const,
}

export async function fetchAlertas() {
  const { data, error } = await supabase
    .from('alertas')
    .select('*, leads(nome)')
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as (Alerta & { leads: { nome: string } | null })[]
}

export async function markAlertaRead(id: string) {
  const { error } = await supabase.from('alertas').update({ lido: true }).eq('id', id)
  if (error) throw error
}

export async function markAllAlertasRead() {
  const { error } = await supabase.from('alertas').update({ lido: true }).eq('lido', false)
  if (error) throw error
}
