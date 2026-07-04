import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mensagensKeys, fetchMensagens, sendMensagem, uploadAttachment } from '@/services/mensagensService'
import { fetchAiSuggestions, logChatEvent } from '@/services/liveChatService'
import { leadsKeys } from '@/services/leadsService'
import { supabase } from '@/integrations/supabase/client'
import { showLocalNotification } from '@/utils/pushNotifications'
import type { Lead, Mensagem } from '@/integrations/supabase/types'

const NOTIFY_COOLDOWN_MS = 30_000
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

async function triggerAiClassification(leadId: string, mensagemId: string, conteudo: string) {
  try {
    await supabase.functions.invoke('ai-classify', {
      body: { lead_id: leadId, mensagem_id: mensagemId, conteudo },
    })
  } catch {
    // classificação é assíncrona; falhas não bloqueiam o chat
  }
}

export function useLiveChat(leadId: string, lead?: Lead | null) {
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastNotifyRef = useRef<number>(0)
  const responsavelRef = useRef(lead?.responsavel_id)

  useEffect(() => {
    responsavelRef.current = lead?.responsavel_id
  }, [lead?.responsavel_id])

  const messagesQuery = useQuery({
    queryKey: [...mensagensKeys.byLead(leadId), 'asc'],
    queryFn: () => fetchMensagens(leadId, 'asc'),
    enabled: !!leadId,
  })

  const lastReceived = [...(messagesQuery.data || [])]
    .reverse()
    .find((m) => m.tipo === 'recebida')

  const suggestionsQuery = useQuery({
    queryKey: ['ai-suggestions', leadId, lastReceived?.id, lastReceived?.sentimento],
    queryFn: () => fetchAiSuggestions(leadId, lastReceived?.conteudo),
    enabled: !!leadId,
    staleTime: 30_000,
  })

  const notifyRateLimited = useCallback((title: string, body: string, hot = false) => {
    const now = Date.now()
    if (now - lastNotifyRef.current < NOTIFY_COOLDOWN_MS) return
    lastNotifyRef.current = now

    if (hot) {
      toast.error(title, {
        description: body,
        duration: 8000,
      })
    } else {
      toast.info(title, { description: body })
    }
    showLocalNotification(title, body)
  }, [])

  useEffect(() => {
    if (!leadId) return

    const channel = supabase
      .channel(`live-chat-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const msg = payload.new as Mensagem
          queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })

          if (msg.tipo === 'recebida') {
            logChatEvent(leadId, 'mensagem_recebida', { preview: msg.conteudo.slice(0, 100) })
            notifyRateLimited('Nova mensagem', msg.conteudo.slice(0, 80))
            if (lead?.classificacao === 'quente') {
              notifyRateLimited('Lead quente respondeu!', 'Priorize este atendimento.', true)
            }
            if (!msg.analisado) {
              triggerAiClassification(leadId, msg.id, msg.conteudo)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
          queryClient.invalidateQueries({ queryKey: ['ai-suggestions', leadId] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: leadsKeys.detail(leadId) })
          queryClient.invalidateQueries({ queryKey: leadsKeys.all })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, lead?.classificacao, queryClient, notifyRateLimited])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const sendMutation = useMutation({
    mutationFn: async ({ conteudo, file }: { conteudo: string; file?: File }) => {
      if (lead && responsavelRef.current !== lead.responsavel_id) {
        throw new Error('O responsável deste lead foi alterado. Recarregue a página.')
      }
      let anexoUrl: string | undefined
      if (file) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          throw new Error('Arquivo excede o limite de 10MB')
        }
        anexoUrl = await uploadAttachment(file, leadId)
        await logChatEvent(leadId, 'anexo_enviado', { nome: file.name })
      }
      const result = await sendMensagem(leadId, conteudo, anexoUrl)
      await logChatEvent(leadId, 'mensagem_enviada', { preview: conteudo.slice(0, 100) })
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Falha ao enviar mensagem')
    },
  })

  const acceptSuggestion = useCallback(
    async (suggestion: string) => {
      await logChatEvent(leadId, 'sugestao_ia_aceita', { texto: suggestion.slice(0, 200) })
    },
    [leadId]
  )

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    suggestions: suggestionsQuery.data || [],
    sendMutation,
    acceptSuggestion,
    bottomRef,
  }
}
