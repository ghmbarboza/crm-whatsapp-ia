import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWhatsappConfig } from '@/services/configService'
import { supabase } from '@/integrations/supabase/client'

export function useWhatsappStatus() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: fetchWhatsappConfig,
  })

  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_config' }, () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}
