import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mensagensKeys, fetchMensagens, sendMensagem, uploadAttachment } from '@/services/mensagensService'
import { supabase } from '@/integrations/supabase/client'

export function useChat(leadId: string) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const query = useQuery({
    queryKey: mensagensKeys.byLead(leadId),
    queryFn: () => fetchMensagens(leadId),
    enabled: !!leadId,
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2d')
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
          audioRef.current?.play().catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, queryClient])

  const sendMutation = useMutation({
    mutationFn: ({ conteudo, file }: { conteudo: string; file?: File }) =>
      (async () => {
        let anexoUrl: string | undefined
        if (file) anexoUrl = await uploadAttachment(file, leadId)
        return sendMensagem(leadId, conteudo, anexoUrl)
      })(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
      toast.success('Mensagem enviada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return { ...query, sendMutation }
}
