# Seed data instructions
# Run AFTER creating users in Supabase Auth Dashboard

-- 1. Create users via Supabase Auth (email/password):
--    admin@crm.demo / Admin123!
--    gestor@crm.demo / Gestor123!
--    operacional1@crm.demo / Oper123!
--    operacional2@crm.demo / Oper123!

-- 2. Update profiles with roles (trigger creates profiles on signup):
UPDATE public.profiles SET role = 'admin', full_name = 'Priscila Admin' WHERE email = 'admin@crm.demo';
UPDATE public.profiles SET role = 'gestor', full_name = 'Ricardo Gestor' WHERE email = 'gestor@crm.demo';
UPDATE public.profiles SET role = 'operacional', full_name = 'Mariana Vendedora' WHERE email = 'operacional1@crm.demo';
UPDATE public.profiles SET role = 'operacional', full_name = 'Carlos Vendedor' WHERE email = 'operacional2@crm.demo';

-- 3. Associate team members
INSERT INTO public.usuarios_equipe (user_id, equipe_id)
SELECT p.id, e.id
FROM public.profiles p
CROSS JOIN public.equipes e
WHERE e.nome = 'Equipe Comercial Demo'
  AND p.email IN ('gestor@crm.demo', 'operacional1@crm.demo', 'operacional2@crm.demo')
ON CONFLICT DO NOTHING;

-- 4. Demo leads
INSERT INTO public.leads (nome, telefone, email, classificacao, sentimento, etapa_pipeline, origem, responsavel_id, user_id)
SELECT
  'João Silva',
  '(11) 98765-4321',
  'joao@email.com',
  'quente',
  'positivo',
  'Novo',
  'WhatsApp',
  p.id,
  p.id
FROM public.profiles p WHERE p.email = 'operacional1@crm.demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (nome, telefone, classificacao, sentimento, etapa_pipeline, origem, responsavel_id, user_id)
SELECT
  'Maria Santos',
  '(21) 97654-3210',
  'morno',
  'neutro',
  'Em Contato',
  'WhatsApp',
  p.id,
  p.id
FROM public.profiles p WHERE p.email = 'operacional1@crm.demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (nome, telefone, classificacao, sentimento, etapa_pipeline, origem, responsavel_id, user_id)
SELECT
  'Pedro Costa',
  '(31) 96543-2109',
  'frio',
  'negativo',
  'Qualificado',
  'Manual',
  p.id,
  p.id
FROM public.profiles p WHERE p.email = 'operacional2@crm.demo'
ON CONFLICT DO NOTHING;
