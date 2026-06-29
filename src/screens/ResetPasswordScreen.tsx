import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/utils/validators'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true)
        setCheckingSession(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCanReset(true)
      }
      setCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (checkingSession) return <LoadingSpinner className="min-h-screen" />

  if (!canReset) {
    return <Navigate to="/recuperar-senha" replace />
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await updatePassword(data.password)
      toast.success('Senha redefinida com sucesso')
      navigate('/dashboard', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao redefinir senha')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <MessageCircle className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-800">Nova senha</CardTitle>
          <p className="text-sm text-gray-500">Defina uma nova senha para sua conta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              {errors.password && (
                <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
