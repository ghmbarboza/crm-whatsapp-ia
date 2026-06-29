-- Fix infinite recursion in profiles RLS (policies subquerying profiles caused 500 errors)

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_gestor_team" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_user_role() IN ('admin', 'gestor')
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "profiles_update_gestor_team"
  ON public.profiles FOR UPDATE
  USING (
    public.get_user_role() = 'gestor'
    AND public.user_shares_team_with(id)
  )
  WITH CHECK (
    public.get_user_role() = 'gestor'
    AND public.user_shares_team_with(id)
  );

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR public.get_user_role() = 'admin'
  );
