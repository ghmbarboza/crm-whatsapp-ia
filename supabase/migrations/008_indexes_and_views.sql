-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_etapa_atualizado ON public.leads (etapa_pipeline, atualizado_em DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON public.leads (responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON public.leads (classificacao) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mensagens_lead_timestamp ON public.mensagens_whatsapp (lead_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_user_criado ON public.alertas (user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_criado ON public.audit_logs (criado_em DESC);

-- Dashboard views
CREATE OR REPLACE VIEW public.v_leads_por_etapa AS
SELECT etapa_pipeline, COUNT(*) AS total
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY etapa_pipeline;

CREATE OR REPLACE VIEW public.v_leads_por_classificacao AS
SELECT classificacao, COUNT(*) AS total
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY classificacao;

CREATE OR REPLACE VIEW public.v_leads_por_sentimento AS
SELECT sentimento, COUNT(*) AS total
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY sentimento;

CREATE OR REPLACE VIEW public.v_tempo_medio_resposta AS
SELECT
  AVG(EXTRACT(EPOCH FROM (r.timestamp - e.timestamp))) AS segundos_medio
FROM public.mensagens_whatsapp e
JOIN public.mensagens_whatsapp r ON r.lead_id = e.lead_id
  AND r.tipo = 'enviada'
  AND r.timestamp > e.timestamp
WHERE e.tipo = 'recebida';

-- Storage bucket for chat attachments (5MB limit enforced in policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_attachments_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_attachments_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (metadata->>'size')::bigint <= 5242880
  );

-- Seed demo data (profiles must exist in auth.users first - documented in seed.sql)
-- Demo equipe
INSERT INTO public.equipes (nome) VALUES ('Equipe Comercial Demo')
ON CONFLICT (nome) DO NOTHING;
