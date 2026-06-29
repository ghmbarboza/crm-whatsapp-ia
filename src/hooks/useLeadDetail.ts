import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLead } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import { fetchMensagens, mensagensKeys } from '@/services/mensagensService'
import { fetchTimelineEvents, timelineKeys } from '@/services/timelineService'
import {
  saveLeadNotes,
  updateLeadResponsavel,
  updateLeadStageWithTimeline,
  convertLead,
  registerLeadResult,
  removeLead,
} from '@/services/leadDetailService'
import { fetchProfiles } from '@/services/equipesService'
import { supabase } from '@/integrations/supabase/client'
import type { EtapaPipeline, Mensagem, TimelineEvent } from '@/integrations/supabase/types'

export type TimelineItem =
  | { kind: 'message'; id: string; date: string; data: Mensagem }
  | { kind: 'event'; id: string; date: string; data: TimelineEvent }

const PAGE_SIZE = 15

export function useLeadDetail(leadId: string) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const leadQuery = useLead(leadId)

  const messagesQuery = useQuery({
    queryKey: mensagensKeys.byLead(leadId),
    queryFn: () => fetchMensagens(leadId),
    enabled: !!leadId,
  })

  const eventsQuery = useQuery({
    queryKey: timelineKeys.byLead(leadId),
    queryFn: () => fetchTimelineEvents(leadId, 100, 0),
    enabled: !!leadId,
    retry: false,
  })

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  })

  useEffect(() => {
    if (!leadId) return

    const channel = supabase
      .channel(`lead-detail-${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey: ['leads', leadId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'timeline_events', filter: `lead_id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey: timelineKeys.byLead(leadId) })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, queryClient])

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const messages = (messagesQuery.data || []).map((m) => ({
      kind: 'message' as const,
      id: `msg-${m.id}`,
      date: m.timestamp,
      data: m,
    }))
    const events = (eventsQuery.data || []).map((e) => ({
      kind: 'event' as const,
      id: `evt-${e.id}`,
      date: e.criado_em,
      data: e,
    }))
    return [...messages, ...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [messagesQuery.data, eventsQuery.data])

  const visibleTimeline = timelineItems.slice(-visibleCount)
  const hasMore = timelineItems.length > visibleCount

  const loadMore = () => setVisibleCount((c) => c + PAGE_SIZE)

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: mensagensKeys.byLead(leadId) })
    queryClient.invalidateQueries({ queryKey: timelineKeys.byLead(leadId) })
  }

  const saveNotesMutation = useMutation({
    mutationFn: (anotacoes: string) => saveLeadNotes(leadId, anotacoes),
    onSuccess: () => {
      invalidateAll()
      toast.success('Anotação salva com sucesso')
    },
    onError: (e: Error) =>
      toast.error(e.message || 'Erro ao salvar anotação', {
        action: { label: 'Tentar novamente', onClick: () => saveNotesMutation.reset() },
      }),
  })

  const updateResponsavelMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) =>
      updateLeadResponsavel(leadId, id, nome),
    onSuccess: () => {
      invalidateAll()
      toast.success('Responsável atualizado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ from, to }: { from: EtapaPipeline; to: EtapaPipeline }) =>
      updateLeadStageWithTimeline(leadId, from, to),
    onSuccess: () => {
      invalidateAll()
      toast.success('Etapa atualizada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const convertMutation = useMutation({
    mutationFn: (from: EtapaPipeline) => convertLead(leadId, from),
    onSuccess: () => {
      invalidateAll()
      toast.success('Lead convertido com sucesso!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const registerResultMutation = useMutation({
    mutationFn: (resultado: string) => registerLeadResult(leadId, resultado),
    onSuccess: () => {
      invalidateAll()
      toast.success('Resultado registrado')
    },
    onError: (e: Error) =>
      toast.error(e.message || 'Erro ao registrar resultado', {
        action: { label: 'Tentar novamente', onClick: () => registerResultMutation.reset() },
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => removeLead(leadId),
    onSuccess: () => toast.success('Lead removido'),
    onError: (e: Error) => toast.error(e.message),
  })

  return {
    lead: leadQuery.data,
    isLoading: leadQuery.isLoading || messagesQuery.isLoading,
    eventsLoading: eventsQuery.isLoading,
    profile,
    profiles: profilesQuery.data || [],
    timelineItems: visibleTimeline,
    allTimelineCount: timelineItems.length,
    hasMore,
    loadMore,
    saveNotesMutation,
    updateResponsavelMutation,
    updateStageMutation,
    convertMutation,
    registerResultMutation,
    deleteMutation,
  }
}
