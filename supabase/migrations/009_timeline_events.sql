CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'mudanca_etapa',
    'registro_resultado',
    'anotacao',
    'conversao',
    'atribuicao',
    'mensagem_recebida',
    'mensagem_enviada',
    'sugestao_ia_aceita',
    'anexo_enviado'
  )),
  dados JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_lead_id ON public.timeline_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_criado_em ON public.timeline_events(criado_em DESC);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_events_select"
  ON public.timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = timeline_events.lead_id
        AND l.deleted_at IS NULL
        AND (
          l.responsavel_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor')
            AND public.user_shares_team_with(l.responsavel_id)
          )
        )
    )
  );

CREATE POLICY "timeline_events_insert"
  ON public.timeline_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = timeline_events.lead_id
        AND l.deleted_at IS NULL
        AND (
          l.responsavel_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
        )
    )
  );
