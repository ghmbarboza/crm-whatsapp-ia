type TranslationKey =
  | 'nav.dashboard'
  | 'nav.pipeline'
  | 'nav.leads'
  | 'nav.config'
  | 'nav.reports'
  | 'common.loading'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'empty.leads'

const translations: Record<'pt-BR', Record<TranslationKey, string>> = {
  'pt-BR': {
    'nav.dashboard': 'Dashboard',
    'nav.pipeline': 'Pipeline',
    'nav.leads': 'Leads',
    'nav.config': 'Configurações',
    'nav.reports': 'Relatórios',
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'empty.leads': 'Nenhum lead encontrado nessa etapa',
  },
}

let currentLocale: keyof typeof translations = 'pt-BR'

export function setLocale(locale: keyof typeof translations) {
  currentLocale = locale
}

export function t(key: TranslationKey): string {
  return translations[currentLocale][key] ?? key
}
