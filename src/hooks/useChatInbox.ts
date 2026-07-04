import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchInboxConversations } from '@/services/liveChatService'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export const chatInboxKeys = {
  all: ['chat-inbox'] as const,
}

export function useChatInbox(search = '') {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...chatInboxKeys.all, profile?.id, profile?.role, search],
    queryFn: () => fetchInboxConversations(profile?.id, profile?.role ?? 'operacional'),
    enabled: !!profile,
  })

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('chat-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: chatInboxKeys.all })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp' }, () => {
        queryClient.invalidateQueries({ queryKey: chatInboxKeys.all })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, queryClient])

  const normalizedSearch = search.trim().toLowerCase()
  const conversations = (query.data ?? []).filter(({ lead }) => {
    if (!normalizedSearch) return true
    return (
      lead.nome.toLowerCase().includes(normalizedSearch) ||
      lead.telefone.replace(/\D/g, '').includes(normalizedSearch.replace(/\D/g, ''))
    )
  })

  return { conversations, isLoading: query.isLoading }
}
