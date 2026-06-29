import { supabase } from '@/integrations/supabase/client'
import type { TimelineEvent, TimelineEventType } from '@/integrations/supabase/types'

export const timelineKeys = {
  byLead: (leadId: string) => ['timeline', leadId] as const,
}

export async function fetchTimelineEvents(leadId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*, profiles(full_name)')
    .eq('lead_id', leadId)
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data as TimelineEvent[]
}

export async function logTimelineEvent(
  leadId: string,
  tipo: TimelineEventType,
  dados: Record<string, unknown> = {}
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      lead_id: leadId,
      user_id: user?.id ?? null,
      tipo,
      dados,
    })
    .select()
    .single()
  if (error) throw error
  return data as TimelineEvent
}
