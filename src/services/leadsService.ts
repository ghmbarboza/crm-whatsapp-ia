import { supabase } from '@/integrations/supabase/client'
import type { Lead, EtapaPipeline } from '@/integrations/supabase/types'

export const leadsKeys = {
  all: ['leads'] as const,
  list: (filters?: Record<string, string>) => ['leads', 'list', filters] as const,
  detail: (id: string) => ['leads', id] as const,
}

export async function fetchLeads(filters?: {
  etapa?: EtapaPipeline
  classificacao?: string
  search?: string
  responsavelId?: string
}) {
  let query = supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .order('etapa_pipeline', { ascending: true })
    .order('atualizado_em', { ascending: false })

  if (filters?.etapa) query = query.eq('etapa_pipeline', filters.etapa)
  if (filters?.classificacao) query = query.eq('classificacao', filters.classificacao)
  if (filters?.responsavelId) query = query.eq('responsavel_id', filters.responsavelId)
  if (filters?.search) {
    query = query.or(`nome.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Lead[]
}

export async function fetchLead(id: string) {
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
  if (error) throw error
  return data as Lead
}

export async function findLeadByPhone(telefone: string): Promise<Lead | null> {
  const digits = telefone.replace(/\D/g, '')
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .or(`telefone.ilike.%${digits}%,telefone.eq.${telefone}`)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Lead | null
}

export async function createLead(lead: Omit<Lead, 'id' | 'criado_em' | 'atualizado_em' | 'deleted_at'>) {
  const { data, error } = await supabase.from('leads').insert(lead).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single()
  if (error) throw error
  try {
    await supabase.rpc('log_audit', {
      p_acao: 'update',
      p_entidade: 'leads',
      p_entidade_id: id,
      p_detalhes: updates as Record<string, unknown>,
    })
  } catch {
    // audit log optional
  }
  return data as Lead
}

export async function softDeleteLead(id: string) {
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  try {
    await supabase.rpc('log_audit', {
      p_acao: 'soft_delete',
      p_entidade: 'leads',
      p_entidade_id: id,
    })
  } catch {
    // audit log optional
  }
}

export async function updateLeadStage(id: string, etapa_pipeline: EtapaPipeline) {
  return updateLead(id, { etapa_pipeline })
}
