import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wifi, WifiOff, AlertCircle, Users, FileText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus'
import {
  fetchAiConfig,
  updateAiConfig,
  fetchAuditLogs,
  updateWhatsappStatus,
} from '@/services/configService'
import {
  fetchEquipes,
  createEquipe,
  fetchProfiles,
  addUserToEquipe,
  deleteEquipe,
} from '@/services/equipesService'
import {
  fetchTemplates,
  createTemplate,
  deleteTemplate,
} from '@/services/templatesService'
import { formatDateTime } from '@/utils/dates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function ConfigScreen() {
  const { data: whatsapp, isLoading } = useWhatsappStatus()
  const queryClient = useQueryClient()

  const { data: aiConfig } = useQuery({ queryKey: ['ai-config'], queryFn: fetchAiConfig })
  const { data: equipes } = useQuery({ queryKey: ['equipes'], queryFn: fetchEquipes })
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles })
  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: fetchTemplates })
  const { data: auditLogs } = useQuery({ queryKey: ['audit-logs'], queryFn: () => fetchAuditLogs(50) })

  const [equipeNome, setEquipeNome] = useState('')
  const [selectedEquipe, setSelectedEquipe] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [templateForm, setTemplateForm] = useState({ nome: '', conteudo: '', tipo: 'boas_vindas' as const })

  const refreshWhatsapp = useMutation({
    mutationFn: async () => {
      const evolutionUrl = import.meta.env.VITE_EVOLUTION_API_URL
      const evolutionKey = import.meta.env.VITE_EVOLUTION_API_KEY
      const instance = import.meta.env.VITE_EVOLUTION_INSTANCE || 'crm-whatsapp'

      if (!evolutionUrl || !evolutionKey) {
        toast.error('Configure VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY no .env', {
          icon: <AlertCircle className="h-4 w-4" />,
        })
        return
      }

      const res = await fetch(`${evolutionUrl}/instance/connect/${instance}`, {
        headers: { apikey: evolutionKey },
      })
      const data = await res.json()
      const qr = data.base64 || data.qrcode?.base64
      const status = data.instance?.state === 'open' ? 'conectado' : 'desconectado'
      await updateWhatsappStatus(status as 'conectado' | 'desconectado', qr)
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
      if (status === 'conectado') toast.success('WhatsApp conectado!')
      else toast.info('Escaneie o QR Code para conectar')
    },
    onError: () => toast.error('Erro ao conectar WhatsApp. Verifique a Evolution API.'),
  })

  const saveAiConfig = useMutation({
    mutationFn: (data: { threshold_quente: number; threshold_morno: number }) => updateAiConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      toast.success('Configuração IA salva')
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="ia">IA</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {whatsapp?.status === 'conectado' ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                Status: {whatsapp?.status === 'conectado' ? 'Conectado' : 'Desconectado'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => refreshWhatsapp.mutate()} disabled={refreshWhatsapp.isPending}>
                Conectar / Atualizar QR Code
              </Button>
              {whatsapp?.qr_code && whatsapp.status !== 'conectado' && (
                <div className="flex justify-center">
                  <img src={whatsapp.qr_code} alt="QR Code WhatsApp" className="max-w-xs rounded-md border" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestão de Equipes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da equipe"
                  value={equipeNome}
                  onChange={(e) => setEquipeNome(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    if (!equipeNome) return
                    await createEquipe(equipeNome)
                    setEquipeNome('')
                    queryClient.invalidateQueries({ queryKey: ['equipes'] })
                    toast.success('Equipe criada')
                  }}
                >
                  Criar
                </Button>
              </div>
              <div className="space-y-2">
                {(equipes || []).map((eq) => (
                  <div key={eq.id} className="flex items-center justify-between rounded-md border p-3">
                    <span>{eq.nome}</span>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      await deleteEquipe(eq.id)
                      queryClient.invalidateQueries({ queryKey: ['equipes'] })
                    }}>
                      Excluir
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Equipe</Label>
                  <Select value={selectedEquipe} onValueChange={setSelectedEquipe}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(equipes || []).map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Usuário</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(profiles || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!selectedEquipe || !selectedUser) return
                  await addUserToEquipe(selectedUser, selectedEquipe)
                  toast.success('Usuário adicionado à equipe')
                }}
              >
                Associar Usuário
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Parâmetros IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Threshold Quente</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  defaultValue={aiConfig?.threshold_quente}
                  id="threshold_quente"
                />
              </div>
              <div>
                <Label>Threshold Morno</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  defaultValue={aiConfig?.threshold_morno}
                  id="threshold_morno"
                />
              </div>
              <Button
                onClick={() => {
                  const quente = parseFloat((document.getElementById('threshold_quente') as HTMLInputElement).value)
                  const morno = parseFloat((document.getElementById('threshold_morno') as HTMLInputElement).value)
                  saveAiConfig.mutate({ threshold_quente: quente, threshold_morno: morno })
                }}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Input
                  placeholder="Nome do template"
                  value={templateForm.nome}
                  onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })}
                />
                <Textarea
                  placeholder="Conteúdo"
                  value={templateForm.conteudo}
                  onChange={(e) => setTemplateForm({ ...templateForm, conteudo: e.target.value })}
                />
                <Select
                  value={templateForm.tipo}
                  onValueChange={(v) => setTemplateForm({ ...templateForm, tipo: v as typeof templateForm.tipo })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boas_vindas">Boas-vindas</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={async () => {
                    await createTemplate({ ...templateForm, ativo: true })
                    setTemplateForm({ nome: '', conteudo: '', tipo: 'boas_vindas' })
                    queryClient.invalidateQueries({ queryKey: ['templates'] })
                    toast.success('Template criado')
                  }}
                >
                  Adicionar Template
                </Button>
              </div>
              <div className="space-y-2">
                {(templates || []).map((t) => (
                  <div key={t.id} className="rounded-md border p-3">
                    <p className="font-semibold">{t.nome} <span className="text-xs text-gray-500">({t.tipo})</span></p>
                    <p className="text-sm text-gray-600">{t.conteudo}</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={async () => {
                      await deleteTemplate(t.id)
                      queryClient.invalidateQueries({ queryKey: ['templates'] })
                    }}>
                      Excluir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Ação</th>
                      <th className="p-2 text-left">Entidade</th>
                      <th className="p-2 text-left">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditLogs || []).map((log, i) => (
                      <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2">{formatDateTime(log.criado_em)}</td>
                        <td className="p-2">{log.acao}</td>
                        <td className="p-2">{log.entidade}</td>
                        <td className="p-2">{(log as { profiles?: { full_name: string } }).profiles?.full_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
