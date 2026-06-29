-- Reports views, NPS, activity aggregation and extended audit access

CREATE OR REPLACE VIEW public.lead_reports AS
SELECT
  l.id AS lead_id,
  l.nome,
  l.telefone,
  l.email,
  l.etapa_pipeline,
  l.classificacao,
  l.sentimento,
  l.responsavel_id,
  p.full_name AS vendedor_nome,
  ue.equipe_id,
  e.nome AS equipe_nome,
  l.origem,
  l.anotacoes,
  l.criado_em,
  l.atualizado_em
FROM public.leads l
LEFT JOIN public.profiles p ON p.id = l.responsavel_id
LEFT JOIN public.usuarios_equipe ue ON ue.user_id = l.responsavel_id
LEFT JOIN public.equipes e ON e.id = ue.equipe_id
WHERE l.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.activity_logs AS
SELECT
  al.id,
  al.acao AS event_type,
  al.entidade_id AS entity_id,
  al.user_id,
  al.acao || ' — ' || al.entidade AS description,
  al.criado_em AS created_at,
  al.entidade AS entity_type,
  'user_action'::text AS log_category,
  NULL::text AS status
FROM public.audit_logs al
UNION ALL
SELECT
  il.id,
  il.event AS event_type,
  NULL::uuid AS entity_id,
  il.user_id,
  COALESCE(il.description, il.event) AS description,
  il.timestamp AS created_at,
  'integration'::text AS entity_type,
  'system'::text AS log_category,
  il.status
FROM public.integration_logs il
UNION ALL
SELECT
  crl.id,
  crl.action AS event_type,
  NULL::uuid AS entity_id,
  crl.admin_id AS user_id,
  crl.action AS description,
  crl.timestamp AS created_at,
  'classification'::text AS entity_type,
  'system'::text AS log_category,
  NULL::text AS status
FROM public.classification_review_logs crl;

CREATE TABLE IF NOT EXISTS public.nps_survey_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  respondent_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  report_type TEXT NOT NULL DEFAULT 'performance',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY nps_admin_gestor_read
  ON public.nps_survey_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY nps_admin_insert
  ON public.nps_survey_results FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY report_schedules_admin_gestor
  ON public.report_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY audit_logs_gestor_select
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor')
    AND (
      user_id = auth.uid()
      OR user_id IN (
        SELECT ue2.user_id
        FROM public.usuarios_equipe ue1
        JOIN public.usuarios_equipe ue2 ON ue1.equipe_id = ue2.equipe_id
        WHERE ue1.user_id = auth.uid()
      )
    )
  );

CREATE POLICY audit_logs_operacional_select
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operacional')
    AND user_id = auth.uid()
  );

GRANT SELECT ON public.lead_reports TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
