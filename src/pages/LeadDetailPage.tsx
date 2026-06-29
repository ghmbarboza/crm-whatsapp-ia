import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  FileEdit,
  MessageCircle,
  Paperclip,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLeadDetail, type TimelineItem } from '@/hooks/useLeadDetail'
import {
  canEditLead,
  canDeleteLead,
  canConvertLead,
  canEditResponsavel,
} from '@/services/leadDetailService'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'
import type { EtapaPipeline, Mensagem } from '@/integrations/supabase/types'
import { LeadTimeline } from '@/components/lead-detail/LeadTimeline'
import {
  classificacaoBadgeClass,
  classificacaoLabel,
  sentimentoBadgeClass,
  sentimentoLabel,
} from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton, EmptyState } from '@/components/ui/loading'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function getInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function LeadInfoPanel({
  lead,
  profiles,
  responsavelName,
  canEdit,
  canEditResp,
  notes,
  onNotesChange,
  onSaveNotes,
  savingNotes,
  onStageChange,
  onResponsavelChange,
}: {
  lead: NonNullable<ReturnType<typeof useLeadDetail>['lead']>
  profiles: { id: string; full_name: string }[]
  responsavelName?: string
  canEdit: boolean
  canEditResp: boolean
  notes: string
  onNotesChange: (v: string) => void
  onSaveNotes: () => void
  savingNotes: boolean
  onStageChange: (stage: EtapaPipeline) => void
  onResponsavelChange: (id: string, nome: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg">{getInitials(lead.nome)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{lead.nome}</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge className={classificacaoBadgeClass(lead.classificacao)}>
              {classificacaoLabel(lead.classificacao)}
            </Badge>
            <Badge className={sentimentoBadgeClass(lead.sentimento)}>
              {sentimentoLabel(lead.sentimento)}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Telefone</dt>
          <dd className="font-medium">{lead.telefone}</dd>
        </div>
        {lead.email && (
          <div>
            <dt className="text-gray-500">E-mail</dt>
            <dd className="font-medium">{lead.email}</dd>
          </div>
        )}
        {lead.empresa && (
          <div>
            <dt className="text-gray-500">Empresa</dt>
            <dd className="font-medium">{lead.empresa}</dd>
          </div>
        )}
        <div>
          <dt className="text-gray-500">Origem</dt>
          <dd className="font-medium">{lead.origem}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Responsável</dt>
          <dd>
            {canEditResp ? (
              <Select
                value={lead.responsavel_id ?? ''}
                onValueChange={(v) => {
                  const p = profiles.find((pr) => pr.id === v)
                  if (p) onResponsavelChange(p.id, p.full_name)
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium">{responsavelName ?? '—'}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Etapa atual</dt>
          <dd>
            {canEdit ? (
              <Select value={lead.etapa_pipeline} onValueChange={(v) => onStageChange(v as EtapaPipeline)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">{lead.etapa_pipeline}</Badge>
            )}
          </dd>
        </div>
      </dl>

      <div>
        <Label htmlFor="anotacoes" className="flex items-center gap-1">
          <FileEdit className="h-4 w-4" />
          Anotações internas
        </Label>
        <Textarea
          id="anotacoes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={!canEdit || savingNotes}
          maxLength={1000}
          className="mt-1.5 min-h-[100px]"
          placeholder="Registre observações privadas sobre este lead..."
        />
        {canEdit && (
          <Button
            className="mt-2 w-full"
            size="sm"
            onClick={onSaveNotes}
            disabled={savingNotes || notes === (lead.anotacoes ?? '')}
          >
            {savingNotes ? 'Salvando...' : 'Salvar Nota'}
          </Button>
        )}
        {!lead.anotacoes && !notes && (
          <p className="mt-2 text-xs text-gray-400">Nenhuma anotação registrada.</p>
        )}
      </div>

      <Button asChild className="w-full">
        <Link to={`/chat/${lead.id}`}>
          <MessageCircle className="h-4 w-4" />
          Chat ao Vivo
        </Link>
      </Button>
    </div>
  )
}

function ActionButtons({
  canConvert,
  canDelete,
  onConvert,
  onRegisterResult,
  onDelete,
  converting,
}: {
  canConvert: boolean
  canDelete: boolean
  onConvert: () => void
  onRegisterResult: () => void
  onDelete: () => void
  converting: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canConvert && (
        <Button onClick={onConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4" />
          Converter Lead
        </Button>
      )}
      <Button variant="secondary" onClick={onRegisterResult}>
        Registrar Resultado
      </Button>
      {canDelete && (
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Remover Lead
        </Button>
      )}
    </div>
  )
}

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const timelineRef = useRef<HTMLDivElement>(null)

  const {
    lead,
    isLoading,
    profile,
    profiles,
    timelineItems,
    hasMore,
    loadMore,
    saveNotesMutation,
    updateResponsavelMutation,
    updateStageMutation,
    convertMutation,
    registerResultMutation,
    deleteMutation,
  } = useLeadDetail(id)

  const [notes, setNotes] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<Mensagem | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [resultText, setResultText] = useState('')
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [convertConfirm, setConvertConfirm] = useState(false)

  useEffect(() => {
    if (lead) setNotes(lead.anotacoes ?? '')
  }, [lead])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) loadMore()
      },
      { root: el, threshold: 0.1 }
    )
    const sentinel = el.querySelector('[data-sentinel]')
    if (sentinel) observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!lead || !profile) return <EmptyState message="Lead não encontrado" />

  const responsavelName = profiles.find((p) => p.id === lead.responsavel_id)?.full_name
  const canEdit = canEditLead(lead, profile.id, profile.role)
  const canDelete = canDeleteLead(profile.role)
  const canConvert = canConvertLead(lead) && canEdit
  const canEditResp = canEditResponsavel(profile.role)

  const handleSaveNotes = () => {
    if (saveNotesMutation.isPending) return
    saveNotesMutation.mutate(notes)
  }

  const handleStageChange = (to: EtapaPipeline) => {
    if (to === lead.etapa_pipeline) return
    updateStageMutation.mutate({ from: lead.etapa_pipeline, to })
  }

  const handleSelectMessage = (item: Extract<TimelineItem, { kind: 'message' }>) => {
    setSelectedMessage(item.data)
  }

  const handleRegisterResult = () => {
    if (!resultText.trim()) {
      toast.error('Descreva o resultado antes de salvar')
      return
    }
    registerResultMutation.mutate(resultText.trim(), {
      onSuccess: () => {
        setResultDialogOpen(false)
        setResultText('')
      },
    })
  }

  const infoPanel = (
    <LeadInfoPanel
      lead={lead}
      profiles={profiles}
      responsavelName={responsavelName}
      canEdit={canEdit}
      canEditResp={canEditResp}
      notes={notes}
      onNotesChange={setNotes}
      onSaveNotes={handleSaveNotes}
      savingNotes={saveNotesMutation.isPending}
      onStageChange={handleStageChange}
      onResponsavelChange={(pid, nome) => updateResponsavelMutation.mutate({ id: pid, nome })}
    />
  )

  const timelinePanel = (
    <div ref={timelineRef} className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      <div data-sentinel className="h-1" />
      <LeadTimeline
        items={timelineItems}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onSelectMessage={handleSelectMessage}
      />
    </div>
  )

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Topo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Voltar ao pipeline">
            <Link to="/kanban">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.nome}</h1>
            <p className="text-sm text-gray-500">
              Atualizado em {formatDateTime(lead.atualizado_em)}
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <ActionButtons
            canConvert={canConvert}
            canDelete={canDelete}
            converting={convertMutation.isPending}
            onConvert={() => setConvertConfirm(true)}
            onRegisterResult={() => setResultDialogOpen(true)}
            onDelete={() => setDeleteStep(1)}
          />
        </div>
      </div>

      {/* Desktop: 2 colunas */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">{infoPanel}</div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Timeline do Lead</h3>
          {timelinePanel}
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="timeline">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="detalhes" className="rounded-xl border bg-white p-4">
            {infoPanel}
          </TabsContent>
          <TabsContent value="timeline" className="rounded-xl border bg-white p-4">
            {timelinePanel}
          </TabsContent>
          <TabsContent value="notas" className="rounded-xl border bg-white p-4">
            <div>
              <Label htmlFor="notas-mobile">Anotações internas</Label>
              <Textarea
                id="notas-mobile"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit || saveNotesMutation.isPending}
                maxLength={1000}
                className="mt-2 min-h-[120px]"
              />
              {canEdit && (
                <Button className="mt-2 w-full" onClick={handleSaveNotes} disabled={saveNotesMutation.isPending}>
                  Salvar Nota
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Ações fixas mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t bg-white p-3 md:hidden">
        {canConvert && (
          <Button size="sm" className="flex-1 bg-green-600" onClick={() => setConvertConfirm(true)}>
            Converter
          </Button>
        )}
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => setResultDialogOpen(true)}>
          Resultado
        </Button>
        {canDelete && (
          <Button size="sm" variant="destructive" onClick={() => setDeleteStep(1)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Modal mensagem */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              {selectedMessage?.tipo === 'enviada' ? 'Mensagem do vendedor' : 'Mensagem do lead'}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">{selectedMessage.conteudo}</p>
              {selectedMessage.sentimento && (
                <Badge className={sentimentoBadgeClass(selectedMessage.sentimento)}>
                  {sentimentoLabel(selectedMessage.sentimento)}
                </Badge>
              )}
              {selectedMessage.anexo_url && (
                <a
                  href={selectedMessage.anexo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#0D4F8B] hover:underline"
                >
                  <Paperclip className="h-4 w-4" />
                  Baixar anexo
                </a>
              )}
              <p className="text-xs text-gray-400">{formatDateTime(selectedMessage.timestamp)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registrar resultado */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Resultado</DialogTitle>
          </DialogHeader>
          <Textarea
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            placeholder="Ex.: Proposta enviada, reunião agendada..."
            maxLength={500}
            disabled={registerResultMutation.isPending}
          />
          <Button onClick={handleRegisterResult} disabled={registerResultMutation.isPending}>
            {registerResultMutation.isPending ? 'Salvando...' : 'Salvar Resultado'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmar conversão */}
      <AlertDialog open={convertConfirm} onOpenChange={setConvertConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Converter lead?</AlertDialogTitle>
          <AlertDialogDescription>
            O lead será movido para a etapa <strong>Fechado</strong> e marcado como convertido.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                convertMutation.mutate(lead.etapa_pipeline, {
                  onSuccess: () => setConvertConfirm(false),
                })
              }}
            >
              Confirmar conversão
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remoção dupla confirmação */}
      <AlertDialog open={deleteStep === 1} onOpenChange={(o) => !o && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remover lead?</AlertDialogTitle>
          <AlertDialogDescription>
            O lead <strong>{lead.nome}</strong> está na etapa <strong>{lead.etapa_pipeline}</strong>.
            Esta ação não pode ser desfeita facilmente.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteStep(2)}>Continuar</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteStep === 2} onOpenChange={(o) => !o && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmação final</AlertDialogTitle>
          <AlertDialogDescription>
            Etapas atingidas: {PIPELINE_STAGES.slice(0, PIPELINE_STAGES.indexOf(lead.etapa_pipeline) + 1).join(' → ')}.
            Tem certeza que deseja remover este lead permanentemente?
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => navigate('/kanban'),
                })
                setDeleteStep(0)
              }}
            >
              Remover definitivamente
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
