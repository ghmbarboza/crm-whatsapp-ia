import { z } from 'zod'
import { phoneRegex } from './formatPhone'

export const leadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().regex(phoneRegex, 'Telefone inválido. Use (99) 99999-9999'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  empresa: z.string().optional(),
  classificacao: z.enum(['quente', 'morno', 'frio']),
  sentimento: z.enum(['positivo', 'neutro', 'negativo']),
  etapa_pipeline: z.enum(['Novo', 'Em Contato', 'Qualificado', 'Fechado']),
  responsavel_id: z.string().uuid().optional().nullable(),
  anotacoes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
})

export type LeadFormData = z.infer<typeof leadSchema>

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const equipeSchema = z.object({
  nome: z.string().min(1, 'Nome da equipe é obrigatório'),
})

export const templateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  tipo: z.enum(['boas_vindas', 'follow_up', 'lembrete']),
  ativo: z.boolean().default(true),
})
