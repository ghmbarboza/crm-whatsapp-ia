import { supabase } from '@/integrations/supabase/client'
import type { Mensagem } from '@/integrations/supabase/types'

export const mensagensKeys = {
  byLead: (leadId: string) => ['mensagens', leadId] as const,
}

export async function fetchMensagens(leadId: string) {
  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('*')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: false })
  if (error) throw error
  return data as Mensagem[]
}

export async function sendMensagem(leadId: string, conteudo: string, anexoUrl?: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  const response = await supabase.functions.invoke('whatsapp-send', {
    body: { lead_id: leadId, conteudo, anexo_url: anexoUrl },
  })

  if (response.error) throw response.error
  return response.data
}

export async function uploadAttachment(file: File, leadId: string) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo excede o limite de 5MB')
  }
  const ext = file.name.split('.').pop()
  const path = `${leadId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('chat-attachments').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path)
  return data.publicUrl
}
