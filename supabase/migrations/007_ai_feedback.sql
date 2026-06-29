CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  mensagem_id UUID REFERENCES public.mensagens_whatsapp(id) ON DELETE SET NULL,
  classificacao_ia TEXT NOT NULL CHECK (classificacao_ia IN ('quente', 'morno', 'frio')),
  classificacao_manual TEXT CHECK (classificacao_manual IN ('quente', 'morno', 'frio')),
  sentimento_ia TEXT CHECK (sentimento_ia IN ('positivo', 'neutro', 'negativo')),
  sentimento_manual TEXT CHECK (sentimento_manual IN ('positivo', 'neutro', 'negativo')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feedback_select"
  ON public.ai_feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR user_id = auth.uid()
  );

CREATE POLICY "ai_feedback_insert"
  ON public.ai_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Message templates (Phase 3)
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('boas_vindas', 'follow_up', 'lembrete')),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER message_templates_atualizado_em
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.atualizado_em_trig();

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_templates_admin"
  ON public.message_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "message_templates_read_all"
  ON public.message_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND ativo = TRUE);

INSERT INTO public.message_templates (nome, conteudo, tipo) VALUES
  ('Boas-vindas', 'Olá! Obrigado pelo contato. Em breve um de nossos consultores irá atendê-lo.', 'boas_vindas'),
  ('Follow-up', 'Olá! Gostaríamos de saber se ainda tem interesse em nossos serviços.', 'follow_up'),
  ('Lembrete', 'Lembrete: temos uma proposta especial aguardando sua resposta.', 'lembrete');
