import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ForgotPasswordScreenProps {
  embedded?: boolean
}

export function ForgotPasswordScreen({ embedded }: ForgotPasswordScreenProps) {
  const { resetPassword } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await resetPassword(data.email)
      toast.success('Enviamos um link de recuperação para o seu e-mail')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar e-mail de recuperação')
    }
  }

  const form = (
    <Card className="w-full">
      {!embedded && (
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <MessageCircle className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-800">Recuperar senha</CardTitle>
          <p className="text-sm text-gray-500">
            Informe seu e-mail e enviaremos um link para redefinir a senha
          </p>
        </CardHeader>
      )}
      <CardContent className={embedded ? 'pt-6' : undefined}>
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
        {!embedded && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Lembrou a senha?{' '}
            <Link to="/auth?tab=login" className="font-semibold text-blue-600 hover:text-blue-700">
              Voltar ao login
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
