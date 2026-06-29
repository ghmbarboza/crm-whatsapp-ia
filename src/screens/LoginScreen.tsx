import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, type LoginFormData } from '@/utils/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/loading'

export function LoginScreen() {
  const { signIn, user, loading } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  if (loading) return <LoadingSpinner className="min-h-screen" />
  if (user) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password)
      toast.success('Login realizado com sucesso')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Credenciais inválidas')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <MessageCircle className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-800">CRM WhatsApp IA</CardTitle>
          <p className="text-sm text-gray-500">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && (
                <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
