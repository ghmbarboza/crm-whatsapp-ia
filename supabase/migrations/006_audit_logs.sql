CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  detalhes JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_audit(
  p_acao TEXT,
  p_entidade TEXT,
  p_entidade_id UUID DEFAULT NULL,
  p_detalhes JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, acao, entidade, entidade_id, detalhes)
  VALUES (auth.uid(), p_acao, p_entidade, p_entidade_id, p_detalhes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
