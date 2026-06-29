CREATE TABLE IF NOT EXISTS public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('lead_quente')),
  enviado BOOLEAN DEFAULT FALSE,
  enviado_em TIMESTAMPTZ,
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_select"
  ON public.alertas FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = alertas.lead_id AND l.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "alertas_update_own"
  ON public.alertas FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );

CREATE OR REPLACE FUNCTION public.check_daily_alerts_limit()
RETURNS TRIGGER AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO daily_count
  FROM public.alertas
  WHERE criado_em >= date_trunc('day', now());
  IF daily_count >= 50 THEN
    RAISE EXCEPTION 'Limite de 50 alertas por dia atingido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alertas_daily_limit
  BEFORE INSERT ON public.alertas
  FOR EACH ROW EXECUTE FUNCTION public.check_daily_alerts_limit();
