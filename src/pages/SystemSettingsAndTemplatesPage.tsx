import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  DownloadCloud,
  FilePlus,
  ImagePlus,
  Loader2,
  Lock,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import {
  settingsKeys,
  fetchSystemPreferences,
  updateSystemPreferences,
  uploadLogo,
  fetchCustomStages,
  addCustomStage,
  removeCustomStage,
  fetchBackupLogs,
  createManualBackup,
  restoreBackup,
  fetchMessageTemplatesAdmin,
  saveMessageTemplate,
  deleteMessageTemplate,
  fetchConfigChangeLogs,
  exportConfigLogsCsv,
  highlightVariables,
  renderTemplatePreview,
  validateTemplateVariables,
  applyPaletteGlobally,
  canTestTemplate,
  markTemplateTested,
  templateTestRemainingMs,
  isBackupInProgress,
  BASE_PIPELINE_STAGES,
  PALETTE_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  TEMPLATE_TYPES,
  DEFAULT_VARIABLES,
  tipoLabel,
} from '@/services/systemSettingsService'
import type { MessageTemplate, SystemPreferences } from '@/integrations/supabase/types'
import { formatDateTime } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function SystemSettingsAndTemplatesPage() {
  const queryClient = useQueryClient()
  const { checkRole } = useAuth()
  const isAdmin = checkRole(['admin'])
  const canEdit = checkRole(['admin', 'gestor'])
  const saveLock = useRef(false)

  const [prefsForm, setPrefsForm] = useState<Partial<SystemPreferences>>({})
  const [palettePulse, setPalettePulse] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [removeStage, setRemoveStage] = useState<{ id: string; nome: string } | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateTipo, setTemplateTipo] = useState('all')
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; editing?: MessageTemplate }>({
    open: false,
  })
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    tipo: 'boas_vindas' as MessageTemplate['tipo'],
    conteudo: '',
    variaveis: DEFAULT_VARIABLES,
  })
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testVars, setTestVars] = useState({ nome: 'João Silva', etapa: 'Novo', data: format(new Date(), 'dd/MM/yyyy') })
  const [testCooldown, setTestCooldown] = useState(0)
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const restoreInputRef = useRef<HTMLInputElement>(null)

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: settingsKeys.preferences,
    queryFn: fetchSystemPreferences,
  })

  const { data: customStages, isLoading: stagesLoading } = useQuery({
    queryKey: settingsKeys.stages,
    queryFn: fetchCustomStages,
  })

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: [...settingsKeys.templates, templateSearch, templateTipo],
    queryFn: () => fetchMessageTemplatesAdmin(templateSearch, templateTipo),
  })

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: settingsKeys.backups,
    queryFn: fetchBackupLogs,
    enabled: isAdmin,
  })

  const { data: configLogs } = useQuery({
    queryKey: settingsKeys.configLogs,
    queryFn: () => fetchConfigChangeLogs(30),
  })

  useEffect(() => {
    if (prefs) {
      setPrefsForm(prefs)
      applyPaletteGlobally(prefs.paleta_cores)
    }
  }, [prefs])

  useEffect(() => {
    const id = setInterval(() => setTestCooldown(templateTestRemainingMs()), 1000)
    return () => clearInterval(id)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: settingsKeys.preferences })
    queryClient.invalidateQueries({ queryKey: settingsKeys.stages })
    queryClient.invalidateQueries({ queryKey: settingsKeys.templates })
    queryClient.invalidateQueries({ queryKey: settingsKeys.backups })
    queryClient.invalidateQueries({ queryKey: settingsKeys.configLogs })
  }

  const savePrefsMutation = useMutation({
    mutationFn: async () => {
      if (saveLock.current) throw new Error('Salvamento em andamento')
      if (!prefsForm.idioma?.trim()) throw new Error('Idioma é obrigatório')
      if (!prefsForm.mensagem_padrao?.trim()) throw new Error('Mensagem padrão é obrigatória')
      saveLock.current = true
      await updateSystemPreferences({
        paleta_cores: prefsForm.paleta_cores,
        idioma: prefsForm.idioma,
        horario_local: prefsForm.horario_local,
        mensagem_padrao: prefsForm.mensagem_padrao,
      })
    },
    onSuccess: () => {
      invalidate()
      toast.success('Preferências salvas')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
    onSettled: () => {
      saveLock.current = false
    },
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      invalidate()
      toast.success('Logo atualizado')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no upload'),
  })

  const backupMutation = useMutation({
    mutationFn: createManualBackup,
    onSuccess: ({ url }) => {
      const a = document.createElement('a')
      a.href = url
      a.download = `crm-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      invalidate()
      toast.success('Backup criado')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no backup'),
  })

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      saveMessageTemplate(
        {
          nome: templateForm.nome,
          tipo: templateForm.tipo,
          conteudo: templateForm.conteudo,
          variaveis: templateForm.variaveis,
        },
        templateDialog.editing?.id
      ),
    onSuccess: () => {
      setTemplateDialog({ open: false })
      invalidate()
      toast.success('Template salvo')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar template'),
  })

  const previewHtml = useMemo(
    () => highlightVariables(templateForm.conteudo),
    [templateForm.conteudo]
  )

  const testPreview = useMemo(
    () => renderTemplatePreview(templateForm.conteudo, testVars),
    [templateForm.conteudo, testVars]
  )

  if (prefsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-[5] -mx-4 border-b bg-gray-50/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {prefs?.logo_url ? (
              <img src={prefs.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary,#0D4F8B)] text-white">
                <Settings className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Configurações Gerais</h2>
              <p className="text-sm text-gray-500">Preferências, pipeline, templates e backup</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => savePrefsMutation.mutate()} disabled={savePrefsMutation.isPending}>
              {savePrefsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar preferências
            </Button>
          )}
        </div>
      </header>

      {!isAdmin && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Modo gestor: você pode editar templates. Preferências globais e backup são somente leitura.
        </p>
      )}

      <Tabs defaultValue="preferences">
        <TabsList className="flex-wrap">
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {isAdmin && <TabsTrigger value="backup">Backup</TabsTrigger>}
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card className={cn('transition-shadow duration-300', palettePulse && 'ring-2 ring-blue-400')}>
            <CardHeader>
              <CardTitle className="text-base">Branding e comunicação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Paleta de cores</Label>
                  <Select
                    value={prefsForm.paleta_cores ?? 'azul'}
                    disabled={!isAdmin}
                    onValueChange={(v) => {
                      const paleta = v as SystemPreferences['paleta_cores']
                      setPrefsForm((p) => ({ ...p, paleta_cores: paleta }))
                      applyPaletteGlobally(paleta)
                      setPalettePulse(true)
                      setTimeout(() => setPalettePulse(false), 600)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PALETTE_OPTIONS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ background: p.primary }} />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Select
                    value={prefsForm.idioma ?? 'pt-BR'}
                    disabled={!isAdmin}
                    onValueChange={(v) => setPrefsForm((p) => ({ ...p, idioma: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário local</Label>
                  <Select
                    value={prefsForm.horario_local ?? 'America/Sao_Paulo'}
                    disabled={!isAdmin}
                    onValueChange={(v) => setPrefsForm((p) => ({ ...p, horario_local: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Logo (PNG/JPG, máx. 1MB)</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {prefs?.logo_url && (
                      <img src={prefs.logo_url} alt="Logo atual" className="h-16 w-16 rounded border object-cover" />
                    )}
                    {isAdmin && (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100">
                        <ImagePlus className="h-4 w-4" />
                        {logoMutation.isPending ? 'Enviando...' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          className="hidden"
                          disabled={logoMutation.isPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) logoMutation.mutate(file)
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Mensagem automática padrão</Label>
                  <Textarea
                    className="mt-1"
                    rows={4}
                    disabled={!isAdmin}
                    value={prefsForm.mensagem_padrao ?? ''}
                    onChange={(e) => setPrefsForm((p) => ({ ...p, mensagem_padrao: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etapas do pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Etapas base (protegidas)</p>
                <div className="flex flex-wrap gap-2">
                  {BASE_PIPELINE_STAGES.map((s) => (
                    <Badge key={s} className="gap-1 bg-gray-100 text-gray-800">
                      <Lock className="h-3 w-3" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              {stagesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Etapas extras</p>
                    {(customStages ?? []).length === 0 ? (
                      <EmptyState message="Nenhuma etapa extra. Admins podem criar etapas personalizadas." />
                    ) : (
                      <ul className="space-y-2">
                        {(customStages ?? []).map((s) => (
                          <li key={s.id} className="flex items-center justify-between rounded border px-3 py-2">
                            <span>{s.nome}</span>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => setRemoveStage({ id: s.id, nome: s.nome })}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome da nova etapa"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          try {
                            await addCustomStage(newStageName)
                            setNewStageName('')
                            invalidate()
                            toast.success('Etapa adicionada')
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Erro')
                          }
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar template..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
              </div>
              <Select value={templateTipo} onValueChange={setTemplateTipo}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canEdit && (
              <Button
                onClick={() => {
                  setTemplateForm({ nome: '', tipo: 'boas_vindas', conteudo: '', variaveis: DEFAULT_VARIABLES })
                  setTemplateDialog({ open: true })
                }}
              >
                <FilePlus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            )}
          </div>

          {templatesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !templates?.length ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-12 text-center">
              <FilePlus className="h-12 w-12 text-blue-500" />
              <p className="text-sm text-gray-500">Crie templates para automatizar mensagens WhatsApp.</p>
              {canEdit && (
                <Button onClick={() => setTemplateDialog({ open: true })}>
                  Criar primeiro template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{t.nome}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {tipoLabel(t.tipo)}
                        </Badge>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTemplateForm({
                              nome: t.nome,
                              tipo: t.tipo,
                              conteudo: t.conteudo,
                              variaveis: t.variaveis ?? DEFAULT_VARIABLES,
                            })
                            setTemplateDialog({ open: true, editing: t })
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-sm text-gray-600"
                      dangerouslySetInnerHTML={{ __html: highlightVariables(t.conteudo) }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backup manual</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={() => backupMutation.mutate()}
                  disabled={backupMutation.isPending || isBackupInProgress()}
                >
                  {backupMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="mr-2 h-4 w-4" />
                  )}
                  Gerar backup
                </Button>
                <Button variant="outline" onClick={() => restoreInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurar backup
                </Button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setRestoreFile(file)
                      setRestoreConfirm(true)
                    }
                  }}
                />
              </CardContent>
            </Card>

            {backupsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !backups?.length ? (
              <EmptyState message="Nenhum backup registrado." />
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-3">Arquivo</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Tamanho</th>
                      <th className="p-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => (
                      <tr key={b.id} className="border-b">
                        <td className="p-3 font-mono text-xs">{b.download_url}</td>
                        <td className="p-3">{b.profiles?.full_name ?? '—'}</td>
                        <td className="p-3">{b.file_size ? `${Math.round(b.file_size / 1024)} KB` : '—'}</td>
                        <td className="p-3">{formatDateTime(b.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {configLogs && configLogs.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = exportConfigLogsCsv(configLogs)
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `config-logs-${Date.now()}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success('Logs exportados')
                  }}
                >
                  Exportar logs de configuração
                </Button>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={templateDialog.open} onOpenChange={(o) => setTemplateDialog({ open: o })}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateDialog.editing ? 'Editar template' : 'Novo template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={templateForm.nome}
                onChange={(e) => setTemplateForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={templateForm.tipo}
                onValueChange={(v) => setTemplateForm((f) => ({ ...f, tipo: v as MessageTemplate['tipo'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo (use {'{{nome}}'}, {'{{etapa}}'}, {'{{data}}'})</Label>
              <Textarea
                rows={5}
                value={templateForm.conteudo}
                onChange={(e) => setTemplateForm((f) => ({ ...f, conteudo: e.target.value }))}
              />
              <div
                className="mt-2 rounded bg-gray-50 p-2 text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(true)}
                disabled={!templateForm.conteudo.trim()}
              >
                Testar envio
              </Button>
              <Button
                className="flex-1"
                onClick={() => saveTemplateMutation.mutate()}
                disabled={saveTemplateMutation.isPending}
              >
                Salvar
              </Button>
              {templateDialog.editing && canEdit && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteMessageTemplate(templateDialog.editing!.id, templateDialog.editing!.nome)
                    setTemplateDialog({ open: false })
                    invalidate()
                    toast.success('Template removido')
                  }}
                >
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview de envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {DEFAULT_VARIABLES.map((v) => (
              <div key={v}>
                <Label>{v}</Label>
                <Input
                  value={testVars[v as keyof typeof testVars] ?? ''}
                  onChange={(e) => setTestVars((vars) => ({ ...vars, [v]: e.target.value }))}
                />
              </div>
            ))}
            <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-900">{testPreview}</div>
            <Button
              className="w-full"
              disabled={testCooldown > 0}
              onClick={() => {
                const err = validateTemplateVariables(templateForm.conteudo, testVars)
                if (err) {
                  toast.error(err)
                  return
                }
                if (!canTestTemplate()) {
                  toast.error('Aguarde 10 segundos entre testes')
                  return
                }
                markTemplateTested()
                toast.success('Envio simulado com sucesso')
                setTestDialogOpen(false)
              }}
            >
              Confirmar teste {testCooldown > 0 && `(${testCooldown}s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeStage} onOpenChange={() => setRemoveStage(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remover etapa &quot;{removeStage?.nome}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>Leads nesta etapa não serão afetados retroativamente.</AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removeStage) return
                await removeCustomStage(removeStage.id, removeStage.nome)
                setRemoveStage(null)
                invalidate()
                toast.success('Etapa removida')
              }}
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreConfirm} onOpenChange={setRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Restaurar backup?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação pode sobrescrever dados atuais do CRM. Confirme apenas se tiver certeza.
            Arquivo: {restoreFile?.name}
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setRestoreFile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!restoreFile) return
                try {
                  await restoreBackup(restoreFile)
                  toast.success('Restauração registrada (simulação — dados não sobrescritos em dev)')
                  setRestoreFile(null)
                  setRestoreConfirm(false)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Backup inválido')
                }
              }}
            >
              Confirmar restauração
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
