CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  empresa TEXT,
  origem TEXT DEFAULT 'WhatsApp',
  classificacao TEXT NOT NULL CHECK (classificacao IN ('quente', 'morno', 'frio')) DEFAULT 'frio',
  sentimento TEXT NOT NULL CHECK (sentimento IN ('positivo', 'neutro', 'negativo')) DEFAULT 'neutro',
  etapa_pipeline TEXT NOT NULL CHECK (etapa_pipeline IN ('Novo', 'Em Contato', 'Qualificado', 'Fechado')) DEFAULT 'Novo',
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  anotacoes TEXT CHECK (char_length(COALESCE(anotacoes, '')) <= 1000),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER leads_atualizado_em
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.atualizado_em_trig();

CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  lead_count INTEGER;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = NEW.responsavel_id;
  IF user_role = 'operacional' THEN
    SELECT COUNT(*) INTO lead_count
    FROM public.leads
    WHERE responsavel_id = NEW.responsavel_id AND deleted_at IS NULL;
    IF lead_count >= 100 THEN
      RAISE EXCEPTION 'Limite de 100 leads por operador atingido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_limit_check
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.check_lead_limit();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select"
  ON public.leads FOR SELECT
  USING (
    deleted_at IS NULL AND (
      responsavel_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor')
        AND public.user_shares_team_with(responsavel_id)
      )
    )
  );

CREATE POLICY "leads_insert"
  ON public.leads FOR INSERT
  WITH CHECK (
    deleted_at IS NULL AND (
      responsavel_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    )
  );

CREATE POLICY "leads_update"
  ON public.leads FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      responsavel_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor')
        AND public.user_shares_team_with(responsavel_id)
      )
    )
  );

CREATE POLICY "leads_soft_delete_admin_gestor"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );
