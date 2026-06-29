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

export const signupSchema = z
  .object({
    full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type SignupFormData = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const equipeSchema = z.object({
  nome: z.string().min(1, 'Nome da equipe é obrigatório'),
})

export const templateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  tipo: z.enum(['boas_vindas', 'follow_up', 'lembrete']),
  ativo: z.boolean().default(true),
})
