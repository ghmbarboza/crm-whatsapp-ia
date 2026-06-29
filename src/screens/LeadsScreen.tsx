import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { useLeads, useDeleteLead } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import { classificacaoBadgeClass } from '@/utils/labels'
import { formatDateTime } from '@/utils/dates'
import { LeadFormDialog } from '@/components/leads/LeadFormDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Lead } from '@/integrations/supabase/types'

export function LeadsScreen() {
  const { data: leads, isLoading } = useLeads()
  const deleteLead = useDeleteLead()
  const { checkRole } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = (leads || []).filter(
    (l) =>
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.telefone.includes(search)
  )

  const canDelete = checkRole(['admin', 'gestor'])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            aria-label="Buscar leads"
          />
          <Button onClick={() => { setEditingLead(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum lead encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-3 text-left text-sm font-semibold">Nome</th>
                <th className="p-3 text-left text-sm font-semibold">Telefone</th>
                <th className="p-3 text-left text-sm font-semibold">Classificação</th>
                <th className="p-3 text-left text-sm font-semibold">Etapa</th>
                <th className="p-3 text-left text-sm font-semibold">Atualizado</th>
                <th className="p-3 text-left text-sm font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr key={lead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-sm">{lead.nome}</td>
                  <td className="p-3 text-sm">{lead.telefone}</td>
                  <td className="p-3">
                    <Badge className={classificacaoBadgeClass(lead.classificacao)}>{lead.classificacao}</Badge>
                  </td>
                  <td className="p-3 text-sm">{lead.etapa_pipeline}</td>
                  <td className="p-3 text-sm">{formatDateTime(lead.atualizado_em)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/chat/${lead.id}`)} aria-label="Abrir chat">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingLead(lead); setFormOpen(true) }} aria-label="Editar lead">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(lead.id)} aria-label="Remover lead">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editingLead} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteLead.mutate(deleteId)
                setDeleteId(null)
              }}
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
