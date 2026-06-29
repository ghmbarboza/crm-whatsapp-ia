import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Undo2,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import {
  classificationKeys,
  DEFAULT_AI_SETTINGS,
  fetchAIClassificationSettings,
  saveAIClassificationSettings,
  restoreAIClassificationSettings,
  fetchRecentAutoClassifications,
  fetchClassificationReviewLogs,
  reviewClassification,
  previewClassification,
  previewAutoMessage,
  validateAISettings,
  exportReviewLogsCsv,
  REVIEW_ACTION_LABELS,
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
  type UndoSnapshot,
} from '@/services/classificationAIService'
import type { AIClassificationSettings, LeadAutoClassification } from '@/integrations/supabase/types'
import { formatDateTime } from '@/utils/dates'
import {
  classificacaoBadgeClass,
  classificacaoLabel,
  sentimentoBadgeClass,
  sentimentoLabel,
} from '@/utils/labels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const SAMPLE_MESSAGE = 'Olá, estou interessado em comprar urgente. Qual o preço?'

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-blue-700">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer accent-blue-600 disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function KeywordList({
  title,
  keywords,
  onChange,
  disabled,
}: {
  title: string
  keywords: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const word = draft.trim().toLowerCase()
    if (!word) return
    if (keywords.some((k) => k.toLowerCase() === word)) {
      toast.error('Palavra-chave já existe')
      return
    }
    onChange([...keywords, draft.trim()])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <Badge key={k} variant="outline" className="gap-1 pr-1">
            {k}
            {!disabled && (
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-gray-200"
                onClick={() => onChange(keywords.filter((w) => w !== k))}
                aria-label={`Remover ${k}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {keywords.length === 0 && (
          <span className="text-sm text-gray-400">Nenhuma palavra-chave definida</span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Nova palavra-chave"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          />
          <Button type="button" variant="outline" size="icon" onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ClassificationAIConfigPage() {
  const queryClient = useQueryClient()
  const submitLock = useRef(false)
  const [settings, setSettings] = useState<AIClassificationSettings>(DEFAULT_AI_SETTINGS)
  const [savedSnapshot, setSavedSnapshot] = useState<AIClassificationSettings>(DEFAULT_AI_SETTINGS)
  const [undoStack, setUndoStack] = useState<UndoSnapshot | null>(null)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0)
  const [sampleMessage, setSampleMessage] = useState(SAMPLE_MESSAGE)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [savedPulse, setSavedPulse] = useState(false)

  const {
    data: fetchedSettings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: classificationKeys.settings,
    queryFn: fetchAIClassificationSettings,
    retry: 2,
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: classificationKeys.history,
    queryFn: () => fetchRecentAutoClassifications(50),
  })

  const { data: reviewLogs, isLoading: logsLoading } = useQuery({
    queryKey: classificationKeys.reviewLogs,
    queryFn: () => fetchClassificationReviewLogs(100),
  })

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings)
      setSavedSnapshot(fetchedSettings)
      setConnectionError(null)
    }
  }, [fetchedSettings])

  useEffect(() => {
    if (isError) setConnectionError('Falha ao carregar critérios IA. Verifique a conexão.')
  }, [isError])

  useEffect(() => {
    const channel = supabase
      .channel('ai-classification-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_classification_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: classificationKeys.settings })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_auto_classifications' }, () => {
        queryClient.invalidateQueries({ queryKey: classificationKeys.history })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  useEffect(() => {
    if (!undoStack) {
      setUndoSecondsLeft(0)
      return
    }
    const tick = () => {
      const elapsed = Date.now() - undoStack.changedAt
      const left = Math.max(0, 60 - Math.floor(elapsed / 1000))
      setUndoSecondsLeft(left)
      if (left <= 0) setUndoStack(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [undoStack])

  const preview = useMemo(
    () => previewClassification(sampleMessage, settings),
    [sampleMessage, settings]
  )
  const messagePreview = useMemo(
    () => previewAutoMessage(settings.auto_message_preview),
    [settings.auto_message_preview]
  )

  const validationError = useMemo(() => validateAISettings(settings), [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (submitLock.current) throw new Error('Salvamento em andamento')
      submitLock.current = true
      await saveAIClassificationSettings(settings, savedSnapshot)
    },
    onSuccess: () => {
      setUndoStack({ settings: savedSnapshot, changedAt: Date.now() })
      setSavedSnapshot(settings)
      queryClient.invalidateQueries({ queryKey: classificationKeys.settings })
      queryClient.invalidateQueries({ queryKey: classificationKeys.reviewLogs })
      setSavedPulse(true)
      setTimeout(() => setSavedPulse(false), 1200)
      toast.success('Critérios IA atualizados')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
    onSettled: () => {
      submitLock.current = false
    },
  })

  const undoMutation = useMutation({
    mutationFn: () => restoreAIClassificationSettings(undoStack!.settings),
    onSuccess: () => {
      setSettings(undoStack!.settings)
      setSavedSnapshot(undoStack!.settings)
      setUndoStack(null)
      queryClient.invalidateQueries({ queryKey: classificationKeys.settings })
      queryClient.invalidateQueries({ queryKey: classificationKeys.reviewLogs })
      toast.success('Alteração desfeita')
    },
    onError: () => toast.error('Falha ao desfazer'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, approved, record }: { id: string; approved: boolean; record: LeadAutoClassification }) =>
      reviewClassification(id, approved, record),
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: classificationKeys.reviewLogs })
      toast.success(approved ? 'Classificação aprovada' : 'Classificação rejeitada')
    },
    onError: () => toast.error('Falha ao registrar revisão'),
  })

  const exportLogs = () => {
    if (!reviewLogs?.length) {
      toast.error('Nenhum log para exportar')
      return
    }
    const csv = exportReviewLogsCsv(reviewLogs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `classification-review-logs-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Logs exportados')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const hasNoSettings = !fetchedSettings && !isError

  return (
    <div className="space-y-6">
      {connectionError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm">{connectionError}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Settings2 className="h-7 w-7 text-blue-700" />
            Classificação Automática IA
          </h2>
          <p className="text-sm text-gray-500">
            Ajuste sensibilidade, palavras-chave e gatilhos — aplica-se apenas a leads futuros
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {undoStack && undoSecondsLeft > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
            >
              <Undo2 className="mr-1 h-4 w-4" />
              Desfazer ({undoSecondsLeft}s)
            </Button>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !!validationError}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Salvar critérios
          </Button>
        </div>
      </div>

      {hasNoSettings ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-white p-12 text-center">
          <Sparkles className="h-12 w-12 text-blue-500" />
          <h3 className="text-lg font-semibold">Automatize a qualificação de leads</h3>
          <p className="max-w-md text-sm text-gray-500">
            Configure critérios para classificar leads como quente, morno ou frio automaticamente,
            economizando tempo da equipe comercial.
          </p>
          <Button onClick={() => saveMutation.mutate()}>Definir primeiro critério</Button>
        </div>
      ) : (
        <Tabs defaultValue="criteria" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="criteria">Critérios</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="logs">Logs de Ajuste</TabsTrigger>
          </TabsList>

          <TabsContent value="criteria" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-5 rounded-lg border bg-white p-4 shadow-sm md:p-6">
                <h3 className="font-semibold text-gray-900">Sensibilidade e thresholds</h3>
                <RangeField
                  label="Sensibilidade de sentimento"
                  value={settings.sentiment_sensitivity}
                  min={SENSITIVITY_MIN}
                  max={SENSITIVITY_MAX}
                  step={0.05}
                  disabled={saveMutation.isPending}
                  onChange={(v) => setSettings((s) => ({ ...s, sentiment_sensitivity: v }))}
                />
                <RangeField
                  label="Threshold quente"
                  value={settings.threshold_quente}
                  min={THRESHOLD_MIN}
                  max={THRESHOLD_MAX}
                  step={0.05}
                  disabled={saveMutation.isPending}
                  onChange={(v) => setSettings((s) => ({ ...s, threshold_quente: v }))}
                />
                <RangeField
                  label="Threshold morno"
                  value={settings.threshold_morno}
                  min={THRESHOLD_MIN}
                  max={THRESHOLD_MAX}
                  step={0.05}
                  disabled={saveMutation.isPending}
                  onChange={(v) => setSettings((s) => ({ ...s, threshold_morno: v }))}
                />
                <div>
                  <Label>Volume mínimo de mensagens</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.min_messages_volume}
                    disabled={saveMutation.isPending}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, min_messages_volume: parseInt(e.target.value, 10) || 1 }))
                    }
                    className="mt-1 w-32"
                  />
                </div>
                {validationError && (
                  <p className="text-sm text-red-600">{validationError}</p>
                )}
              </section>

              <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm md:p-6">
                <h3 className="font-semibold text-gray-900">Preview ao vivo</h3>
                <Label>Mensagem de teste</Label>
                <Textarea
                  value={sampleMessage}
                  onChange={(e) => setSampleMessage(e.target.value)}
                  rows={3}
                  disabled={saveMutation.isPending}
                />
                <div className="rounded-md bg-gray-50 p-4 transition-all duration-300">
                  <p className="mb-2 text-xs font-medium uppercase text-gray-500">Resultado simulado</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        classificacaoBadgeClass(preview.classificacao),
                        savedPulse && 'scale-110 transition-transform duration-300'
                      )}
                    >
                      {classificacaoLabel(preview.classificacao)}
                    </Badge>
                    <Badge className={sentimentoBadgeClass(preview.sentimento)}>
                      {sentimentoLabel(preview.sentimento)}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                  Editar critério avançado
                </Button>
              </section>
            </div>

            <section className="grid gap-6 rounded-lg border bg-white p-4 shadow-sm md:p-6 lg:grid-cols-2">
              <KeywordList
                title="Palavras-chave — Quente"
                keywords={settings.keywords_quente}
                disabled={saveMutation.isPending}
                onChange={(keywords_quente) => setSettings((s) => ({ ...s, keywords_quente }))}
              />
              <KeywordList
                title="Palavras-chave — Frio"
                keywords={settings.keywords_frio}
                disabled={saveMutation.isPending}
                onChange={(keywords_frio) => setSettings((s) => ({ ...s, keywords_frio }))}
              />
            </section>

            <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Gatilhos de notificação</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ['trigger_notify_quente', 'Lead quente notifica equipe'],
                    ['trigger_notify_morno', 'Lead morno notifica'],
                    ['trigger_notify_frio', 'Lead frio notifica'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={settings[key]}
                      disabled={saveMutation.isPending}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: !!v }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
              <h3 className="mb-2 font-semibold text-gray-900">Mensagem automática (preview)</h3>
              <Textarea
                value={settings.auto_message_preview}
                disabled={saveMutation.isPending}
                rows={3}
                onChange={(e) => setSettings((s) => ({ ...s, auto_message_preview: e.target.value }))}
              />
              <div className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                {messagePreview}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="history">
            <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
              {historyLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : !history?.length ? (
                <EmptyState message="Nenhuma classificação automática registrada ainda." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3">Lead</th>
                        <th className="p-3">Mensagem inicial</th>
                        <th className="p-3">Classificação</th>
                        <th className="p-3">Sentimento</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Revisar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-3 font-medium">{row.leads?.nome ?? '—'}</td>
                          <td className="max-w-xs truncate p-3 text-gray-600" title={row.initial_message ?? ''}>
                            {row.initial_message ?? '—'}
                          </td>
                          <td className="p-3">
                            <Badge className={classificacaoBadgeClass(row.classification_enum)}>
                              {classificacaoLabel(row.classification_enum)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={sentimentoBadgeClass(row.sentiment)}>
                              {sentimentoLabel(row.sentiment)}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap text-gray-500">
                            {formatDateTime(row.created_at)}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Aprovar"
                                disabled={reviewMutation.isPending}
                                onClick={() =>
                                  reviewMutation.mutate({ id: row.id, approved: true, record: row })
                                }
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Recusar"
                                disabled={reviewMutation.isPending}
                                onClick={() =>
                                  reviewMutation.mutate({ id: row.id, approved: false, record: row })
                                }
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="logs">
            <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4 flex justify-end">
                <Button variant="outline" onClick={exportLogs}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
              {logsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : !reviewLogs?.length ? (
                <EmptyState message="Nenhum log de ajuste registrado." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3">Data</th>
                        <th className="p-3">Ação</th>
                        <th className="p-3">Admin</th>
                        <th className="p-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewLogs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="p-3 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                          <td className="p-3">{REVIEW_ACTION_LABELS[log.action] ?? log.action}</td>
                          <td className="p-3">{log.profiles?.full_name ?? '—'}</td>
                          <td className="max-w-md truncate p-3 text-gray-600">
                            {JSON.stringify(log.example_data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edição avançada de critérios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RangeField
              label="Ratio sentimento positivo"
              value={settings.positive_sentiment_ratio}
              min={0.3}
              max={0.9}
              step={0.05}
              disabled={saveMutation.isPending}
              onChange={(v) => setSettings((s) => ({ ...s, positive_sentiment_ratio: v }))}
            />
            <div>
              <Label>Versão do classificador</Label>
              <Input
                value={settings.classifier_version}
                disabled={saveMutation.isPending}
                onChange={(e) => setSettings((s) => ({ ...s, classifier_version: e.target.value }))}
              />
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Preview pipeline</p>
              <Badge className={cn('mt-2', classificacaoBadgeClass(preview.classificacao))}>
                {classificacaoLabel(preview.classificacao)}
              </Badge>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                saveMutation.mutate()
                setEditModalOpen(false)
              }}
              disabled={saveMutation.isPending || !!validationError}
            >
              Salvar e fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
