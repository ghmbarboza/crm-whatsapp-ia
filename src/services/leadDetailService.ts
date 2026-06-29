import { supabase } from '@/integrations/supabase/client'
import { updateLead, softDeleteLead } from '@/services/leadsService'
import { logTimelineEvent } from '@/services/timelineService'
import type { EtapaPipeline, Lead, UserRole } from '@/integrations/supabase/types'

export function canEditLead(
  lead: Lead,
  userId: string | undefined,
  role: UserRole
): boolean {
  if (role === 'admin' || role === 'gestor') return true
  return lead.responsavel_id === userId
}

export function canDeleteLead(role: UserRole): boolean {
  return role === 'admin' || role === 'gestor'
}

export function canConvertLead(lead: Lead): boolean {
  return lead.etapa_pipeline === 'Qualificado'
}

export function canEditResponsavel(role: UserRole): boolean {
  return role === 'admin' || role === 'gestor'
}

export async function saveLeadNotes(leadId: string, anotacoes: string) {
  const result = await updateLead(leadId, { anotacoes })
  await logTimelineEvent(leadId, 'anotacao', { texto: anotacoes.slice(0, 200) })
  return result
}

export async function updateLeadResponsavel(leadId: string, responsavelId: string, responsavelNome: string) {
  const result = await updateLead(leadId, { responsavel_id: responsavelId })
  await logTimelineEvent(leadId, 'atribuicao', { responsavel_id: responsavelId, responsavel_nome: responsavelNome })
  return result
}

export async function updateLeadStageWithTimeline(
  leadId: string,
  from: EtapaPipeline,
  to: EtapaPipeline
) {
  const result = await updateLead(leadId, { etapa_pipeline: to })
  await logTimelineEvent(leadId, 'mudanca_etapa', { de: from, para: to })
  return result
}

export async function convertLead(leadId: string, from: EtapaPipeline) {
  if (from !== 'Qualificado') {
    throw new Error('Só é possível converter leads na etapa Qualificado')
  }
  const result = await updateLead(leadId, { etapa_pipeline: 'Fechado' })
  await logTimelineEvent(leadId, 'conversao', { de: from, para: 'Fechado' })
  return result
}

export async function registerLeadResult(leadId: string, resultado: string) {
  await logTimelineEvent(leadId, 'registro_resultado', { resultado })
}

export async function removeLead(leadId: string) {
  return softDeleteLead(leadId)
}

export async function fetchLeadWithResponsavel(leadId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as Lead
}
