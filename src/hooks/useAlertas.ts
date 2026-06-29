import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { alertasKeys, fetchAlertas, markAlertaRead, markAllAlertasRead } from '@/services/alertasService'
import { supabase } from '@/integrations/supabase/client'

export function useAlertas() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: alertasKeys.all,
    queryFn: fetchAlertas,
    refetchInterval: 30000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('alertas-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: alertasKeys.all })
        const msg = (payload.new as { mensagem?: string })?.mensagem
        if (msg) toast.warning(msg, { duration: 5000 })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const unreadCount = (query.data || []).filter((a) => !a.lido).length

  const markRead = useMutation({
    mutationFn: markAlertaRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertasKeys.all }),
  })

  const markAllRead = useMutation({
    mutationFn: markAllAlertasRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertasKeys.all }),
  })

  return { ...query, unreadCount, markRead, markAllRead }
}
