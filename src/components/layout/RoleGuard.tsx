import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading'
import type { UserRole } from '@/integrations/supabase/types'

export function RoleGuard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { checkRole, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  if (!checkRole(roles)) {
    toast.error('Você não tem permissão para acessar esta página')
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
