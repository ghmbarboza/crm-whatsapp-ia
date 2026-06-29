-- System preferences, custom pipeline stages, backups and config audit

CREATE TABLE IF NOT EXISTS public.system_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paleta_cores TEXT NOT NULL DEFAULT 'azul'
    CHECK (paleta_cores IN ('azul', 'verde', 'vermelho')),
  idioma TEXT NOT NULL DEFAULT 'pt-BR',
  horario_local TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  logo_url TEXT,
  mensagem_padrao TEXT NOT NULL DEFAULT 'Olá {{nome}}! Bem-vindo ao nosso CRM. Etapa atual: {{etapa}}.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER system_preferences_updated_at
  BEFORE UPDATE ON public.system_preferences
  FOR EACH ROW EXECUTE FUNCTION public.updated_at_trig();

CREATE TABLE IF NOT EXISTS public.custom_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_url TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.config_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  area TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_change_logs_created ON public.config_change_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created ON public.backup_logs (created_at DESC);

ALTER TABLE public.system_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_preferences_admin_all
  ON public.system_preferences FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY system_preferences_gestor_read
  ON public.system_preferences FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')));

CREATE POLICY custom_stages_admin_all
  ON public.custom_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY custom_stages_read_authenticated
  ON public.custom_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY backup_logs_admin_all
  ON public.backup_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY backup_logs_gestor_read
  ON public.backup_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')));

CREATE POLICY config_change_logs_admin_gestor_read
  ON public.config_change_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor')));

CREATE POLICY config_change_logs_insert
  ON public.config_change_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS variaveis JSONB NOT NULL DEFAULT '["nome","etapa","data"]'::jsonb;

ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE POLICY message_templates_gestor_all
  ON public.message_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor'));

INSERT INTO public.system_preferences (paleta_cores, idioma, horario_local, mensagem_padrao)
SELECT 'azul', 'pt-BR', 'America/Sao_Paulo', 'Olá {{nome}}! Bem-vindo ao nosso CRM. Etapa atual: {{etapa}}.'
WHERE NOT EXISTS (SELECT 1 FROM public.system_preferences LIMIT 1);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576;

CREATE POLICY branding_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY branding_admin_upload
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY branding_admin_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY branding_admin_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.log_config_change(
  p_area TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.config_change_logs (user_id, area, action, details)
  VALUES (auth.uid(), p_area, p_action, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_config_change TO authenticated;
