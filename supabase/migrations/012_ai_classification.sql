-- AI classification settings, auto-classification history and review logs

CREATE TABLE IF NOT EXISTS public.ai_classification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  param_name TEXT NOT NULL UNIQUE,
  param_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER ai_classification_settings_updated_at
  BEFORE UPDATE ON public.ai_classification_settings
  FOR EACH ROW EXECUTE FUNCTION public.updated_at_trig();

CREATE TABLE IF NOT EXISTS public.lead_auto_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  classification_enum TEXT NOT NULL CHECK (classification_enum IN ('quente', 'morno', 'frio')),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positivo', 'neutro', 'negativo')),
  trigger_source TEXT NOT NULL DEFAULT 'ai_classify',
  classifier_version TEXT NOT NULL DEFAULT '1.0.0',
  initial_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_auto_classifications_created
  ON public.lead_auto_classifications (created_at DESC);

CREATE TABLE IF NOT EXISTS public.classification_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  example_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classification_review_logs_ts
  ON public.classification_review_logs (timestamp DESC);

ALTER TABLE public.ai_classification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_auto_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_classification_settings_admin
  ON public.ai_classification_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY lead_auto_classifications_admin_read
  ON public.lead_auto_classifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY classification_review_logs_admin
  ON public.classification_review_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

INSERT INTO public.ai_classification_settings (param_name, param_value) VALUES
  ('sentiment_sensitivity', '0.5'::jsonb),
  ('threshold_quente', '0.7'::jsonb),
  ('threshold_morno', '0.4'::jsonb),
  ('positive_sentiment_ratio', '0.6'::jsonb),
  ('min_messages_volume', '1'::jsonb),
  ('keywords_quente', '["comprar","urgente","interessado","orçamento","preço","contratar"]'::jsonb),
  ('keywords_frio', '["não tenho interesse","cancelar","spam","pare"]'::jsonb),
  ('trigger_notify_quente', 'true'::jsonb),
  ('trigger_notify_morno', 'false'::jsonb),
  ('trigger_notify_frio', 'false'::jsonb),
  ('auto_message_preview', '"Olá {{nome}}! Identificamos interesse na etapa {{etapa}}. Em breve entraremos em contato."'::jsonb),
  ('classifier_version', '"1.0.0"'::jsonb)
ON CONFLICT (param_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.log_classification_review(
  p_action TEXT,
  p_example_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.classification_review_logs (admin_id, action, example_data)
  VALUES (auth.uid(), p_action, p_example_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_classification_review TO authenticated;
