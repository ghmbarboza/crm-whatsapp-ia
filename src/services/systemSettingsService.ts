import { supabase } from '@/integrations/supabase/client'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'
import type { MessageTemplate, SystemPreferences } from '@/integrations/supabase/types'

export const settingsKeys = {
  preferences: ['system-preferences'] as const,
  stages: ['custom-stages'] as const,
  templates: ['message-templates-admin'] as const,
  backups: ['backup-logs'] as const,
  configLogs: ['config-change-logs'] as const,
}

export const BASE_PIPELINE_STAGES = PIPELINE_STAGES
export const LOGO_MAX_BYTES = 1_048_576
export const TEMPLATE_TEST_COOLDOWN_MS = 10_000

export const PALETTE_OPTIONS = [
  { id: 'azul' as const, label: 'Azul Corporate', primary: '#0D4F8B', accent: '#1565C0' },
  { id: 'verde' as const, label: 'Verde Natureza', primary: '#166534', accent: '#22C55E' },
  { id: 'vermelho' as const, label: 'Vermelho Energia', primary: '#B91C1C', accent: '#EF4444' },
]

export const LANGUAGE_OPTIONS = [
  { id: 'pt-BR', label: 'Português (Brasil)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'es-ES', label: 'Español' },
]

export const TIMEZONE_OPTIONS = [
  { id: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { id: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { id: 'America/New_York', label: 'New York (GMT-5)' },
]

export const TEMPLATE_TYPES = [
  { id: 'boas_vindas', label: 'Boas-vindas' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'lembrete', label: 'Lembrete' },
] as const

export const DEFAULT_VARIABLES = ['nome', 'etapa', 'data']

let lastTemplateTest = 0
let backupInProgress = false

export function canTestTemplate(): boolean {
  return Date.now() - lastTemplateTest >= TEMPLATE_TEST_COOLDOWN_MS
}

export function markTemplateTested() {
  lastTemplateTest = Date.now()
}

export function templateTestRemainingMs(): number {
  return Math.max(0, TEMPLATE_TEST_COOLDOWN_MS - (Date.now() - lastTemplateTest))
}

export function isBackupInProgress(): boolean {
  return backupInProgress
}

export function setBackupInProgress(v: boolean) {
  backupInProgress = v
}

export function applyPaletteGlobally(paletteId: SystemPreferences['paleta_cores']) {
  const palette = PALETTE_OPTIONS.find((p) => p.id === paletteId) ?? PALETTE_OPTIONS[0]
  document.documentElement.style.setProperty('--brand-primary', palette.primary)
  document.documentElement.style.setProperty('--brand-accent', palette.accent)
  localStorage.setItem('crm-palette', paletteId)
}

export function loadCachedPalette() {
  const cached = localStorage.getItem('crm-palette') as SystemPreferences['paleta_cores'] | null
  applyPaletteGlobally(cached ?? 'azul')
}

export async function fetchSystemPreferences(): Promise<SystemPreferences> {
  const { data, error } = await supabase.from('system_preferences').select('*').limit(1).single()
  if (error) throw error
  return data as SystemPreferences
}

export async function updateSystemPreferences(
  updates: Partial<Omit<SystemPreferences, 'id' | 'updated_at' | 'updated_by'>>
) {
  const { data: current } = await supabase.from('system_preferences').select('id').limit(1).single()
  if (!current) throw new Error('Preferências não encontradas')

  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('system_preferences')
    .update({ ...updates, updated_by: user?.id })
    .eq('id', current.id)
  if (error) throw error

  if (updates.paleta_cores) applyPaletteGlobally(updates.paleta_cores)
  await logConfigChange('preferences', 'update', updates)
}

export async function uploadLogo(file: File): Promise<string> {
  if (file.size > LOGO_MAX_BYTES) throw new Error('Logo deve ter no máximo 1MB')
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    throw new Error('Formato inválido. Use PNG ou JPG.')
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `logo-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('branding').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('branding').getPublicUrl(path)
  await updateSystemPreferences({ logo_url: data.publicUrl })
  await logConfigChange('branding', 'logo_upload', { path })
  return data.publicUrl
}

export interface CustomStage {
  id: string
  nome: string
  ordem: number
  created_at: string
}

export async function fetchCustomStages(): Promise<CustomStage[]> {
  const { data, error } = await supabase.from('custom_stages').select('*').order('ordem')
  if (error) throw error
  return (data ?? []) as CustomStage[]
}

export async function addCustomStage(nome: string) {
  const trimmed = nome.trim()
  if (!trimmed) throw new Error('Nome da etapa é obrigatório')
  if (BASE_PIPELINE_STAGES.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Etapa base já existe no pipeline')
  }
  const { data: existing } = await supabase.from('custom_stages').select('ordem').order('ordem', { ascending: false }).limit(1)
  const ordem = (existing?.[0]?.ordem ?? BASE_PIPELINE_STAGES.length) + 1
  const { error } = await supabase.from('custom_stages').insert({ nome: trimmed, ordem })
  if (error) throw error
  await logConfigChange('pipeline', 'stage_add', { nome: trimmed })
}

export async function removeCustomStage(id: string, nome: string) {
  const { error } = await supabase.from('custom_stages').delete().eq('id', id)
  if (error) throw error
  await logConfigChange('pipeline', 'stage_remove', { nome })
}

export interface BackupLog {
  id: string
  download_url: string
  created_by: string | null
  file_size: number | null
  status: string
  created_at: string
  profiles?: { full_name: string } | null
}

export async function fetchBackupLogs(): Promise<BackupLog[]> {
  const { data, error } = await supabase
    .from('backup_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as BackupLog[]
}

export async function createManualBackup(): Promise<{ url: string; logId: string }> {
  if (backupInProgress) throw new Error('Backup já em andamento')
  backupInProgress = true

  try {
    const [leads, templates, prefs, stages] = await Promise.all([
      supabase.from('leads').select('*').is('deleted_at', null).limit(5000),
      supabase.from('message_templates').select('*'),
      supabase.from('system_preferences').select('*').limit(1).single(),
      supabase.from('custom_stages').select('*'),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      leads: leads.data ?? [],
      message_templates: templates.data ?? [],
      system_preferences: prefs.data,
      custom_stages: stages.data ?? [],
    }

    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const filename = `crm-backup-${Date.now()}.json`
    const url = URL.createObjectURL(blob)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: log, error } = await supabase
      .from('backup_logs')
      .insert({
        download_url: filename,
        created_by: user?.id,
        file_size: blob.size,
        status: 'completed',
      })
      .select()
      .single()
    if (error) throw error

    await logConfigChange('backup', 'manual_create', { filename, size: blob.size })
    return { url, logId: log.id }
  } finally {
    backupInProgress = false
  }
}

export async function restoreBackup(file: File) {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data.exported_at) throw new Error('Arquivo de backup inválido')
  await logConfigChange('backup', 'restore_attempt', { exported_at: data.exported_at })
  // Restore is logged only — full restore would overwrite production data
}

export async function fetchMessageTemplatesAdmin(search?: string, tipo?: string) {
  let query = supabase.from('message_templates').select('*').order('nome')
  if (tipo && tipo !== 'all') query = query.eq('tipo', tipo)
  if (search?.trim()) query = query.ilike('nome', `%${search.trim()}%`)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as MessageTemplate[]
}

export async function saveMessageTemplate(
  template: Partial<MessageTemplate> & { nome: string; conteudo: string; tipo: MessageTemplate['tipo'] },
  id?: string
) {
  if (!template.nome.trim()) throw new Error('Nome do template é obrigatório')
  if (!template.conteudo.trim()) throw new Error('Conteúdo é obrigatório')

  const variaveis = template.variaveis ?? DEFAULT_VARIABLES
  const { data: { user } } = await supabase.auth.getUser()

  if (id) {
    const { error } = await supabase
      .from('message_templates')
      .update({ ...template, variaveis })
      .eq('id', id)
    if (error) throw error
    await logConfigChange('templates', 'update', { id, nome: template.nome })
  } else {
    const { error } = await supabase.from('message_templates').insert({
      ...template,
      variaveis,
      criado_por: user?.id,
      ativo: true,
    })
    if (error) throw error
    await logConfigChange('templates', 'create', { nome: template.nome })
  }
}

export async function deleteMessageTemplate(id: string, nome: string) {
  const { error } = await supabase.from('message_templates').delete().eq('id', id)
  if (error) throw error
  await logConfigChange('templates', 'delete', { id, nome })
}

export function highlightVariables(content: string): string {
  return content.replace(
    /\{\{(\w+)\}\}/g,
    '<mark class="rounded bg-yellow-200 px-1 text-yellow-900">{{$1}}</mark>'
  )
}

export function renderTemplatePreview(
  content: string,
  variables: Record<string, string>
): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || `[${key}]`)
  }
  return result
}

export function validateTemplateVariables(
  content: string,
  variables: Record<string, string>
): string | null {
  const required = ['nome', 'etapa', 'data']
  const used = required.filter((v) => content.includes(`{{${v}}}`))
  for (const v of used) {
    if (!variables[v]?.trim()) return `Preencha a variável "${v}"`
  }
  return null
}

export async function logConfigChange(area: string, action: string, details: Record<string, unknown> = {}) {
  await supabase.rpc('log_config_change', {
    p_area: area,
    p_action: action,
    p_details: details,
  })
}

export async function fetchConfigChangeLogs(limit = 50) {
  const { data, error } = await supabase
    .from('config_change_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export function exportConfigLogsCsv(
  logs: { created_at: string; area: string; action: string; profiles?: { full_name: string } | null; details: Record<string, unknown> }[]
): string {
  const header = 'Data,Área,Ação,Usuário,Detalhes'
  const rows = logs.map((l) =>
    [
      l.created_at,
      l.area,
      l.action,
      `"${(l.profiles?.full_name ?? '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details).replace(/"/g, '""')}"`,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function tipoLabel(tipo: string): string {
  return TEMPLATE_TYPES.find((t) => t.id === tipo)?.label ?? tipo
}
