import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Download,
  MoreVertical,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import { fetchEquipes, equipesKeys } from '@/services/equipesService'
import {
  integrationKeys,
  fetchIntegrationSettings,
  updateIntegrationParameters,
  fetchWhatsappNumbers,
  addWhatsappNumber,
  updateWhatsappNumberTeam,
  removeWhatsappNumber,
  fetchIntegrationLogs,
  exportIntegrationLogsCsv,
  validateBusinessHours,
  previewAutoMessage,
  setupEvolutionConnection,
  pairWhatsappQr,
  refreshWhatsappConnectionStatus,
  testWhatsappConnectivity,
  connectionStatusLabel,
  isConnectedStatus,
  isEvolutionIntegrationConfigured,
  WEEK_DAYS,
  LOG_EVENT_LABELS,
  connectivityTestRemainingMs,
} from '@/services/whatsappIntegrationService'
import type { BusinessHours, IntegrationParameters } from '@/integrations/supabase/types'
import { formatDateTime } from '@/utils/dates'
import { formatPhone, phoneToDigits } from '@/utils/formatPhone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const DEFAULT_PARAMS: IntegrationParameters = {
  auto_message: 'Olá {{nome}}, recebemos sua mensagem! Etapa: {{etapa}}.',
  business_hours: Object.fromEntries(
    WEEK_DAYS.map(({ key }, i) => [
      key,
      { enabled: i < 5, start: '09:00', end: i < 5 ? '18:00' : '13:00' },
    ])
  ),
}

export function WhatsAppIntegrationConfigPage() {
  const queryClient = useQueryClient()
  const { checkRole } = useAuth()
  const isAdmin = checkRole(['admin'])
  const pairingLock = useRef(false)

  const { data: whatsappConfig, isLoading: statusLoading, refetch: refetchStatus } = useWhatsappStatus()

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: integrationKeys.settings,
    queryFn: fetchIntegrationSettings,
  })
  const { data: numbers, isLoading: numbersLoading } = useQuery({
    queryKey: integrationKeys.numbers,
    queryFn: fetchWhatsappNumbers,
  })
  const { data: equipes } = useQuery({ queryKey: equipesKeys.all, queryFn: fetchEquipes })

  const [params, setParams] = useState<IntegrationParameters>(DEFAULT_PARAMS)
  const [evolutionUrl, setEvolutionUrl] = useState('')
  const [evolutionApiKey, setEvolutionApiKey] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [newPhone, setNewPhone] = useState('')
  const [newPhoneTeam, setNewPhoneTeam] = useState<string>('none')
  const [deleteNumberId, setDeleteNumberId] = useState<{ id: string; phone: string } | null>(null)
  const [logFilters, setLogFilters] = useState({ event: 'all', from: '', to: '' })
  const [testCooldown, setTestCooldown] = useState(0)

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: integrationKeys.logs(logFilters),
    queryFn: () =>
      fetchIntegrationLogs({
        event: logFilters.event !== 'all' ? logFilters.event : undefined,
        from: logFilters.from || undefined,
        to: logFilters.to || undefined,
      }),
  })

  useEffect(() => {
    if (settings?.parameters_json) {
      setParams({
        auto_message: settings.parameters_json.auto_message ?? DEFAULT_PARAMS.auto_message,
        business_hours: {
          ...DEFAULT_PARAMS.business_hours,
          ...settings.parameters_json.business_hours,
        },
      })
    }
  }, [settings])

  useEffect(() => {
    if (whatsappConfig?.qr_code) setQrImage(whatsappConfig.qr_code)
  }, [whatsappConfig?.qr_code])

  useEffect(() => {
    const interval = setInterval(() => {
      setTestCooldown(connectivityTestRemainingMs())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const connected = isConnectedStatus(whatsappConfig?.status ?? settings?.status)
  const evolutionConfigured = isEvolutionIntegrationConfigured(settings)

  const setupMutation = useMutation({
    mutationFn: async () => {
      if (!evolutionUrl.trim()) throw new Error('Informe a URL da Evolution API')
      if (!evolutionApiKey.trim()) throw new Error('Informe a API Key da Evolution')
      return setupEvolutionConnection(evolutionUrl, evolutionApiKey)
    },
    onSuccess: (data) => {
      setEvolutionApiKey('')
      if (data.qr_code) setQrImage(data.qr_code)
      setQrOpen(true)
      invalidateAll()
      if (data.status === 'connected') toast.success('WhatsApp conectado!')
      else toast.info('Escaneie o QR Code no aplicativo WhatsApp')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao conectar com a Evolution API'),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: integrationKeys.settings })
    queryClient.invalidateQueries({ queryKey: integrationKeys.numbers })
    queryClient.invalidateQueries({ queryKey: integrationKeys.logs() })
    queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
  }

  const pairMutation = useMutation({
    mutationFn: async () => {
      if (pairingLock.current) throw new Error('Pareamento em andamento')
      pairingLock.current = true
      return pairWhatsappQr()
    },
    onSuccess: (data) => {
      if (data.qr_code) setQrImage(data.qr_code)
      setQrOpen(true)
      invalidateAll()
      if (data.status === 'connected') toast.success('WhatsApp conectado!')
      else toast.info('Escaneie o QR Code no aplicativo WhatsApp')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao gerar QR Code'),
    onSettled: () => {
      pairingLock.current = false
    },
  })

  const refreshMutation = useMutation({
    mutationFn: refreshWhatsappConnectionStatus,
    onSuccess: (status) => {
      invalidateAll()
      refetchStatus()
      toast.success(`Status: ${connectionStatusLabel(status)}`)
    },
    onError: () => toast.error('Falha ao atualizar status'),
  })

  const testMutation = useMutation({
    mutationFn: testWhatsappConnectivity,
    onSuccess: (ok) => {
      invalidateAll()
      if (ok) toast.success('Integração operacional')
      else toast.error('Integração indisponível')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no teste'),
  })

  const saveParamsMutation = useMutation({
    mutationFn: async () => {
      if (!params.auto_message.trim()) throw new Error('Mensagem automática é obrigatória')
      if (params.auto_message.length > 300) throw new Error('Mensagem limitada a 300 caracteres')
      const hoursError = validateBusinessHours(params.business_hours as BusinessHours)
      if (hoursError) throw new Error(hoursError)
      await updateIntegrationParameters(params)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Parâmetros salvos')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
  })

  const addNumberMutation = useMutation({
    mutationFn: async () => {
      const digits = phoneToDigits(newPhone)
      if (digits.length < 10) throw new Error('Informe um número válido')
      await addWhatsappNumber(newPhone, newPhoneTeam === 'none' ? null : newPhoneTeam)
    },
    onSuccess: () => {
      setNewPhone('')
      setNewPhoneTeam('none')
      invalidateAll()
      toast.success('Número adicionado')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao adicionar número'),
  })

  const removeNumberMutation = useMutation({
    mutationFn: async () => {
      if (!deleteNumberId) return
      await removeWhatsappNumber(deleteNumberId.id, deleteNumberId.phone)
    },
    onSuccess: () => {
      setDeleteNumberId(null)
      invalidateAll()
      toast.success('Número removido')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao remover'),
  })

  const preview = useMemo(() => previewAutoMessage(params.auto_message), [params.auto_message])

  const updateHour = (day: string, field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    setParams((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value,
        },
      },
    }))
  }

  const exportLogs = () => {
    if (!logs?.length) {
      toast.error('Nenhum log para exportar')
      return
    }
    const csv = exportIntegrationLogsCsv(logs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `integration-logs-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Logs exportados')
  }

  if (settingsLoading || statusLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!evolutionConfigured && isAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conectar WhatsApp</h2>
          <p className="text-sm text-gray-500">
            Informe a URL e a API Key da Evolution. A instância será criada automaticamente.
          </p>
        </div>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <Label htmlFor="evolution_url">URL da Evolution API</Label>
              <Input
                id="evolution_url"
                placeholder="http://seu-servidor:8080"
                value={evolutionUrl}
                onChange={(e) => setEvolutionUrl(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="evolution_api_key">API Key</Label>
              <Input
                id="evolution_api_key"
                type="password"
                placeholder="Sua chave de API"
                value={evolutionApiKey}
                onChange={(e) => setEvolutionApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {setupMutation.isPending ? 'Conectando...' : 'Gerar QR Code'}
            </Button>
          </div>
        </section>

        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="max-h-[100dvh] w-full max-w-md overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pareamento WhatsApp
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo → escaneie o código.
            </p>
            {setupMutation.isPending ? (
              <Skeleton className="mx-auto h-64 w-64" />
            ) : qrImage ? (
              <div className="flex justify-center">
                <img src={qrImage} alt="QR Code WhatsApp" className="max-h-[70vh] w-full max-w-xs rounded-lg border" />
              </div>
            ) : (
              <EmptyState message="QR Code indisponível. Tente novamente." />
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (!evolutionConfigured) {
    return (
      <EmptyState message="A integração WhatsApp ainda não foi configurada. Solicite a um administrador." />
    )
  }

  return (
    <div className="space-y-6">
      {!connected && (
        <div
          className="flex animate-pulse items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Integração WhatsApp desconectada</p>
            <p className="text-sm">Leads podem não ser recebidos. Pareie novamente via QR Code.</p>
          </div>
          {isAdmin && (
            <Button size="sm" variant="destructive" onClick={() => pairMutation.mutate()} disabled={pairMutation.isPending}>
              Re-parear
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integração WhatsApp</h2>
          <p className="text-sm text-gray-500">Evolution API · pareamento e parâmetros de atendimento</p>
          {settings?.parameters_json?.evolution_url && (
            <p className="text-xs text-gray-400">Servidor: {settings.parameters_json.evolution_url}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              'gap-1 px-3 py-1',
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            )}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connectionStatusLabel(whatsappConfig?.status ?? settings?.status ?? 'disconnected')}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={cn('mr-1 h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
            Atualizar
          </Button>
          {isAdmin && (
            <Button onClick={() => pairMutation.mutate()} disabled={pairMutation.isPending}>
              <QrCode className="mr-2 h-4 w-4" />
              Parear via QR Code
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Modo visualização: gestores podem consultar status e logs, mas não alterar configurações.
        </p>
      )}

      <Tabs defaultValue="config">
        <TabsList className="flex-wrap">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="numbers">Números</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Horários de atendimento</h3>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => saveParamsMutation.mutate()}
                  disabled={saveParamsMutation.isPending}
                >
                  Salvar parâmetros
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Dia</th>
                    <th className="pb-2 pr-4">Ativo</th>
                    <th className="pb-2 pr-4">Início</th>
                    <th className="pb-2">Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEK_DAYS.map(({ key, label }) => {
                    const slot = params.business_hours[key] ?? { enabled: false, start: '09:00', end: '18:00' }
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{label}</td>
                        <td className="py-2 pr-4">
                          <Checkbox
                            checked={slot.enabled}
                            disabled={!isAdmin}
                            onCheckedChange={(v) => updateHour(key, 'enabled', !!v)}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            type="time"
                            value={slot.start}
                            disabled={!isAdmin || !slot.enabled}
                            onChange={(e) => updateHour(key, 'start', e.target.value)}
                            className="w-28"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="time"
                            value={slot.end}
                            disabled={!isAdmin || !slot.enabled}
                            onChange={(e) => updateHour(key, 'end', e.target.value)}
                            className="w-28"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
            <h3 className="mb-3 font-semibold text-gray-900">Mensagem automática</h3>
            <Label htmlFor="auto_message">Texto padrão (use {'{{nome}}'} e {'{{etapa}}'})</Label>
            <Textarea
              id="auto_message"
              value={params.auto_message}
              disabled={!isAdmin}
              maxLength={300}
              rows={4}
              className="mt-2"
              onChange={(e) => setParams((p) => ({ ...p, auto_message: e.target.value }))}
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{params.auto_message.length}/300 caracteres</span>
            </div>
            <div className="mt-3 rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Preview</p>
              <p className="mt-1 text-sm text-gray-800">{preview}</p>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button onClick={() => saveParamsMutation.mutate()} disabled={saveParamsMutation.isPending}>
                Salvar configurações
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || testCooldown > 0}
            >
              Testar Integração
              {testCooldown > 0 && ` (${Math.ceil(testCooldown / 1000)}s)`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="numbers">
          <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
            {isAdmin && (
              <div className="mb-6 grid gap-3 rounded-md border border-dashed p-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label>Número WhatsApp</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Time responsável</Label>
                  <Select value={newPhoneTeam} onValueChange={setNewPhoneTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(equipes ?? []).map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => addNumberMutation.mutate()} disabled={addNumberMutation.isPending}>
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            {numbersLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !numbers?.length ? (
              <EmptyState message="Nenhum número integrado. Adicione o primeiro número WhatsApp." />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3">Telefone</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Cadastro</th>
                        {isAdmin && <th className="p-3">Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {numbers.map((n) => (
                        <tr key={n.id} className="border-b">
                          <td className="p-3 font-medium">{formatPhone(n.phone)}</td>
                          <td className="p-3">
                            {isAdmin ? (
                              <Select
                                value={n.assigned_team_id ?? 'none'}
                                onValueChange={(v) =>
                                  updateWhatsappNumberTeam(n.id, v === 'none' ? null : v).then(() => {
                                    invalidateAll()
                                    toast.success('Time atualizado')
                                  })
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {(equipes ?? []).map((eq) => (
                                    <SelectItem key={eq.id} value={eq.id}>
                                      {eq.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              n.equipes?.nome ?? '—'
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant={n.is_active ? 'default' : 'outline'}>
                              {n.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-500">{formatDateTime(n.created_at)}</td>
                          {isAdmin && (
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Remover número"
                                onClick={() => setDeleteNumberId({ id: n.id, phone: n.phone })}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {numbers.map((n) => (
                    <div key={n.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{formatPhone(n.phone)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(n.created_at)}</p>
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteNumberId({ id: n.id, phone: n.phone })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">Time: {n.equipes?.nome ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </TabsContent>

        <TabsContent value="logs">
          <section className="rounded-lg border bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Tipo de evento</Label>
                  <Select value={logFilters.event} onValueChange={(v) => setLogFilters((f) => ({ ...f, event: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(LOG_EVENT_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={logFilters.from}
                    onChange={(e) => setLogFilters((f) => ({ ...f, from: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={logFilters.to}
                    onChange={(e) => setLogFilters((f) => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>
              <Button variant="outline" onClick={exportLogs}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>

            {logsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !logs?.length ? (
              <EmptyState message="Nenhum log de integração registrado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-3">Data</th>
                      <th className="p-3">Evento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-3 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td className="p-3">{LOG_EVENT_LABELS[log.event] ?? log.event}</td>
                        <td className="p-3">
                          <Badge
                            className={cn(
                              log.status === 'success' && 'bg-green-100 text-green-800',
                              log.status === 'error' && 'bg-red-100 text-red-800',
                              log.status === 'info' && 'bg-blue-100 text-blue-800'
                            )}
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600">{log.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-h-[100dvh] w-full max-w-md overflow-y-auto sm:max-w-lg md:max-w-xl max-sm:fixed max-sm:inset-0 max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pareamento WhatsApp
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → escaneie o código abaixo.
          </p>
          {pairMutation.isPending ? (
            <Skeleton className="mx-auto h-64 w-64" />
          ) : qrImage && !connected ? (
            <div className="flex justify-center transition-opacity duration-300">
              <img src={qrImage} alt="QR Code WhatsApp" className="max-h-[70vh] w-full max-w-xs rounded-lg border" />
            </div>
          ) : connected ? (
            <div className="flex flex-col items-center gap-2 py-8 text-green-700">
              <Wifi className="h-12 w-12" />
              <p className="font-medium">Conectado com sucesso</p>
            </div>
          ) : (
            <EmptyState message="QR Code indisponível. Tente gerar novamente." />
          )}
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => pairMutation.mutate()}
              disabled={pairMutation.isPending}
            >
              Gerar novo QR Code
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteNumberId} onOpenChange={() => setDeleteNumberId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remover número WhatsApp?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Números com leads ativos não podem ser removidos.
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeNumberMutation.mutate()}
              disabled={removeNumberMutation.isPending}
            >
              Confirmar remoção
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
