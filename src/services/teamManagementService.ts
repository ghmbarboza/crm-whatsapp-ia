import { supabase } from '@/integrations/supabase/client'
import type { AuditLog, Profile, UserRole, UserWithTeams } from '@/integrations/supabase/types'

export const teamKeys = {
  users: ['team', 'users'] as const,
  equipes: ['team', 'equipes'] as const,
  logs: (filters?: Record<string, string>) => ['team', 'logs', filters] as const,
}

export async function fetchUsersWithTeams(): Promise<UserWithTeams[]> {
  const [profilesRes, membershipsRes, equipesRes] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('usuarios_equipe').select('user_id, equipe_id'),
    supabase.from('equipes').select('id, nome'),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (membershipsRes.error) throw membershipsRes.error
  if (equipesRes.error) throw equipesRes.error

  const equipeMap = Object.fromEntries((equipesRes.data || []).map((e) => [e.id, e]))
  const teamsByUser: Record<string, { id: string; nome: string }[]> = {}

  for (const m of membershipsRes.data || []) {
    const eq = equipeMap[m.equipe_id]
    if (!eq) continue
    if (!teamsByUser[m.user_id]) teamsByUser[m.user_id] = []
    teamsByUser[m.user_id].push(eq)
  }

  return (profilesRes.data || []).map((p) => ({
    ...(p as Profile),
    is_active: (p as Profile).is_active ?? true,
    equipes: teamsByUser[p.id] || [],
  }))
}

export async function fetchTeamMemberIdsForGestor(gestorId: string): Promise<Set<string>> {
  const { data: myTeams } = await supabase
    .from('usuarios_equipe')
    .select('equipe_id')
    .eq('user_id', gestorId)

  if (!myTeams?.length) return new Set([gestorId])

  const equipeIds = myTeams.map((t) => t.equipe_id)
  const { data: members } = await supabase
    .from('usuarios_equipe')
    .select('user_id')
    .in('equipe_id', equipeIds)

  return new Set((members || []).map((m) => m.user_id))
}

export async function updateUserProfile(
  id: string,
  updates: Partial<Pick<Profile, 'full_name' | 'role' | 'is_active' | 'two_factor_enabled'>>
) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single()
  if (error) throw error
  await logUserActivity(id, 'permission_change', updates)
  return data as Profile
}

export async function inviteUser(params: {
  email: string
  password: string
  full_name: string
  role: UserRole
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.full_name, role: params.role },
    },
  })
  if (error) throw error
  await logUserActivity(data.user?.id ?? null, 'permission_change', {
    action: 'user_created',
    email: params.email,
    role: params.role,
  })
  return data
}

export async function setUserTeams(userId: string, equipeIds: string[]) {
  const { error: delError } = await supabase.from('usuarios_equipe').delete().eq('user_id', userId)
  if (delError) throw delError

  if (equipeIds.length > 0) {
    const { error: insError } = await supabase
      .from('usuarios_equipe')
      .insert(equipeIds.map((equipe_id) => ({ user_id: userId, equipe_id })))
    if (insError) throw insError
  }

  await logUserActivity(userId, 'permission_change', { action: 'teams_updated', equipeIds })
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  })
  if (error) throw error
  await logUserActivity(null, 'password_reset', { email })
}

export async function reset2FA(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: false })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  await logUserActivity(userId, '2fa_reset', {})
  return data as Profile
}

export async function deactivateUser(userId: string, isActive: boolean) {
  return updateUserProfile(userId, { is_active: isActive })
}

export async function logUserActivity(
  userId: string | null,
  eventType: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      acao: eventType,
      entidade: 'users',
      entidade_id: userId,
      detalhes: details,
    })
  } catch {
    // silencioso se RLS bloquear
  }
}

export async function fetchActivityLogs(filters?: {
  userId?: string
  eventType?: string
  inicio?: string
  fim?: string
}) {
  let query = supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .eq('entidade', 'users')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (filters?.userId) query = query.eq('user_id', filters.userId)
  if (filters?.eventType) query = query.eq('acao', filters.eventType)
  if (filters?.inicio) query = query.gte('criado_em', filters.inicio)
  if (filters?.fim) query = query.lte('criado_em', filters.fim)

  const { data, error } = await query
  if (error) throw error
  return data as AuditLog[]
}

export function exportActivityLogsCsv(logs: AuditLog[]): string {
  const headers = ['data', 'usuario', 'evento', 'detalhes']
  const rows = logs.map((l) => [
    l.criado_em,
    l.profiles?.full_name ?? l.user_id ?? '',
    l.acao,
    JSON.stringify(l.detalhes),
  ])
  return [headers.join(','), ...rows.map((r) => r.map((c) => JSON.stringify(c)).join(','))].join('\n')
}

export function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-600 text-white'
    case 'gestor':
      return 'bg-blue-600 text-white'
    case 'operacional':
      return 'bg-gray-500 text-white'
  }
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'gestor':
      return 'Gestor'
    case 'operacional':
      return 'Operacional'
  }
}
