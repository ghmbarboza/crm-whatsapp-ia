export type UserRole = 'admin' | 'gestor' | 'operacional'
export type Classificacao = 'quente' | 'morno' | 'frio'
export type Sentimento = 'positivo' | 'neutro' | 'negativo'
export type EtapaPipeline = 'Novo' | 'Em Contato' | 'Qualificado' | 'Fechado'
export type TipoMensagem = 'recebida' | 'enviada'
export type TimelineEventType =
  | 'mudanca_etapa'
  | 'registro_resultado'
  | 'anotacao'
  | 'conversao'
  | 'atribuicao'
  | 'mensagem_recebida'
  | 'mensagem_enviada'
  | 'sugestao_ia_aceita'
  | 'anexo_enviado'

export interface TimelineEvent {
  id: string
  lead_id: string
  user_id: string | null
  tipo: TimelineEventType
  dados: Record<string, unknown>
  criado_em: string
  profiles?: { full_name: string } | null
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  two_factor_enabled: boolean
  is_active: boolean
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface UserWithTeams extends Profile {
  equipes: { id: string; nome: string }[]
}

export interface Lead {
  id: string
  user_id: string | null
  nome: string
  telefone: string
  email: string | null
  empresa: string | null
  origem: string
  classificacao: Classificacao
  sentimento: Sentimento
  etapa_pipeline: EtapaPipeline
  responsavel_id: string | null
  anotacoes: string | null
  criado_em: string
  atualizado_em: string
  deleted_at: string | null
}

export interface Mensagem {
  id: string
  lead_id: string
  enviado_por: string | null
  conteudo: string
  anexo_url: string | null
  timestamp: string
  tipo: TipoMensagem
  sentimento: Sentimento | null
  analisado: boolean
}

export interface Equipe {
  id: string
  nome: string
  criado_em: string
  atualizado_em: string
}

export interface Alerta {
  id: string
  lead_id: string
  user_id: string | null
  tipo: 'lead_quente'
  enviado: boolean
  enviado_em: string | null
  mensagem: string
  lido: boolean
  criado_em: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  acao: string
  entidade: string
  entidade_id: string | null
  detalhes: Record<string, unknown>
  criado_em: string
  profiles?: { full_name: string } | null
}

export interface MessageTemplate {
  id: string
  nome: string
  conteudo: string
  tipo: 'boas_vindas' | 'follow_up' | 'lembrete'
  ativo: boolean
  variaveis: string[]
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface SystemPreferences {
  id: string
  paleta_cores: 'azul' | 'verde' | 'vermelho'
  idioma: string
  horario_local: string
  logo_url: string | null
  mensagem_padrao: string
  updated_at: string
  updated_by: string | null
}

export interface WhatsappConfig {
  id: string
  instance_name: string
  status: 'conectado' | 'desconectado'
  qr_code: string | null
  updated_at: string
}

export interface BusinessHourSlot {
  enabled: boolean
  start: string
  end: string
}

export type BusinessHours = Record<string, BusinessHourSlot>

export interface IntegrationParameters {
  auto_message: string
  business_hours: BusinessHours
  evolution_url?: string
  evolution_api_key?: string
  evolution_instance?: string
  evolution_configured?: boolean
}

export interface IntegrationSettings {
  id: string
  type: string
  status: 'connected' | 'disconnected'
  parameters_json: IntegrationParameters
  created_at: string
  updated_at: string
}

export interface IntegrationLog {
  id: string
  event: string
  status: 'success' | 'error' | 'info'
  description: string | null
  user_id: string | null
  timestamp: string
}

export interface WhatsappNumber {
  id: string
  phone: string
  is_active: boolean
  assigned_team_id: string | null
  created_at: string
  equipes?: { id: string; nome: string } | null
}

export interface AiConfig {
  id: string
  threshold_quente: number
  threshold_morno: number
  updated_at: string
}

export interface AIClassificationSettings {
  sentiment_sensitivity: number
  threshold_quente: number
  threshold_morno: number
  positive_sentiment_ratio: number
  min_messages_volume: number
  keywords_quente: string[]
  keywords_frio: string[]
  trigger_notify_quente: boolean
  trigger_notify_morno: boolean
  trigger_notify_frio: boolean
  auto_message_preview: string
  classifier_version: string
}

export interface LeadAutoClassification {
  id: string
  lead_id: string
  classification_enum: Classificacao
  sentiment: Sentimento
  trigger_source: string
  classifier_version: string
  initial_message: string | null
  created_at: string
  leads?: { id: string; nome: string; telefone: string; etapa_pipeline: string } | null
}

export interface ClassificationReviewLog {
  id: string
  admin_id: string | null
  action: string
  example_data: Record<string, unknown>
  timestamp: string
  profiles?: { full_name: string } | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email' | 'full_name'>
        Update: Partial<Profile>
        Relationships: []
      }
      leads: {
        Row: Lead
        Insert: Partial<Lead> & Pick<Lead, 'nome' | 'telefone' | 'classificacao' | 'sentimento' | 'etapa_pipeline'>
        Update: Partial<Lead>
        Relationships: []
      }
      mensagens_whatsapp: {
        Row: Mensagem
        Insert: Partial<Mensagem> & Pick<Mensagem, 'lead_id' | 'conteudo' | 'tipo'>
        Update: Partial<Mensagem>
        Relationships: []
      }
      timeline_events: {
        Row: TimelineEvent
        Insert: Partial<TimelineEvent> & Pick<TimelineEvent, 'lead_id' | 'tipo'>
        Update: Partial<TimelineEvent>
        Relationships: []
      }
      equipes: {
        Row: Equipe
        Insert: Partial<Equipe> & Pick<Equipe, 'nome'>
        Update: Partial<Equipe>
        Relationships: []
      }
      usuarios_equipe: {
        Row: { user_id: string; equipe_id: string }
        Insert: { user_id: string; equipe_id: string }
        Update: Partial<{ user_id: string; equipe_id: string }>
        Relationships: []
      }
      alertas: {
        Row: Alerta
        Insert: Partial<Alerta> & Pick<Alerta, 'lead_id' | 'tipo' | 'mensagem'>
        Update: Partial<Alerta>
        Relationships: []
      }
      audit_logs: {
        Row: AuditLog
        Insert: Partial<AuditLog> & Pick<AuditLog, 'acao' | 'entidade'>
        Update: Partial<AuditLog>
        Relationships: []
      }
      ai_feedback: {
        Row: {
          id: string
          lead_id: string
          mensagem_id: string | null
          classificacao_ia: Classificacao
          classificacao_manual: Classificacao | null
          sentimento_ia: Sentimento | null
          sentimento_manual: Sentimento | null
          user_id: string | null
          criado_em: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      message_templates: {
        Row: MessageTemplate
        Insert: Partial<MessageTemplate> & Pick<MessageTemplate, 'nome' | 'conteudo' | 'tipo'>
        Update: Partial<MessageTemplate>
        Relationships: []
      }
      whatsapp_config: {
        Row: WhatsappConfig
        Insert: Partial<WhatsappConfig>
        Update: Partial<WhatsappConfig>
        Relationships: []
      }
      ai_config: {
        Row: AiConfig
        Insert: Partial<AiConfig>
        Update: Partial<AiConfig>
        Relationships: []
      }
      integration_settings: {
        Row: IntegrationSettings
        Insert: Partial<IntegrationSettings> & Pick<IntegrationSettings, 'type'>
        Update: Partial<IntegrationSettings>
        Relationships: []
      }
      integration_logs: {
        Row: IntegrationLog
        Insert: Partial<IntegrationLog> & Pick<IntegrationLog, 'event' | 'status'>
        Update: Partial<IntegrationLog>
        Relationships: []
      }
      whatsapp_numbers: {
        Row: WhatsappNumber
        Insert: Partial<WhatsappNumber> & Pick<WhatsappNumber, 'phone'>
        Update: Partial<WhatsappNumber>
        Relationships: []
      }
      ai_classification_settings: {
        Row: { id: string; param_name: string; param_value: unknown; updated_at: string }
        Insert: { param_name: string; param_value: unknown }
        Update: Partial<{ param_value: unknown; updated_at: string }>
        Relationships: []
      }
      lead_auto_classifications: {
        Row: LeadAutoClassification
        Insert: Partial<LeadAutoClassification> & Pick<LeadAutoClassification, 'lead_id' | 'classification_enum' | 'sentiment'>
        Update: Partial<LeadAutoClassification>
        Relationships: []
      }
      classification_review_logs: {
        Row: ClassificationReviewLog
        Insert: Partial<ClassificationReviewLog> & Pick<ClassificationReviewLog, 'action'>
        Update: Partial<ClassificationReviewLog>
        Relationships: []
      }
    }
    Views: {
      v_leads_por_etapa: { Row: { etapa_pipeline: string; total: number }; Relationships: [] }
      v_leads_por_classificacao: { Row: { classificacao: string; total: number }; Relationships: [] }
      v_leads_por_sentimento: { Row: { sentimento: string; total: number }; Relationships: [] }
      v_tempo_medio_resposta: { Row: { segundos_medio: number | null }; Relationships: [] }
      lead_reports: { Row: Record<string, unknown>; Relationships: [] }
      activity_logs: {
        Row: {
          id: string
          event_type: string
          entity_id: string | null
          user_id: string | null
          description: string
          created_at: string
          entity_type: string
          log_category: string
          status: string | null
        }
        Relationships: []
      }
      nps_survey_results: {
        Row: { id: string; score: number; respondent_lead_id: string | null; equipe_id: string | null; comentario: string | null; created_at: string }
        Insert: Partial<{ score: number; respondent_lead_id: string | null; equipe_id: string | null; comentario: string | null }>
        Update: Record<string, unknown>
        Relationships: []
      }
      report_schedules: {
        Row: { id: string; created_by: string | null; email: string; frequency: string; report_type: string; filters: Record<string, unknown>; active: boolean; created_at: string }
        Insert: Partial<{ email: string; frequency: string; report_type: string; filters: Record<string, unknown>; active: boolean; created_by: string | null }>
        Update: Record<string, unknown>
        Relationships: []
      }
      system_preferences: {
        Row: SystemPreferences
        Insert: Partial<SystemPreferences>
        Update: Partial<SystemPreferences>
        Relationships: []
      }
      custom_stages: {
        Row: { id: string; nome: string; ordem: number; created_at: string }
        Insert: Partial<{ nome: string; ordem: number }>
        Update: Partial<{ nome: string; ordem: number }>
        Relationships: []
      }
      backup_logs: {
        Row: { id: string; download_url: string; created_by: string | null; file_size: number | null; status: string; created_at: string }
        Insert: Partial<{ download_url: string; created_by: string | null; file_size: number | null; status: string }>
        Update: Partial<{ status: string }>
        Relationships: []
      }
      config_change_logs: {
        Row: { id: string; user_id: string | null; area: string; action: string; details: Record<string, unknown>; created_at: string }
        Insert: Partial<{ area: string; action: string; details: Record<string, unknown> }>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Functions: {
      log_audit: {
        Args: {
          p_acao: string
          p_entidade: string
          p_entidade_id?: string
          p_detalhes?: Record<string, unknown>
        }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
