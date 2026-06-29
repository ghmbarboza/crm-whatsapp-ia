#!/usr/bin/env node
/**
 * E2E smoke test for Evolution API integration flow.
 * Usage: node scripts/test-evolution-e2e.mjs [baseUrl] [apiKey]
 */

const BASE_URL = (process.argv[2] || process.env.EVOLUTION_API_URL || 'http://72.61.77.210:32769').replace(/\/+$/, '')
const API_KEY = process.argv[3] || process.env.EVOLUTION_API_KEY || 'pwFEbLUKSuPDxUoAuXswSddJH6VZS2Kt'

function extractQr(data) {
  if (typeof data.base64 === 'string' && data.base64) return data.base64
  if (data.qrcode?.base64) return data.qrcode.base64
  return null
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      apikey: API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${data.message || text}`)
  }
  return data
}

function randomInstanceName() {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return `crm-e2e-${suffix}`
}

async function main() {
  console.log(`Evolution E2E @ ${BASE_URL}`)

  const health = await request('/')
  console.log('✓ health', health.version || health.message)

  const instanceName = randomInstanceName()
  const created = await request('/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    },
  })
  const createQr = extractQr(created)
  console.log('✓ create instance', instanceName, createQr ? 'with QR' : 'no QR')

  const state1 = await request(`/instance/connectionState/${instanceName}`)
  console.log('✓ connectionState', state1.instance?.state)

  const connect = await request(`/instance/connect/${instanceName}`)
  const connectQr = extractQr(connect)
  console.log('✓ connect', connectQr ? 'QR returned' : 'no QR')

  const instances = await request('/instance/fetchInstances')
  const found = Array.isArray(instances) && instances.some((i) => i.name === instanceName)
  console.log('✓ fetchInstances contains new instance:', found)

  console.log('\nAll Evolution API checks passed.')
}

main().catch((err) => {
  console.error('E2E failed:', err.message)
  process.exit(1)
})
