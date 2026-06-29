import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface PerfilForm {
  full_name: string
  email: string
}

export function PerfilScreen() {
  const { profile, user } = useAuth()
  const { register, handleSubmit } = useForm<PerfilForm>({
    defaultValues: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
    },
  })

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const onSubmit = async (data: PerfilForm) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name })
      .eq('id', user.id)
    if (error) {
      toast.error('Erro ao atualizar perfil')
      return
    }
    toast.success('Perfil atualizado com sucesso')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{profile?.full_name}</CardTitle>
              <Badge variant="outline" className="mt-1 capitalize">{profile?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" {...register('full_name')} />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" disabled {...register('email')} />
              <p className="mt-1 text-xs text-gray-500">O e-mail não pode ser alterado</p>
            </div>
            <Button type="submit">Salvar alterações</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
