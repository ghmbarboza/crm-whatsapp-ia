/**
 * Evolution API endpoint map (Evolution API v2 / Baileys).
 * Source: prd/CrawlEvolution official documentation.
 */

export const EVOLUTION_API_VERSION = '2.3.7'

export const EVOLUTION_ENDPOINTS = {
  health: { method: 'GET', path: '/', auth: 'apikey header' },
  createInstance: {
    method: 'POST',
    path: '/instance/create',
    auth: 'apikey header',
    body: { instanceName: 'string (required)', qrcode: true, integration: 'WHATSAPP-BAILEYS' },
  },
  fetchInstances: { method: 'GET', path: '/instance/fetchInstances', auth: 'apikey header' },
  connectInstance: {
    method: 'GET',
    path: '/instance/connect/{instanceName}',
    auth: 'apikey header',
    response: 'base64 QR or qrcode.base64',
  },
  connectionState: {
    method: 'GET',
    path: '/instance/connectionState/{instanceName}',
    auth: 'apikey header',
    response: 'instance.state: open | close | connecting',
  },
  sendText: {
    method: 'POST',
    path: '/message/sendText/{instanceName}',
    auth: 'apikey header',
    body: { number: 'string', text: 'string' },
  },
  findMessages: {
    method: 'POST',
    path: '/chat/findMessages/{instanceName}',
    auth: 'apikey header',
    body: { where: 'object', take: 'number', skip: 'number', orderBy: 'object' },
  },
} as const

export type EvolutionConnectionState = 'open' | 'close' | 'connecting' | string

export function isEvolutionConfigured(
  parameters?: {
    evolution_configured?: boolean
    evolution_url?: string
  } | null
): boolean {
  return Boolean(parameters?.evolution_configured && parameters?.evolution_url)
}

export function maskEvolutionApiKey(): string {
  return '••••••••••••••••'
}
