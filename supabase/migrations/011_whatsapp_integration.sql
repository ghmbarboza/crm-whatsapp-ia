-- WhatsApp integration settings, numbers and audit logs

CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected')),
  parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.updated_at_trig();

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'info')),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON public.integration_logs (timestamp DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_team_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_settings_admin_all
  ON public.integration_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY integration_settings_gestor_read
  ON public.integration_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY integration_logs_admin_insert
  ON public.integration_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY integration_logs_read_roles
  ON public.integration_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY whatsapp_numbers_admin_all
  ON public.whatsapp_numbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY whatsapp_numbers_gestor_read
  ON public.whatsapp_numbers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')
    )
  );

INSERT INTO public.integration_settings (type, status, parameters_json)
VALUES (
  'whatsapp',
  'disconnected',
  jsonb_build_object(
    'auto_message', 'Olá {{nome}}, recebemos sua mensagem! Etapa: {{etapa}}. Retornaremos em breve.',
    'business_hours', jsonb_build_object(
      'monday', jsonb_build_object('enabled', true, 'start', '09:00', 'end', '18:00'),
      'tuesday', jsonb_build_object('enabled', true, 'start', '09:00', 'end', '18:00'),
      'wednesday', jsonb_build_object('enabled', true, 'start', '09:00', 'end', '18:00'),
      'thursday', jsonb_build_object('enabled', true, 'start', '09:00', 'end', '18:00'),
      'friday', jsonb_build_object('enabled', true, 'start', '09:00', 'end', '18:00'),
      'saturday', jsonb_build_object('enabled', false, 'start', '09:00', 'end', '13:00'),
      'sunday', jsonb_build_object('enabled', false, 'start', '09:00', 'end', '13:00')
    )
  )
)
ON CONFLICT (type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.log_integration_event(
  p_event TEXT,
  p_status TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.integration_logs (event, status, description, user_id)
  VALUES (p_event, p_status, p_description, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_integration_event TO authenticated;
