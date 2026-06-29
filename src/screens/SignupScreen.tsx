import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { signupSchema, type SignupFormData } from '@/utils/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'

interface SignupScreenProps {
  embedded?: boolean
}

export function SignupScreen({ embedded }: SignupScreenProps) {
  const { signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) })

  if (!embedded) {
    if (loading) return <LoadingSpinner className="min-h-screen" />
    if (user) return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: SignupFormData) => {
    try {
      const { needsEmailConfirmation } = await signUp(data.email, data.password, data.full_name)
      if (needsEmailConfirmation) {
        toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        navigate('/auth?tab=login')
        return
      }
      toast.success('Conta criada com sucesso')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar conta')
    }
  }

  const form = (
    <Card className="w-full">
      {!embedded && (
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <MessageCircle className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-800">Criar conta</CardTitle>
          <p className="text-sm text-gray-500">Preencha os dados para acessar o CRM</p>
        </CardHeader>
      )}
      <CardContent className={embedded ? 'pt-6' : undefined}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" autoComplete="name" {...register('full_name')} />
            {errors.full_name && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.full_name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>
        {!embedded && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/auth?tab=login" className="font-semibold text-blue-600 hover:text-blue-700">
              Fazer login
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (embedded) return form

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">{form}</div>
    </div>
  )
}
