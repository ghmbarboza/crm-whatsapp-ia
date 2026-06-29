import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { leadSchema, type LeadFormData } from '@/utils/validators'
import { formatPhone } from '@/utils/formatPhone'
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads'
import { findLeadByPhone } from '@/services/leadsService'
import type { Lead } from '@/integrations/supabase/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  defaultStage?: LeadFormData['etapa_pipeline']
}

export function LeadFormDialog({ open, onOpenChange, lead, defaultStage = 'Novo' }: LeadFormDialogProps) {
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      classificacao: 'frio',
      sentimento: 'neutro',
      etapa_pipeline: 'Novo',
    },
  })

  useEffect(() => {
    if (lead) {
      reset({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || '',
        empresa: lead.empresa || '',
        classificacao: lead.classificacao,
        sentimento: lead.sentimento,
        etapa_pipeline: lead.etapa_pipeline,
        anotacoes: lead.anotacoes || '',
      })
    } else {
      reset({
        nome: '',
        telefone: '',
        email: '',
        empresa: '',
        classificacao: 'frio',
        sentimento: 'neutro',
        etapa_pipeline: defaultStage,
        anotacoes: '',
      })
    }
  }, [lead, reset, open, defaultStage])

  const onSubmit = async (data: LeadFormData) => {
    if (!lead) {
      const existing = await findLeadByPhone(data.telefone)
      if (existing) {
        const confirm = window.confirm(
          `Já existe um lead com este telefone (${existing.nome}). Deseja atualizar o registro existente em vez de criar um duplicado?`
        )
        if (confirm) {
          await updateLead.mutateAsync({
            id: existing.id,
            updates: {
              nome: data.nome,
              email: data.email || null,
              empresa: data.empresa || null,
              classificacao: data.classificacao,
              sentimento: data.sentimento,
              etapa_pipeline: data.etapa_pipeline,
              anotacoes: data.anotacoes || null,
            },
          })
          onOpenChange(false)
          return
        }
        return
      }
    }

    const payload = {
      ...data,
      email: data.email || null,
      empresa: data.empresa || null,
      anotacoes: data.anotacoes || null,
      origem: lead?.origem || 'Manual',
    }

    if (lead) {
      await updateLead.mutateAsync({ id: lead.id, updates: payload })
    } else {
      await createLead.mutateAsync(payload as Parameters<typeof createLead.mutateAsync>[0])
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <ErrorMsg msg={errors.nome.message} />}
          </div>
          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              {...register('telefone')}
              onChange={(e) => setValue('telefone', formatPhone(e.target.value))}
            />
            {errors.telefone && <ErrorMsg msg={errors.telefone.message} />}
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <ErrorMsg msg={errors.email.message} />}
          </div>
          <div>
            <Label htmlFor="empresa">Empresa</Label>
            <Input id="empresa" {...register('empresa')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Classificação</Label>
              <Select value={watch('classificacao')} onValueChange={(v) => setValue('classificacao', v as LeadFormData['classificacao'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quente">Quente</SelectItem>
                  <SelectItem value="morno">Morno</SelectItem>
                  <SelectItem value="frio">Frio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sentimento</Label>
              <Select value={watch('sentimento')} onValueChange={(v) => setValue('sentimento', v as LeadFormData['sentimento'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positivo">Positivo</SelectItem>
                  <SelectItem value="neutro">Neutro</SelectItem>
                  <SelectItem value="negativo">Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Etapa Pipeline</Label>
            <Select value={watch('etapa_pipeline')} onValueChange={(v) => setValue('etapa_pipeline', v as LeadFormData['etapa_pipeline'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Em Contato">Em Contato</SelectItem>
                <SelectItem value="Qualificado">Qualificado</SelectItem>
                <SelectItem value="Fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="anotacoes">Anotações</Label>
            <Textarea id="anotacoes" maxLength={1000} {...register('anotacoes')} />
            {errors.anotacoes && <ErrorMsg msg={errors.anotacoes.message} />}
          </div>
          <Button type="submit" className="w-full">
            {lead ? 'Salvar' : 'Criar Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
      <AlertCircle className="h-3 w-3" />
      {msg}
    </p>
  )
}
