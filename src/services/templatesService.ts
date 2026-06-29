import { supabase } from '@/integrations/supabase/client'
import type { MessageTemplate } from '@/integrations/supabase/types'

export const templatesKeys = {
  all: ['templates'] as const,
}

export async function fetchTemplates() {
  const { data, error } = await supabase.from('message_templates').select('*').order('nome')
  if (error) throw error
  return data as MessageTemplate[]
}

export async function createTemplate(template: Omit<MessageTemplate, 'id' | 'criado_em' | 'atualizado_em'>) {
  const { data, error } = await supabase.from('message_templates').insert(template).select().single()
  if (error) throw error
  return data as MessageTemplate
}

export async function updateTemplate(id: string, updates: Partial<MessageTemplate>) {
  const { data, error } = await supabase.from('message_templates').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as MessageTemplate
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('message_templates').delete().eq('id', id)
  if (error) throw error
}

export async function submitAiFeedback(feedback: {
  lead_id: string
  mensagem_id?: string
  classificacao_ia: string
  classificacao_manual?: string
  sentimento_ia?: string
  sentimento_manual?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('ai_feedback').insert({
    ...feedback,
    user_id: user?.id,
  })
  if (error) throw error
}
