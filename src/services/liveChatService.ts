import { supabase } from '@/integrations/supabase/client'
import { logTimelineEvent } from '@/services/timelineService'
import type { Lead, TimelineEventType, UserRole } from '@/integrations/supabase/types'

const DEFAULT_SUGGESTIONS = [
  'Olá! Como posso ajudá-lo hoje?',
  'Obrigado pelo contato. Em que posso ajudar?',
  'Fico à disposição para continuarmos nossa conversa.',
]

export function canAccessChat(
  lead: Lead,
  userId: string | undefined,
  role: UserRole
): boolean {
  if (role === 'admin' || role === 'gestor') return true
  return lead.responsavel_id === userId
}

export async function fetchAiSuggestions(leadId: string, lastMessageContent?: string): Promise<string[]> {
  if (!lastMessageContent?.trim()) return DEFAULT_SUGGESTIONS

  try {
    const response = await supabase.functions.invoke('ai-classify', {
      body: {
        lead_id: leadId,
        mensagem_id: 'suggestion-request',
        conteudo: lastMessageContent,
      },
    })

    if (response.error) throw response.error

    const primary = (response.data as { sugestao_resposta?: string })?.sugestao_resposta
    if (primary) {
      return [primary, ...DEFAULT_SUGGESTIONS.filter((s) => s !== primary)].slice(0, 3)
    }
  } catch {
    // fallback to defaults
  }

  return DEFAULT_SUGGESTIONS
}

export async function logChatEvent(
  leadId: string,
  tipo: Extract<
    TimelineEventType,
    'mensagem_enviada' | 'mensagem_recebida' | 'sugestao_ia_aceita' | 'anexo_enviado'
  >,
  dados: Record<string, unknown> = {}
) {
  try {
    await logTimelineEvent(leadId, tipo, dados)
  } catch {
    // timeline opcional se migration não aplicada localmente
  }
}

export async function fetchWelcomeTemplate(): Promise<string> {
  const { data } = await supabase
    .from('message_templates')
    .select('conteudo')
    .eq('tipo', 'boas_vindas')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  return data?.conteudo ?? DEFAULT_SUGGESTIONS[0]
}

export interface InboxLastMessage {
  lead_id: string
  conteudo: string
  timestamp: string
  tipo: 'enviada' | 'recebida'
}

export interface InboxConversation {
  lead: Lead
  lastMessage: InboxLastMessage | null
  unreadCount: number
}

export async function fetchInboxConversations(
  userId: string | undefined,
  role: UserRole
): Promise<InboxConversation[]> {
  let query = supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .neq('etapa_pipeline', 'Fechado')
    .order('atualizado_em', { ascending: false })

  if (role === 'operacional' && userId) {
    query = query.eq('responsavel_id', userId)
  }

  const { data: leads, error } = await query
  if (error) throw error
  if (!leads?.length) return []

  const leadIds = leads.map((l) => l.id)
  const { data: messages, error: msgError } = await supabase
    .from('mensagens_whatsapp')
    .select('lead_id, conteudo, timestamp, tipo')
    .in('lead_id', leadIds)
    .order('timestamp', { ascending: false })

  if (msgError) throw msgError

  const lastByLead = new Map<string, InboxLastMessage>()
  for (const row of messages ?? []) {
    if (!lastByLead.has(row.lead_id)) {
      lastByLead.set(row.lead_id, row as InboxLastMessage)
    }
  }

  return (leads as Lead[])
    .map((lead) => ({
      lead,
      lastMessage: lastByLead.get(lead.id) ?? null,
      unreadCount: 0,
    }))
    .sort((a, b) => {
      const ta = a.lastMessage?.timestamp ?? a.lead.atualizado_em
      const tb = b.lastMessage?.timestamp ?? b.lead.atualizado_em
      return tb.localeCompare(ta)
    })
}
