import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  leadsKeys,
  fetchLeads,
  fetchLead,
  createLead,
  updateLead,
  softDeleteLead,
  updateLeadStage,
} from '@/services/leadsService'
import { supabase } from '@/integrations/supabase/client'
import type { Lead, EtapaPipeline } from '@/integrations/supabase/types'
import { useAuth } from './useAuth'

export function useLeads(filters?: Parameters<typeof fetchLeads>[0]) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: leadsKeys.list(filters),
    queryFn: () => fetchLeads(filters),
  })

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: leadsKeys.all })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadsKeys.detail(id),
    queryFn: () => fetchLead(id),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<Lead, 'id' | 'criado_em' | 'atualizado_em' | 'deleted_at'>) =>
      createLead({ ...data, user_id: user?.id ?? null, responsavel_id: data.responsavel_id ?? user?.id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all })
      toast.success('Lead criado com sucesso')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) => updateLead(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all })
      toast.success('Lead atualizado')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: softDeleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all })
      toast.success('Lead removido')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: EtapaPipeline }) => updateLeadStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  })
}
