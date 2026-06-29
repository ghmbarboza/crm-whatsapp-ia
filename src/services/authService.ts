import type { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Profile, UserRole } from '@/integrations/supabase/types'

const VALID_ROLES: UserRole[] = ['admin', 'gestor', 'operacional']

function resolveRoleFromUser(user: User, profile: Profile | null): UserRole {
  if (profile?.role && VALID_ROLES.includes(profile.role)) return profile.role
  const metaRole = user.user_metadata?.role as UserRole | undefined
  if (metaRole && VALID_ROLES.includes(metaRole)) return metaRole
  return 'operacional'
}

async function provisionProfile(user: User): Promise<Profile | null> {
  const draft = {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Usuário',
    role: resolveRoleFromUser(user, null),
    two_factor_enabled: false,
    is_active: true,
    terms_accepted_at: null,
  }

  const { data: created, error } = await supabase.from('profiles').insert(draft).select('*').single()
  if (created) return { ...created, is_active: created.is_active ?? true }
  if (error) console.warn('Auto-provision de perfil falhou:', error.message)
  return null
}

export async function fetchProfileByEmail(email: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('email', email.trim().toLowerCase()).maybeSingle()
  return data
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (data) return { ...data, is_active: data.is_active ?? true }

  const provisioned = await provisionProfile(user)
  if (provisioned) return provisioned

  return {
    ...draftFromUser(user),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function draftFromUser(user: User): Profile {
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Usuário',
    role: resolveRoleFromUser(user, null),
    two_factor_enabled: false,
    is_active: true,
    terms_accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function logAuthEvent(
  acao: 'login_sucesso' | 'login_falha' | 'logout' | 'reset_senha_solicitado',
  detalhes: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      acao,
      entidade: 'auth',
      detalhes,
    })
  } catch {
    // Falha silenciosa — política RLS pode bloquear inserts anônimos
  }
}

export function getPostLoginPath(_role: UserRole): string {
  return '/dashboard'
}

export function isSsoEnabled(): boolean {
  return import.meta.env.VITE_SSO_ENABLED === 'true'
}

export async function signInWithSso(): Promise<void> {
  const provider = import.meta.env.VITE_SSO_PROVIDER || 'azure'
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as 'azure' | 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) throw error
}

export function isProfileActive(profile: Profile | null): boolean {
  if (!profile) return false
  const extended = profile as Profile & { is_active?: boolean }
  return extended.is_active !== false
}
