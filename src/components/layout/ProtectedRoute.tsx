import { Navigate, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export function ProtectedRoute() {
  const { user, profile, loading, acceptTerms } = useAuth()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [accepting, setAccepting] = useState(false)

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!user) return <Navigate to="/login" replace />

  const showTerms = profile && !profile.terms_accepted_at

  const handleAcceptTerms = async () => {
    if (!termsAccepted) return
    setAccepting(true)
    try {
      await acceptTerms()
      toast.success('Termos aceitos')
    } catch {
      toast.error('Erro ao aceitar termos')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Dialog open={!!showTerms}>
        <DialogContent className="[&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Termos de Uso e Privacidade (LGPD)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Ao utilizar este sistema, você concorda com o tratamento de dados pessoais de leads
            conforme a política interna de privacidade da empresa.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} />
            Li e aceito os termos de uso
          </label>
          <Button onClick={handleAcceptTerms} disabled={!termsAccepted || accepting}>
            Continuar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
