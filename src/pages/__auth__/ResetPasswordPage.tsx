import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validators'
import { logAuthEvent } from '@/services/authService'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GENERIC_RESET_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes.'
const CONNECTION_ERROR = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'

export function ResetPasswordPage() {
  const { resetPassword, user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  })

  if (authLoading) {
    return <AuthLayout loading subtitle="Verificando sessão..." />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (submitting) return
    setSubmitting(true)

    try {
      await resetPassword(data.email)
      await logAuthEvent('reset_senha_solicitado', { email: data.email })
      setSent(true)
      toast.success(GENERIC_RESET_MESSAGE)
    } catch (e) {
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error && e.message.toLowerCase().includes('fetch'))

      if (isNetwork) {
        toast.error(CONNECTION_ERROR)
      } else {
        // Mensagem genérica para evitar leak de informação sobre existência do e-mail
        setSent(true)
        toast.success(GENERIC_RESET_MESSAGE)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Informe seu e-mail corporativo para receber o link de recuperação"
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-6 w-6 text-green-600" aria-hidden />
          </div>
          <p className="text-sm text-gray-600">{GENERIC_RESET_MESSAGE}</p>
          <p className="text-xs text-gray-500">
            O link de redefinição é válido por 15 minutos. Verifique também a caixa de spam.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <p className="text-sm text-gray-600">
            Enviaremos um e-mail com instruções para criar uma nova senha. Por segurança, a
            validade do link é de 15 minutos.
          </p>

          <div>
            <Label htmlFor="reset-email" className="text-gray-800">
              E-mail
            </Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              autoFocus
              disabled={submitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'reset-email-error' : undefined}
              className="mt-1.5 h-11"
              {...register('email')}
            />
            {errors.email && (
              <p id="reset-email-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-[#0D4F8B] hover:bg-[#1565C0]"
            disabled={!isValid || submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enviando...
              </>
            ) : (
              'Enviar link de redefinição'
            )}
          </Button>

          <Button asChild variant="ghost" className="h-11 w-full">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
