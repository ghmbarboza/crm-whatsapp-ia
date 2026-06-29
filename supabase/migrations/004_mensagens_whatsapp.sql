CREATE TABLE IF NOT EXISTS public.mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  enviado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  anexo_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  tipo TEXT NOT NULL CHECK (tipo IN ('recebida', 'enviada')),
  sentimento TEXT CHECK (sentimento IN ('positivo', 'neutro', 'negativo')),
  analisado BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensagens_select"
  ON public.mensagens_whatsapp FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = mensagens_whatsapp.lead_id
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

CREATE POLICY "mensagens_insert"
  ON public.mensagens_whatsapp FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = mensagens_whatsapp.lead_id
        AND l.deleted_at IS NULL
        AND (
          l.responsavel_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
        )
    )
  );

-- Messages are immutable: no UPDATE or DELETE policies
