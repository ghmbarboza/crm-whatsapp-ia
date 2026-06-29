import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  MoreVertical,
  Pencil,
  ShieldOff,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import {
  teamKeys,
  fetchUsersWithTeams,
  fetchTeamMemberIdsForGestor,
  updateUserProfile,
  inviteUser,
  setUserTeams,
  requestPasswordReset,
  reset2FA,
  deactivateUser,
  fetchActivityLogs,
  exportActivityLogsCsv,
  roleBadgeClass,
  roleLabel,
} from '@/services/teamManagementService'
import {
  fetchEquipes,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  equipesKeys,
} from '@/services/equipesService'
import type { UserRole, UserWithTeams } from '@/integrations/supabase/types'
import { formatDateTime } from '@/utils/dates'
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
import { cn } from '@/lib/utils'

interface UserFormState {
  full_name: string
  email: string
  role: UserRole
  password: string
  equipeIds: string[]
}

const EMPTY_FORM: UserFormState = {
  full_name: '',
  email: '',
  role: 'operacional',
  password: '',
  equipeIds: [],
}

function UserActions({
  user,
  isAdmin,
  currentUserId,
  onEdit,
  onResetPassword,
  onReset2FA,
  onToggleActive,
}: {
  user: UserWithTeams
  isAdmin: boolean
  currentUserId: string
  onEdit: () => void
  onResetPassword: () => void
  onReset2FA: () => void
  onToggleActive: () => void
}) {
  const isSelf = user.id === currentUserId
  const disabled = !user.is_active

  return (
    <div className="hidden items-center gap-1 md:flex">
      {(isAdmin || !disabled) && (
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled && !isAdmin} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onResetPassword} aria-label="Reset senha">
        <KeyRound className="h-4 w-4" />
      </Button>
      {isAdmin && user.two_factor_enabled && (
        <Button variant="ghost" size="icon" onClick={onReset2FA} aria-label="Reset 2FA">
          <ShieldOff className="h-4 w-4" />
        </Button>
      )}
      {isAdmin && !isSelf && (
        <Button variant="ghost" size="sm" onClick={onToggleActive}>
          {user.is_active ? 'Inativar' : 'Reativar'}
        </Button>
      )}
    </div>
  )
}

export function TeamManagementPage() {
  const queryClient = useQueryClient()
  const { profile, checkRole } = useAuth()
  const isAdmin = checkRole(['admin'])

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithTeams | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'password' | '2fa' | 'deactivate'
    user: UserWithTeams
    step: 1 | 2
  } | null>(null)
  const [teamForm, setTeamForm] = useState({ id: '', nome: '' })
  const [logFilters, setLogFilters] = useState({ eventType: 'all', userId: 'all' })

  const { data: users, isLoading } = useQuery({
    queryKey: teamKeys.users,
    queryFn: fetchUsersWithTeams,
  })

  const { data: gestorTeamIds } = useQuery({
    queryKey: ['gestor-team-ids', profile?.id],
    queryFn: () => fetchTeamMemberIdsForGestor(profile!.id),
    enabled: !!profile && !isAdmin,
  })

  const { data: equipes } = useQuery({
    queryKey: equipesKeys.all,
    queryFn: fetchEquipes,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: teamKeys.logs(logFilters),
    queryFn: () =>
      fetchActivityLogs({
        eventType: logFilters.eventType !== 'all' ? logFilters.eventType : undefined,
        userId: logFilters.userId !== 'all' ? logFilters.userId : undefined,
      }),
    enabled: isAdmin || checkRole(['gestor']),
  })

  const visibleUsers = useMemo(() => {
    if (!users) return []
    if (isAdmin) return users
    if (!gestorTeamIds) return []
    return users.filter((u) => gestorTeamIds.has(u.id))
  }, [users, isAdmin, gestorTeamIds])

  const visibleLogs = useMemo(() => {
    if (!logs) return []
    if (isAdmin) return logs
    if (!gestorTeamIds) return []
    return logs.filter((l) => l.user_id && gestorTeamIds.has(l.user_id))
  }, [logs, isAdmin, gestorTeamIds])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: teamKeys.users })
    queryClient.invalidateQueries({ queryKey: teamKeys.logs() })
  }

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        if (isAdmin) {
          await updateUserProfile(editingUser.id, {
            full_name: form.full_name,
            role: form.role,
          })
          await setUserTeams(editingUser.id, form.equipeIds)
        } else {
          await updateUserProfile(editingUser.id, { full_name: form.full_name })
        }
      } else {
        const result = await inviteUser({
          email: form.email,
          password: form.password || 'Temp1234!',
          full_name: form.full_name,
          role: form.role,
        })
        if (result.user && form.equipeIds.length > 0) {
          await setUserTeams(result.user.id, form.equipeIds)
        }
      }
    },
    onSuccess: () => {
      invalidate()
      setUserDialogOpen(false)
      setEditingUser(null)
      setForm(EMPTY_FORM)
      toast.success('Usuário atualizado')
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
  })

  const teamMutation = useMutation({
    mutationFn: async () => {
      if (teamForm.id) return updateEquipe(teamForm.id, teamForm.nome)
      return createEquipe(teamForm.nome)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipesKeys.all })
      setTeamDialogOpen(false)
      setTeamForm({ id: '', nome: '' })
      toast.success('Equipe salva')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openCreateUser = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setUserDialogOpen(true)
  }

  const openEditUser = (user: UserWithTeams) => {
    setEditingUser(user)
    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      password: '',
      equipeIds: user.equipes.map((e) => e.id),
    })
    setUserDialogOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    const { user, type, step } = confirmAction

    if (type === 'password') {
      if (user.two_factor_enabled && step === 1) {
        setConfirmAction({ ...confirmAction, step: 2 })
        return
      }
      await requestPasswordReset(user.email)
      toast.success('E-mail de redefinição enviado')
    } else if (type === '2fa') {
      await reset2FA(user.id)
      toast.success('2FA resetado')
      invalidate()
    } else if (type === 'deactivate') {
      if (step === 1) {
        setConfirmAction({ ...confirmAction, step: 2 })
        return
      }
      await deactivateUser(user.id, !user.is_active)
      toast.success(user.is_active ? 'Usuário inativado' : 'Usuário reativado')
      invalidate()
    }
    setConfirmAction(null)
  }

  const exportLogs = () => {
    const csv = exportActivityLogsCsv(visibleLogs)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe e Permissões</h1>
          <p className="text-sm text-gray-500">
            {visibleUsers.length} usuário{visibleUsers.length !== 1 ? 's' : ''} visíveis
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateUser} className="bg-[#0D4F8B] hover:bg-[#1565C0]">
            <UserPlus className="h-4 w-4" />
            Adicionar Usuário
          </Button>
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="teams">Equipes</TabsTrigger>
          <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {visibleUsers.length === 0 ? (
            <EmptyState message="Nenhum usuário encontrado. Adicione o primeiro usuário ou equipe." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-3 font-semibold">Nome</th>
                      <th className="p-3 font-semibold">E-mail</th>
                      <th className="p-3 font-semibold">Permissão</th>
                      <th className="p-3 font-semibold">Time(s)</th>
                      <th className="p-3 font-semibold">Criado em</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={cn('border-b', !user.is_active && 'bg-gray-50 text-gray-400')}
                      >
                        <td className="p-3 font-medium">{user.full_name}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">
                          <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                        </td>
                        <td className="p-3">
                          {user.equipes.length
                            ? user.equipes.map((e) => e.nome).join(', ')
                            : '—'}
                        </td>
                        <td className="p-3">{formatDateTime(user.created_at)}</td>
                        <td className="p-3">
                          {user.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativado</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <UserActions
                            user={user}
                            isAdmin={isAdmin}
                            currentUserId={profile?.id ?? ''}
                            onEdit={() => openEditUser(user)}
                            onResetPassword={() =>
                              setConfirmAction({ type: 'password', user, step: 1 })
                            }
                            onReset2FA={() => setConfirmAction({ type: '2fa', user, step: 1 })}
                            onToggleActive={() =>
                              setConfirmAction({ type: 'deactivate', user, step: 1 })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'rounded-lg border bg-white p-4 shadow-sm',
                      !user.is_active && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditUser(user)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: 'password', user, step: 1 })}
                          >
                            Reset Senha
                          </DropdownMenuItem>
                          {isAdmin && user.two_factor_enabled && (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: '2fa', user, step: 1 })}
                            >
                              Reset 2FA
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                      {!user.is_active && <Badge variant="outline">Inativado</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          {isAdmin && (
            <Button
              className="mb-4"
              onClick={() => {
                setTeamForm({ id: '', nome: '' })
                setTeamDialogOpen(true)
              }}
            >
              <Users className="h-4 w-4" />
              Nova Equipe
            </Button>
          )}
          {(equipes || []).length === 0 ? (
            <EmptyState message="Nenhuma equipe cadastrada" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(equipes || []).map((eq) => (
                <li key={eq.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <span className="font-medium">{eq.nome}</span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTeamForm({ id: eq.id, nome: eq.nome })
                          setTeamDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEquipe(eq.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: equipesKeys.all })
                          toast.success('Equipe removida')
                        })}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={logFilters.eventType}
              onValueChange={(v) => setLogFilters((f) => ({ ...f, eventType: v }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos eventos</SelectItem>
                <SelectItem value="login_sucesso">Login</SelectItem>
                <SelectItem value="permission_change">Permissão</SelectItem>
                <SelectItem value="password_reset">Reset senha</SelectItem>
                <SelectItem value="2fa_reset">Reset 2FA</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Button variant="outline" onClick={exportLogs}>
                Exportar CSV
              </Button>
            )}
          </div>
          {logsLoading ? (
            <Skeleton className="h-48" />
          ) : visibleLogs.length === 0 ? (
            <EmptyState message="Nenhum log de atividade registrado" />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Usuário</th>
                    <th className="p-3 text-left">Evento</th>
                    <th className="p-3 text-left">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="p-3">{formatDateTime(log.criado_em)}</td>
                      <td className="p-3">{log.profiles?.full_name ?? '—'}</td>
                      <td className="p-3">{log.acao}</td>
                      <td className="max-w-xs truncate p-3 text-gray-500">
                        {JSON.stringify(log.detalhes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            {!editingUser && (
              <>
                <div>
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Senha temporária</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Opcional — padrão Temp1234!"
                  />
                </div>
              </>
            )}
            {isAdmin && (
              <>
                <div>
                  <Label>Permissão</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipes *</Label>
                  <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded border p-2">
                    {(equipes || []).map((eq) => (
                      <label key={eq.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.equipeIds.includes(eq.id)}
                          onCheckedChange={(checked) => {
                            setForm((f) => ({
                              ...f,
                              equipeIds: checked
                                ? [...f.equipeIds, eq.id]
                                : f.equipeIds.filter((id) => id !== eq.id),
                            }))
                          }}
                        />
                        {eq.nome}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Button
              className="w-full"
              disabled={
                saveUserMutation.isPending ||
                !form.full_name.trim() ||
                (!editingUser && !form.email.trim()) ||
                (isAdmin && form.role !== 'admin' && form.equipeIds.length === 0 && !editingUser)
              }
              onClick={() => saveUserMutation.mutate()}
            >
              {saveUserMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamForm.id ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da equipe</Label>
              <Input
                value={teamForm.nome}
                onChange={(e) => setTeamForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              disabled={teamMutation.isPending || !teamForm.nome.trim()}
              onClick={() => teamMutation.mutate()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirmAction?.type === 'password' && 'Resetar senha?'}
            {confirmAction?.type === '2fa' && 'Resetar 2FA?'}
            {confirmAction?.type === 'deactivate' &&
              (confirmAction.step === 1 ? 'Alterar status do usuário?' : 'Confirmação final')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmAction?.type === 'password' &&
              confirmAction.step === 2 &&
              'Este usuário possui 2FA ativo. Confirme o envio do e-mail de redefinição de senha.'}
            {confirmAction?.type === 'password' &&
              confirmAction.step === 1 &&
              `Enviar link de redefinição para ${confirmAction.user.email}?`}
            {confirmAction?.type === '2fa' &&
              'O usuário precisará reconfigurar a autenticação em duas etapas.'}
            {confirmAction?.type === 'deactivate' &&
              confirmAction.step === 2 &&
              'Esta ação pode impactar leads e conversas atribuídas. Confirme a inativação.'}
            {confirmAction?.type === 'deactivate' &&
              confirmAction.step === 1 &&
              `Deseja ${confirmAction.user.is_active ? 'inativar' : 'reativar'} ${confirmAction.user.full_name}?`}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirmar</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
