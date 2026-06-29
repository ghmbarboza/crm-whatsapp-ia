import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Profile, UserRole } from '@/integrations/supabase/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  role: UserRole | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  checkRole: (roles: UserRole | UserRole[]) => boolean
  acceptTerms: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const VALID_ROLES: UserRole[] = ['admin', 'gestor', 'operacional']

function resolveRole(user: User | null, profile: Profile | null): UserRole | null {
  if (profile?.role && VALID_ROLES.includes(profile.role)) return profile.role
  if (!user) return null
  const metaRole = user.user_metadata?.role as UserRole | undefined
  if (metaRole && VALID_ROLES.includes(metaRole)) return metaRole
  return 'operacional'
}

function buildProfileFromUser(user: User): Omit<Profile, 'created_at' | 'updated_at'> {
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Usuário',
    role: resolveRole(user, null) ?? 'operacional',
    two_factor_enabled: false,
    is_active: true,
    terms_accepted_at: null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const role = resolveRole(user, profile)

  const loadProfile = async (authUser: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
    }

    if (data) {
      setProfile({ ...data, is_active: data.is_active ?? true })
      return
    }

    const draft = buildProfileFromUser(authUser)
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert(draft)
      .select('*')
      .single()

    if (created) {
      setProfile({ ...created, is_active: created.is_active ?? true })
      return
    }

    if (insertError) {
      console.warn('Perfil auto-provision falhou, usando fallback local:', insertError.message)
    }

    setProfile({
      ...draft,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        await loadProfile(s.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setSession(data.session)
      setUser(data.user)
      if (data.user) {
        await loadProfile(data.user)
      }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'operacional' },
      },
    })
    if (error) throw error
    return { needsEmailConfirmation: !data.session }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw error
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  const checkRole = (roles: UserRole | UserRole[]) => {
    const currentRole = resolveRole(user, profile)
    if (!currentRole) return false
    const allowed = Array.isArray(roles) ? roles : [roles]
    return allowed.includes(currentRole)
  }

  const acceptTerms = async () => {
    if (!user) return
    const termsAt = new Date().toISOString()

    setProfile((prev) => (prev ? { ...prev, terms_accepted_at: termsAt } : prev))

    const { error } = await supabase
      .from('profiles')
      .update({ terms_accepted_at: termsAt })
      .eq('id', user.id)

    if (error) {
      setProfile((prev) => (prev ? { ...prev, terms_accepted_at: null } : prev))
      throw error
    }

    await loadProfile(user)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        role,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
        checkRole,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
