import { Link } from 'react-router-dom'
import {
  Bot,
  Flame,
  Frown,
  Meh,
  Smile,
  Sparkles,
  Thermometer,
} from 'lucide-react'
import type { Classificacao, Lead, Mensagem, Sentimento } from '@/integrations/supabase/types'
import {
  classificacaoBadgeClass,
  classificacaoLabel,
  sentimentoBadgeClass,
  sentimentoLabel,
} from '@/utils/labels'
import { formatRelativeContact } from '@/utils/relativeTime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SENTIMENT_ICONS: Record<Sentimento, typeof Smile> = {
  positivo: Smile,
  neutro: Meh,
  negativo: Frown,
}

const CLASSIFICATION_SCORE: Record<Classificacao, number> = {
  quente: 90,
  morno: 55,
  frio: 20,
}

interface ChatAiSidebarProps {
  lead: Lead
  messages: Mensagem[]
  suggestions: string[]
  onApplySuggestion: (text: string) => void
}

export function ChatAiSidebar({ lead, messages, suggestions, onApplySuggestion }: ChatAiSidebarProps) {
  const SentimentIcon = SENTIMENT_ICONS[lead.sentimento]
  const receivedWithSentiment = [...messages]
    .filter((m) => m.tipo === 'recebida')
    .slice(-3)
    .reverse()

  const score = CLASSIFICATION_SCORE[lead.classificacao]

  return (
    <aside className="hidden h-full w-[320px] shrink-0 flex-col border-l border-[#d1d7db] bg-white xl:flex">
      <header className="shrink-0 border-b border-[#e9edef] bg-[#f0f2f5] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#00a884]" />
          <div>
            <h2 className="font-semibold text-[#111b21]">Qualificação IA</h2>
            <p className="text-xs text-[#667781]">Análise em tempo real</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section className="rounded-xl border border-[#e9edef] bg-[#f9fafb] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#667781]">
            Classificação do lead
          </p>
          <div className="mb-3 flex items-center justify-between">
            <Badge className={cn('px-3 py-1 text-sm', classificacaoBadgeClass(lead.classificacao))}>
              {classificacaoLabel(lead.classificacao)}
            </Badge>
            <span className="text-2xl font-bold text-[#111b21]">{score}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e9edef]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                lead.classificacao === 'quente' && 'bg-red-500',
                lead.classificacao === 'morno' && 'bg-amber-400',
                lead.classificacao === 'frio' && 'bg-gray-400'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          {lead.classificacao === 'quente' && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <Flame className="h-3.5 w-3.5" />
              Prioridade alta — responda rapidamente
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[#e9edef] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#667781]">Sentimento</p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f2f5]">
              <SentimentIcon className="h-5 w-5 text-[#54656f]" />
            </div>
            <div>
              <Badge className={sentimentoBadgeClass(lead.sentimento)}>
                {sentimentoLabel(lead.sentimento)}
              </Badge>
              <p className="mt-1 text-xs text-[#667781]">Tom geral da conversa</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e9edef] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#667781]">Contexto</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[#667781]">Etapa</dt>
              <dd className="font-medium text-[#111b21]">{lead.etapa_pipeline}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#667781]">Origem</dt>
              <dd className="font-medium text-[#111b21]">{lead.origem}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#667781]">Última atividade</dt>
              <dd className="text-right text-xs text-[#111b21]">
                {formatRelativeContact(lead.atualizado_em)}
              </dd>
            </div>
          </dl>
        </section>

        {receivedWithSentiment.length > 0 && (
          <section className="rounded-xl border border-[#e9edef] p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#667781]">
              <Thermometer className="h-3.5 w-3.5" />
              Mensagens analisadas pela IA
            </p>
            <ul className="space-y-2">
              {receivedWithSentiment.map((msg) => (
                <li key={msg.id} className="rounded-lg bg-[#f0f2f5] p-2.5">
                  <p className="line-clamp-2 text-xs text-[#111b21]">{msg.conteudo}</p>
                  {msg.sentimento ? (
                    <Badge className={cn('mt-1.5 text-[10px]', sentimentoBadgeClass(msg.sentimento))}>
                      {sentimentoLabel(msg.sentimento)}
                    </Badge>
                  ) : (
                    <span className="mt-1.5 inline-block text-[10px] text-[#667781]">Analisando…</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {messages.some((m) => m.tipo === 'recebida' && !m.analisado) && (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Bot className="h-3.5 w-3.5 animate-pulse" />
            IA avaliando nova mensagem do lead…
          </p>
        )}

        <section className="rounded-xl border border-[#d1f4ea] bg-[#f0fdf9] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#008069]">
            <Bot className="h-3.5 w-3.5" />
            Sugestões de resposta
          </p>
          {suggestions.length === 0 ? (
            <p className="text-xs text-[#667781]">
              As sugestões aparecem após mensagens recebidas do lead.
            </p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onApplySuggestion(s)}
                    className="w-full rounded-lg border border-[#00a884]/20 bg-white px-3 py-2 text-left text-xs text-[#111b21] transition-colors hover:bg-[#e7f8f3]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="shrink-0 border-t border-[#e9edef] p-4">
        <Button asChild variant="outline" className="w-full">
          <Link to={`/leads/${lead.id}`}>Abrir ficha completa</Link>
        </Button>
      </footer>
    </aside>
  )
}
