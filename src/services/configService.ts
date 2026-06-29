import { supabase } from '@/integrations/supabase/client'

export async function fetchWhatsappConfig() {
  const { data, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .limit(1)
    .single()
  if (error) throw error
  return data
}

export async function updateWhatsappStatus(status: 'conectado' | 'desconectado', qrCode?: string) {
  const { data: config } = await supabase.from('whatsapp_config').select('id').limit(1).single()
  if (!config) throw new Error('Config não encontrada')
  const { error } = await supabase
    .from('whatsapp_config')
    .update({ status, qr_code: qrCode ?? null })
    .eq('id', config.id)
  if (error) throw error
}

export async function fetchAiConfig() {
  const { data, error } = await supabase.from('ai_config').select('*').limit(1).single()
  if (error) throw error
  return data
}

export async function updateAiConfig(thresholds: { threshold_quente: number; threshold_morno: number }) {
  const { data: config } = await supabase.from('ai_config').select('id').limit(1).single()
  if (!config) throw new Error('Config não encontrada')
  const { error } = await supabase.from('ai_config').update(thresholds).eq('id', config.id)
  if (error) throw error
}

export async function fetchAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .order('criado_em', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
