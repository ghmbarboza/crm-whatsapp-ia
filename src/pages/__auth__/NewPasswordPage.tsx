import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/utils/validators'
import { supabase } from '@/integrations/supabase/client'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema), mode: 'onChange' })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true)
        setCheckingSession(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCanReset(true)
      setCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (checkingSession) {
    return <AuthLayout loading subtitle="Validando link de redefinição..." />
  }

  if (!canReset) {
    return <Navigate to="/auth/reset" replace />
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (isSubmitting) return
    try {
      await updatePassword(data.password)
      toast.success('Senha redefinida com sucesso')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Não foi possível redefinir a senha. Solicite um novo link.')
    }
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Defina uma senha segura para sua conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 h-11"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertCircle className="h-3.5 w-3.5" />
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
            className="mt-1.5 h-11"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="h-11 w-full bg-[#0D4F8B] hover:bg-[#1565C0]"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Redefinir senha'
          )}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login">Voltar ao login</Link>
        </Button>
      </form>
    </AuthLayout>
  )
}
