export type UserRole = 'admin' | 'gestor' | 'operacional'
export type Classificacao = 'quente' | 'morno' | 'frio'
export type Sentimento = 'positivo' | 'neutro' | 'negativo'
export type EtapaPipeline = 'Novo' | 'Em Contato' | 'Qualificado' | 'Fechado'
export type TipoMensagem = 'recebida' | 'enviada'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  two_factor_enabled: boolean
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
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
  criado_em: string
  atualizado_em: string
}

export interface WhatsappConfig {
  id: string
  instance_name: string
  status: 'conectado' | 'desconectado'
  qr_code: string | null
  updated_at: string
}

export interface AiConfig {
  id: string
  threshold_quente: number
  threshold_morno: number
  updated_at: string
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
    }
    Views: {
      v_leads_por_etapa: { Row: { etapa_pipeline: string; total: number }; Relationships: [] }
      v_leads_por_classificacao: { Row: { classificacao: string; total: number }; Relationships: [] }
      v_leads_por_sentimento: { Row: { sentimento: string; total: number }; Relationships: [] }
      v_tempo_medio_resposta: { Row: { segundos_medio: number | null }; Relationships: [] }
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
