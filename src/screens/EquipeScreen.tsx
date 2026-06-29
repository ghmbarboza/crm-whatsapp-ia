import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  equipesKeys,
  fetchEquipes,
  fetchEquipeMembers,
  fetchProfiles,
  createEquipe,
  addUserToEquipe,
} from '@/services/equipesService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner, EmptyState } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function EquipeScreen() {
  const queryClient = useQueryClient()
  const [newTeamName, setNewTeamName] = useState('')
  const [selectedEquipe, setSelectedEquipe] = useState<string>('')

  const { data: equipes, isLoading } = useQuery({
    queryKey: equipesKeys.all,
    queryFn: fetchEquipes,
  })

  const { data: members } = useQuery({
    queryKey: equipesKeys.members(selectedEquipe),
    queryFn: () => fetchEquipeMembers(selectedEquipe),
    enabled: !!selectedEquipe,
  })

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  })

  const createMutation = useMutation({
    mutationFn: createEquipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipesKeys.all })
      setNewTeamName('')
      toast.success('Equipe criada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, equipeId }: { userId: string; equipeId: string }) =>
      addUserToEquipe(userId, equipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipesKeys.members(selectedEquipe) })
      toast.success('Membro adicionado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(equipes || []).length === 0 ? (
              <EmptyState message="Nenhuma equipe cadastrada" />
            ) : (
              <ul className="space-y-2">
                {(equipes || []).map((eq) => (
                  <li key={eq.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedEquipe(eq.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedEquipe === eq.id ? 'bg-[#0D4F8B] text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {eq.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova equipe"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <Button
                onClick={() => createMutation.mutate(newTeamName)}
                disabled={!newTeamName.trim() || createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedEquipe ? (
              <EmptyState message="Selecione uma equipe para ver os membros" />
            ) : (
              <>
                <ul className="space-y-2">
                  {(members || []).map((m) => (
                    <li key={m.user_id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                      {(m.profiles as { full_name?: string })?.full_name ?? m.user_id}
                    </li>
                  ))}
                </ul>

                <div>
                  <Label>Adicionar membro</Label>
                  <Select onValueChange={(userId) => addMemberMutation.mutate({ userId, equipeId: selectedEquipe })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {(profiles || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} ({p.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
