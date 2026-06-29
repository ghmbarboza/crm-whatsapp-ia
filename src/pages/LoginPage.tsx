import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, LogIn, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, type LoginFormData } from '@/utils/validators'
import {
  clearLoginLockout,
  formatLockoutRemaining,
  getLockoutStatus,
  recordFailedLoginAttempt,
} from '@/utils/authLockout'
import { supabase } from '@/integrations/supabase/client'
import {
  fetchCurrentProfile,
  getPostLoginPath,
  isProfileActive,
  isSsoEnabled,
  logAuthEvent,
  signInWithSso,
} from '@/services/authService'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

const GENERIC_LOGIN_ERROR = 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.'
const CONNECTION_ERROR = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
const INACTIVE_ERROR = 'Sua conta está inativa. Entre em contato com o administrador do sistema.'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showLockout, setShowLockout] = useState(false)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [show2faPrompt, setShow2faPrompt] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  const emailValue = watch('email')

  const refreshLockout = useCallback(() => {
    if (!emailValue) return
    const status = getLockoutStatus(emailValue)
    setLockoutRemaining(status.remainingMs)
    if (status.locked) setShowLockout(true)
  }, [emailValue])

  useEffect(() => {
    refreshLockout()
    if (!emailValue) return
    const interval = setInterval(refreshLockout, 1000)
    return () => clearInterval(interval)
  }, [emailValue, refreshLockout])

  if (authLoading) {
    return <AuthLayout loading subtitle="Verificando sessão..." />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const isLocked = emailValue ? getLockoutStatus(emailValue).locked : false

  const completeLogin = (profileName: string, path: string) => {
    toast.success(`Bem-vindo, ${profileName}`)
    navigate(path, { replace: true })
  }

  const onSubmit = async (data: LoginFormData) => {
    if (submitting || isLocked) return

    const lockStatus = getLockoutStatus(data.email)
    if (lockStatus.locked) {
      setLockoutRemaining(lockStatus.remainingMs)
      setShowLockout(true)
      return
    }

    setSubmitting(true)
    setLoginError(null)

    try {
      await signIn(data.email, data.password)
      const profile = await fetchCurrentProfile()

      if (!profile) {
        setLoginError('Não foi possível carregar seu perfil. Tente novamente.')
        return
      }

      if (!isProfileActive(profile)) {
        await supabase.auth.signOut()
        await logAuthEvent('login_falha', { email: data.email, motivo: 'conta_inativa' })
        setLoginError(INACTIVE_ERROR)
        return
      }

      clearLoginLockout(data.email)
      await logAuthEvent('login_sucesso', { email: data.email, role: profile.role })

      const path = getPostLoginPath(profile.role)

      if (profile.role === 'admin' && !profile.two_factor_enabled) {
        setPendingRedirect(path)
        setPendingName(profile.full_name)
        setShow2faPrompt(true)
        return
      }

      completeLogin(profile.full_name, path)
    } catch (e) {
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error && e.message.toLowerCase().includes('fetch'))

      if (isNetwork) {
        setLoginError(CONNECTION_ERROR)
      } else {
        const result = recordFailedLoginAttempt(data.email)
        setLoginError(GENERIC_LOGIN_ERROR)

        if (result.locked) {
          setLockoutRemaining(result.remainingMs)
          setShowLockout(true)
        }

        await logAuthEvent('login_falha', { email: data.email })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSso = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await signInWithSso()
    } catch {
      toast.error(CONNECTION_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  const handle2faContinue = () => {
    setShow2faPrompt(false)
    if (pendingRedirect && pendingName) {
      completeLogin(pendingName, pendingRedirect)
    }
  }

  return (
    <AuthLayout title="Acesso ao sistema" subtitle="Entre com suas credenciais corporativas">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="email" className="text-gray-800">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={submitting || isLocked}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="mt-1.5 h-11"
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password" className="text-gray-800">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={submitting || isLocked}
            aria-invalid={!!errors.password || !!loginError}
            aria-describedby={loginError ? 'login-error' : errors.password ? 'password-error' : undefined}
            className="mt-1.5 h-11"
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {errors.password.message}
            </p>
          )}
          {loginError && (
            <p
              id="login-error"
              className="mt-1.5 flex items-center gap-1 text-sm text-red-600 transition-opacity duration-300"
              role="alert"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {loginError}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            to="/auth/reset"
            className="text-sm font-medium text-[#0D4F8B] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:ring-offset-2 rounded"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-[#0D4F8B] hover:bg-[#1565C0] focus-visible:ring-[#1565C0]"
          disabled={!isValid || submitting || isLocked}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Entrando...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden />
              Entrar
            </>
          )}
        </Button>

        {isSsoEnabled() && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">ou</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={submitting}
              onClick={handleSso}
            >
              Entrar com SSO corporativo
            </Button>
          </>
        )}
      </form>

      <AlertDialog open={showLockout} onOpenChange={setShowLockout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acesso temporariamente bloqueado</AlertDialogTitle>
            <AlertDialogDescription>
              Foram detectadas {5} tentativas de login inválidas. Por segurança, o acesso ficará
              bloqueado por 10 minutos. Tempo restante:{' '}
              <strong>{formatLockoutRemaining(lockoutRemaining)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => lockoutRemaining <= 0 && setShowLockout(false)}
              disabled={lockoutRemaining > 0}
            >
              {lockoutRemaining > 0 ? 'Aguarde para tentar novamente' : 'Voltar ao login'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={show2faPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#0D4F8B]" />
              Autenticação em duas etapas obrigatória
            </AlertDialogTitle>
            <AlertDialogDescription>
              Como administrador, você deve ativar a autenticação em duas etapas (2FA) para
              garantir a segurança do sistema. Configure o 2FA em Configurações antes de
              continuar operando com privilégios elevados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" asChild>
              <Link to="/admin/settings">Configurar 2FA</Link>
            </Button>
            <AlertDialogAction onClick={handle2faContinue}>Continuar por agora</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AuthLayout>
  )
}
