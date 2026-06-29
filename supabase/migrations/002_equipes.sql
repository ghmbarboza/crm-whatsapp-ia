CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER equipes_atualizado_em
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW EXECUTE FUNCTION public.atualizado_em_trig();

CREATE TABLE IF NOT EXISTS public.usuarios_equipe (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, equipe_id)
);

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipes_admin_all"
  ON public.equipes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "equipes_gestor_read"
  ON public.equipes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );

CREATE POLICY "usuarios_equipe_admin_all"
  ON public.usuarios_equipe FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "usuarios_equipe_gestor_read"
  ON public.usuarios_equipe FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );

CREATE OR REPLACE FUNCTION public.user_shares_team_with(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_equipe ue1
    JOIN public.usuarios_equipe ue2 ON ue1.equipe_id = ue2.equipe_id
    WHERE ue1.user_id = auth.uid() AND ue2.user_id = target_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
