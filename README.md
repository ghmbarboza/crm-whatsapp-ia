# CRM WhatsApp IA

CRM automatizado com IA e integração WhatsApp (Evolution API), construído com React + Supabase.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack React Query v5
- Supabase (Auth, PostgreSQL, RLS, Edge Functions, Realtime, Storage)
- Evolution API (WhatsApp)
- OpenAI-compatible API (classificação IA)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### 3. Aplicar migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Ou execute os arquivos em `supabase/migrations/` manualmente no SQL Editor.

### 4. Deploy Edge Functions

```bash
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy whatsapp-send
npx supabase functions deploy ai-classify
npx supabase functions deploy export-logs
```

Configure secrets no Supabase Dashboard:
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
- `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`

### 5. Criar usuários demo

Crie usuários no Supabase Auth e execute `supabase/seed.sql`.

### 6. Evolution API

Configure webhook da Evolution API para:
`https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-webhook`

### 7. Executar

```bash
npm run dev
```

## Estrutura

```
src/
├── components/     # UI e layout
├── screens/        # Telas da aplicação
├── hooks/          # useAuth, useLeads, useChat, useAlertas
├── services/       # Supabase services
├── utils/          # Helpers
└── integrations/supabase/client.ts
supabase/
├── migrations/     # Schema PostgreSQL + RLS
└── functions/      # Edge Functions
```

## Papéis

- **admin**: acesso total, configurações, equipes, auditoria
- **gestor**: visão do time, relatórios, reatribuição
- **operacional**: apenas seus leads, chat, pipeline
