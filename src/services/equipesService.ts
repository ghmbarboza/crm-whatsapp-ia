import { supabase } from '@/integrations/supabase/client'
import type { Equipe, Profile } from '@/integrations/supabase/types'

export const equipesKeys = {
  all: ['equipes'] as const,
  members: (equipeId: string) => ['equipes', equipeId, 'members'] as const,
}

export async function fetchEquipes() {
  const { data, error } = await supabase.from('equipes').select('*').order('nome')
  if (error) throw error
  return data as Equipe[]
}

export async function createEquipe(nome: string) {
  const { data, error } = await supabase.from('equipes').insert({ nome }).select().single()
  if (error) throw error
  return data as Equipe
}

export async function updateEquipe(id: string, nome: string) {
  const { data, error } = await supabase.from('equipes').update({ nome }).eq('id', id).select().single()
  if (error) throw error
  return data as Equipe
}

export async function deleteEquipe(id: string) {
  const { error } = await supabase.from('equipes').delete().eq('id', id)
  if (error) throw error
}

export async function fetchEquipeMembers(equipeId: string) {
  const { data, error } = await supabase
    .from('usuarios_equipe')
    .select('user_id, profiles(*)')
    .eq('equipe_id', equipeId)
  if (error) throw error
  return data
}

export async function addUserToEquipe(userId: string, equipeId: string) {
  const { error } = await supabase.from('usuarios_equipe').insert({ user_id: userId, equipe_id: equipeId })
  if (error) throw error
}

export async function removeUserFromEquipe(userId: string, equipeId: string) {
  const { error } = await supabase
    .from('usuarios_equipe')
    .delete()
    .eq('user_id', userId)
    .eq('equipe_id', equipeId)
  if (error) throw error
}

export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name')
  if (error) throw error
  return data as Profile[]
}
