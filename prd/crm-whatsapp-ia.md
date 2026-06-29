# PRD — CRM Automatizado com IA e WhatsApp

| Campo | Valor |
|-------|-------|
| **Produto** | CRM Automatizado com IA |
| **Versão do documento** | 1.0 |
| **Data** | 29/06/2026 |
| **Status** | Aprovado para desenvolvimento |
| **Idioma do produto** | pt-BR |
| **Tipo** | Web app interno (privado) |

---

## 1. Resumo executivo

Construir um CRM web que utiliza o **WhatsApp como canal principal** de entrada e atendimento de leads. O sistema deve **qualificar leads automaticamente** via análise de sentimento e classificação (quente, morno, frio), oferecer um **pipeline visual** para gestão comercial e permitir **chat ao vivo** integrado. A solução é voltada à equipe de vendas interna, com controle de permissões por papel (admin, gestor, operacional) e integração com API Evolution (não oficial) para WhatsApp.

---

## 2. Problema e oportunidade

### Problema
- Leads chegam pelo WhatsApp sem padronização de registro e qualificação.
- A equipe perde tempo classificando manualmente o interesse e o sentimento do lead.
- Não há visibilidade centralizada do funil de vendas nem histórico unificado de conversas.
- Gestores não conseguem acompanhar performance do time em tempo real.

### Oportunidade
- Automatizar qualificação com IA reduz tempo de triagem e acelera follow-up em leads quentes.
- Pipeline visual e alertas automáticos aumentam taxa de conversão.
- Chat ao vivo com contexto do lead melhora qualidade do atendimento.

---

## 3. Objetivos e métricas de sucesso

### Objetivos de negócio
1. Centralizar todos os leads originados via WhatsApp em um único CRM.
2. Automatizar classificação de leads (quente/morno/frio) e análise de sentimento.
3. Dar visibilidade ao funil de vendas com pipeline arrastável.
4. Permitir atendimento em tempo real com histórico preservado.

### Métricas de sucesso (KPIs)
| Métrica | Meta inicial |
|---------|--------------|
| Tempo médio de qualificação de lead | < 2 min após primeira mensagem |
| % de leads classificados automaticamente | ≥ 90% |
| Taxa de resposta a leads quentes (alerta enviado) | ≥ 80% em 15 min |
| Adoção pela equipe operacional | 100% dos vendedores ativos em 30 dias |
| Uptime da integração WhatsApp | ≥ 99% em horário comercial |

---

## 4. Personas e papéis

| Persona | Papel no sistema | Necessidades principais |
|---------|------------------|-------------------------|
| **Vendedor (Operacional)** | `operacional` | Ver e gerenciar apenas seus leads; chat ao vivo; mover leads no pipeline |
| **Gestor de vendas** | `gestor` | Visão do time; reatribuir leads; acompanhar métricas e alertas |
| **Administrador** | `admin` | Controle total; configurações; equipes; integração WhatsApp |

### Matriz de permissões

| Ação | Admin | Gestor | Operacional |
|------|:-----:|:------:|:-----------:|
| Ver todos os leads | ✅ | ✅ (time) | ❌ (apenas próprios) |
| Criar/editar leads | ✅ | ✅ | ✅ (próprios) |
| Excluir leads (soft delete) | ✅ | ✅ | ❌ |
| Gerenciar equipes | ✅ | ❌ | ❌ |
| Configurar WhatsApp | ✅ | ❌ | ❌ |
| Ver dashboard completo | ✅ | ✅ | ❌ (visão limitada) |
| Chat ao vivo | ✅ | ✅ | ✅ |

---

## 5. Escopo funcional

### 5.1 Módulos principais

```
┌─────────────────────────────────────────────────────────────┐
│                        CRM Web App                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Dashboard│ Pipeline │  Leads   │   Chat   │ Configurações   │
│ (métricas)│ (kanban) │ (lista)  │ (ao vivo)│ (admin)         │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬────────┘
     │          │          │          │              │
     └──────────┴──────────┴──────────┴──────────────┘
                           │
              ┌────────────┴────────────┐
              │      Supabase Backend    │
              │  PostgreSQL · Auth · RLS │
              │  Realtime · Edge Functions│
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │   Evolution API (WhatsApp) │
              │   + Análise de IA          │
              └───────────────────────────┘
```

### 5.2 User stories e critérios de aceite

#### US-01 — Autenticação e controle de acesso
**Como** usuário do sistema, **quero** fazer login com e-mail e senha, **para** acessar apenas as funcionalidades do meu papel.

**Critérios de aceite:**
- [ ] Login com e-mail e senha via Supabase Auth.
- [ ] Redirecionamento automático para dashboard após login bem-sucedido.
- [ ] Usuário sem permissão é redirecionado com `Navigate` (React Router).
- [ ] Hook `checkRole` bloqueia componentes conforme papel (`admin`, `gestor`, `operacional`).
- [ ] Suporte a 2FA (campo `two_factor_enabled` no schema; implementação conforme fase 2).

#### US-02 — Recebimento de leads via WhatsApp
**Como** sistema, **quero** registrar automaticamente leads que enviam mensagem pelo WhatsApp, **para** que nenhum contato se perca.

**Critérios de aceite:**
- [ ] Mensagens recebidas via Evolution API criam ou atualizam lead existente (match por telefone).
- [ ] Lead criado com `origem = 'WhatsApp'`, `etapa_pipeline = 'Novo'`.
- [ ] Mensagem salva em `mensagens_whatsapp` com `tipo = 'recebida'`.
- [ ] Classificação e sentimento preenchidos pela análise de IA após processamento.
- [ ] Mensagens **não podem ser editadas** pelo usuário após registro.

#### US-03 — Qualificação automática por IA
**Como** gestor de vendas, **quero** que leads sejam classificados automaticamente, **para** priorizar follow-up.

**Critérios de aceite:**
- [ ] Classificação restrita a: `quente`, `morno`, `frio`.
- [ ] Sentimento restrito a: `positivo`, `neutro`, `negativo`.
- [ ] Cada mensagem recebida passa por análise (`analisado = true` após processamento).
- [ ] Lead quente gera alerta automático (ver US-07).
- [ ] Badge visual no lead: quente (`bg-red-500`), morno (`bg-yellow-400`), frio (`bg-gray-400`).

#### US-04 — Pipeline de vendas (Kanban)
**Como** vendedor, **quero** visualizar e mover leads entre etapas do funil, **para** acompanhar o progresso comercial.

**Critérios de aceite:**
- [ ] Colunas fixas: `Novo` → `Em Contato` → `Qualificado` → `Fechado`.
- [ ] Drag and drop fluido entre colunas adjacentes (avanço ou retorno à etapa anterior imediata; **sem saltos**).
- [ ] Alternativa acessível via teclado (setas) para mudança de etapa.
- [ ] Ordenação padrão: `etapa_pipeline ASC`, `atualizado_em DESC`.
- [ ] Empty state: "Nenhum lead encontrado nessa etapa" com ícone `Inbox`.

#### US-05 — Gestão de leads (CRUD)
**Como** vendedor, **quero** criar, editar e consultar leads, **para** manter dados atualizados.

**Critérios de aceite:**
- [ ] Campos obrigatórios: `nome`, `telefone`, `classificacao`, `sentimento`, `etapa_pipeline`.
- [ ] Campos opcionais: `email`, `empresa`, `anotacoes` (máx. 1000 caracteres).
- [ ] Validação de e-mail no front e back.
- [ ] Telefone formatado em pt-BR: `(99) 99999-9999`.
- [ ] Soft delete via `deleted_at`; lead excluído não aparece na UI padrão.
- [ ] Confirmação em modal antes de remover: "Tem certeza que deseja remover este lead?"
- [ ] Limite de 100 leads por usuário operacional.

#### US-06 — Chat ao vivo
**Como** vendedor, **quero** conversar com o lead pelo WhatsApp dentro do CRM, **para** atender sem sair da plataforma.

**Critérios de aceite:**
- [ ] Interface de chat com histórico ordenado por `timestamp DESC`.
- [ ] Envio de mensagens registra em `mensagens_whatsapp` com `tipo = 'enviada'`.
- [ ] Mensagens novas piscam e disparam notificação sonora discreta.
- [ ] Anexos limitados a **5 MB**.
- [ ] Status de conexão WhatsApp exibido em tempo real (`Conectado` / `Desconectado`) com ícone `Wifi`, via Supabase Realtime.
- [ ] Ícone `MessageCircle` na navegação.

#### US-07 — Alertas automáticos para leads quentes
**Como** gestor, **quero** ser notificado quando um lead for classificado como quente, **para** agir rapidamente.

**Critérios de aceite:**
- [ ] Alerta criado em tabela `alertas` com `tipo = 'lead_quente'`.
- [ ] Mensagem de follow-up enviada via Evolution API (sem template fixo; mensagem única).
- [ ] Campo `enviado` e `enviado_em` atualizados após envio.
- [ ] Máximo de **50 notificações por dia** por usuário/sistema.
- [ ] Ícone `Bell` para notificações na interface.

#### US-08 — Dashboard e métricas
**Como** gestor, **quero** visualizar indicadores do funil e da equipe, **para** tomar decisões baseadas em dados.

**Critérios de aceite:**
- [ ] Gráficos com Recharts (distribuição por etapa, classificação, sentimento).
- [ ] Cards com totais: leads novos, quentes, em contato, fechados.
- [ ] Filtros por período e equipe (gestor/admin).
- [ ] Loading com `Loader2` e skeletons em cards/listas.
- [ ] Ícone `BarChart2` na sidebar.

#### US-09 — Gestão de equipes (Admin)
**Como** administrador, **quero** organizar usuários em equipes, **para** que gestores vejam apenas seu time.

**Critérios de aceite:**
- [ ] CRUD de equipes (`equipes`).
- [ ] Associação usuário-equipe (`usuarios_equipe`).
- [ ] Gestor visualiza leads dos membros da sua equipe.

#### US-10 — Configurações e integração WhatsApp (Admin)
**Como** administrador, **quero** configurar a conexão com a Evolution API, **para** manter o canal WhatsApp ativo.

**Critérios de aceite:**
- [ ] Tela de configuração acessível apenas a `admin`.
- [ ] Exibição de status de conexão em tempo real.
- [ ] Feedback de erro com toast (`AlertCircle`) e sugestão de ação.
- [ ] Ícone `Settings` na sidebar.

---

## 6. Requisitos não funcionais

| Categoria | Requisito |
|-----------|-----------|
| **Idioma** | Interface e mensagens em pt-BR |
| **Responsividade** | Layout adaptável mobile/desktop; menus colapsados em mobile; painéis laterais como Sheet |
| **Acessibilidade** | Labels em inputs, `tabIndex`, contraste mínimo azul-600 sobre branco, `aria-labels`, foco visível |
| **Performance** | Listas com skeleton loading; queries cacheadas via TanStack React Query v5 |
| **Segurança** | RLS no Supabase; soft delete; mensagens imutáveis; auth obrigatória |
| **Disponibilidade** | Realtime para status WhatsApp e novas mensagens |
| **Privacidade** | Projeto interno; dados de leads restritos por papel |

---

## 7. Arquitetura técnica

### 7.1 Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS + shadcn/ui |
| **Estado servidor** | TanStack React Query v5 |
| **Roteamento** | React Router DOM v6 |
| **Formulários** | React Hook Form + Zod |
| **Datas** | date-fns |
| **Gráficos** | Recharts |
| **Ícones** | Lucide React |
| **Backend** | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions, Realtime) |
| **WhatsApp** | Evolution API (não oficial) |
| **IA** | Análise de sentimento e classificação (Edge Function ou serviço externo) |

### 7.2 Estrutura de pastas

```
src/
├── components/     # Componentes React reutilizáveis (UI)
├── screens/        # Telas/páginas da aplicação
├── hooks/          # Hooks customizados (auth, queries)
├── services/       # Acesso a API/Supabase
├── utils/          # Helpers gerais
└── integrations/
    └── supabase/
        └── client.ts   # Cliente Supabase centralizado
```

### 7.3 Padrões de código

- **Nomenclatura:** camelCase (TS), PascalCase (componentes React), snake_case (SQL).
- **Queries:** `useQuery` para leitura; `useMutation` para escrita; `queryClient.invalidateQueries` pós-mutation.
- **Erros:** try/catch + toast (3s, bottom-right); log em console apenas em dev.
- **Formulários:** `zodResolver` + schemas Zod por formulário; erros inline com `text-red-500` e `AlertCircle`.
- **Estilização:** apenas classes Tailwind; sem styles inline.

---

## 8. Design system

### 8.1 Paleta de cores

| Token | Hex | Uso Tailwind |
|-------|-----|--------------|
| Blue primary | `#2563EB` | `bg-blue-600`, `text-blue-600` |
| Blue light | `#3B82F6` | `bg-blue-500`, `text-blue-500` |
| Blue dark | `#1E40AF` | `bg-blue-800`, `text-blue-800` |
| Gray 100 | `#F3F4F6` | `bg-gray-100` |
| Gray 200 | `#E5E7EB` | `bg-gray-200` |
| Gray 400 | `#9CA3AF` | `text-gray-400` |
| Gray 700 | `#374151` | `text-gray-700` |
| Red 500 | `#EF4444` | Erros, badge lead quente |
| Green 500 | `#22C55E` | Sucesso |
| Yellow 400 | `#FBBF24` | Alertas, badge lead morno |

### 8.2 Tipografia

- **Fonte:** Inter, sans-serif
- **Pesos:** 400 (corpo), 600 (títulos), 700 (cabeçalhos)
- **Tamanhos:** base 16px; h1 `text-3xl font-bold`; subtítulos `text-xl`; labels `text-sm font-semibold`

### 8.3 Espaçamento e forma

- Cards: `p-4`; telas: `p-6`; grids: `gap-4`; formulários: `mb-4`
- Border radius: `rounded-md` (6px); avatares: `rounded-full`
- Sombras: `shadow-sm` (básico), `shadow-md` (cards/modais)

### 8.4 Componentes shadcn/ui

Button, Card, Dialog, Input, Select, Table, Tabs, Badge, Toast, Sheet, DropdownMenu, Tooltip, Separator, Avatar, ScrollArea, Popover, Command, Calendar, AlertDialog, Switch, Textarea, Label, RadioGroup, Checkbox.

**Variantes principais:**
- Button primary: `bg-blue-600 hover:bg-blue-700 text-white`
- Button secondary: `bg-gray-200 hover:bg-gray-300 text-gray-700`
- Table header: `bg-blue-600 text-white`
- Tab ativa: `bg-blue-600 text-white`

### 8.5 Navegação (Sidebar)

| Rota | Label | Ícone Lucide |
|------|-------|--------------|
| `/dashboard` | Dashboard | `BarChart2` |
| `/pipeline` | Pipeline | `Columns` |
| `/leads` | Leads | `User` |
| `/configuracoes` | Configurações | `Settings` |

Breadcrumbs em telas detalhadas; botão voltar com `ChevronLeft`.

---

## 9. Modelo de dados

### 9.1 Diagrama entidade-relacionamento

```
users ─────┬───── leads (responsavel_id, user_id)
           │
           ├───── mensagens_whatsapp (enviado_por)
           │
           └───── usuarios_equipe ─── equipes

leads ─────┬───── mensagens_whatsapp
           └───── alertas
```

### 9.2 Tabelas principais

#### `users`
| Coluna | Tipo | Restrições |
|--------|------|------------|
| id | UUID | PK, default `gen_random_uuid()` |
| email | TEXT | UNIQUE, NOT NULL |
| full_name | TEXT | NOT NULL |
| password_hash | TEXT | NOT NULL |
| role | TEXT | `admin` \| `gestor` \| `operacional` |
| two_factor_enabled | BOOLEAN | default FALSE |
| created_at / updated_at | TIMESTAMPTZ | auto |

#### `leads`
| Coluna | Tipo | Restrições |
|--------|------|------------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| nome | TEXT | NOT NULL |
| telefone | TEXT | NOT NULL |
| email | TEXT | opcional |
| empresa | TEXT | opcional |
| origem | TEXT | default `'WhatsApp'` |
| classificacao | TEXT | `quente` \| `morno` \| `frio` |
| sentimento | TEXT | `positivo` \| `neutro` \| `negativo` |
| etapa_pipeline | TEXT | `Novo` \| `Em Contato` \| `Qualificado` \| `Fechado` |
| responsavel_id | UUID | FK → users |
| anotacoes | TEXT | máx. 1000 chars |
| criado_em / atualizado_em | TIMESTAMPTZ | auto |
| deleted_at | TIMESTAMPTZ | soft delete |

**RLS:** `deleted_at IS NULL AND (auth.uid() = user_id OR role admin/gestor)`

#### `mensagens_whatsapp`
| Coluna | Tipo | Restrições |
|--------|------|------------|
| id | UUID | PK |
| lead_id | UUID | FK → leads, CASCADE |
| enviado_por | UUID | FK → users |
| conteudo | TEXT | NOT NULL, imutável |
| timestamp | TIMESTAMPTZ | default now() |
| tipo | TEXT | `recebida` \| `enviada` |
| sentimento | TEXT | `positivo` \| `neutro` \| `negativo` |
| analisado | BOOLEAN | default FALSE |

#### `equipes` / `usuarios_equipe`
Equipes com nome único; associação N:N usuário-equipe.

#### `alertas`
| Coluna | Tipo | Restrições |
|--------|------|------------|
| tipo | TEXT | `lead_quente` |
| enviado | BOOLEAN | default FALSE |
| mensagem | TEXT | NOT NULL |

### 9.3 Triggers e funções

- `updated_at_trig()`: atualiza `updated_at` / `atualizado_em` em UPDATE.
- Aplicado em: `users`, `leads`, `mensagens_whatsapp`, `equipes`.

### 9.4 Formato de datas

- **Armazenamento:** ISO 8601 UTC.
- **Exibição:** pt-BR (`DD/MM/YYYY HH:mm`), convertido para fuso local do usuário.

---

## 10. Regras de negócio

| # | Regra |
|---|-------|
| RN-01 | Transições de pipeline: apenas avanço ou retorno à etapa anterior imediata |
| RN-02 | Exclusão física de leads é proibida; usar soft delete (`deleted_at`) |
| RN-03 | Mensagens WhatsApp são imutáveis após registro |
| RN-04 | Alertas automáticos apenas para leads `quente` |
| RN-05 | Máximo 100 leads por usuário operacional |
| RN-06 | Máximo 50 notificações por dia |
| RN-07 | Upload de anexos no chat: máximo 5 MB |
| RN-08 | Anotações internas: máximo 1000 caracteres |
| RN-09 | Ordenação de listas: `etapa_pipeline ASC`, `atualizado_em DESC` |
| RN-10 | Histórico de mensagens: `timestamp DESC` |

---

## 11. Padrões de UX

| Estado | Comportamento |
|--------|---------------|
| **Loading** | `Loader2` animado centralizado; skeletons em listas/cards |
| **Empty** | Mensagem clara + ícone `Inbox` |
| **Error** | Borda vermelha + `AlertCircle` + sugestão de ação |
| **Confirmação** | Dialog modal com Confirmar (primary) e Cancelar (secondary) |
| **Feedback** | Toast 3s, bottom-right; `Check` (sucesso), `AlertCircle` (erro) |
| **Mobile** | Sidebar colapsada; Sheet para painéis laterais; botões com área de toque ampla |

---

## 12. Integrações externas

### 12.1 Evolution API (WhatsApp)
- Recebimento de mensagens → criação/atualização de lead + registro em `mensagens_whatsapp`.
- Envio de mensagens pelo chat ao vivo.
- Envio de alertas de follow-up para leads quentes.
- Status de conexão sincronizado via Realtime.

### 12.2 Análise de IA
- Input: conteúdo da mensagem recebida.
- Output: `classificacao` (quente/morno/frio) + `sentimento` (positivo/neutro/negativo).
- Processamento assíncrono; flag `analisado` atualizada após conclusão.

---

## 13. Fases de entrega

### Fase 1 — Fundação (MVP)
- [ ] Setup projeto (Vite + React + TS + Tailwind + shadcn/ui)
- [ ] Supabase: schema, RLS, Auth
- [ ] Login e controle de papéis
- [ ] CRUD de leads + listagem
- [ ] Pipeline Kanban com drag and drop
- [ ] Sidebar e navegação base

### Fase 2 — WhatsApp e chat
- [ ] Integração Evolution API (receber/enviar)
- [ ] Chat ao vivo com histórico
- [ ] Status de conexão em tempo real
- [ ] Registro automático de leads

### Fase 3 — IA e automação
- [ ] Análise de sentimento e classificação automática
- [ ] Alertas para leads quentes
- [ ] Badges visuais de classificação

### Fase 4 — Gestão e métricas
- [ ] Dashboard com Recharts
- [ ] Gestão de equipes (admin)
- [ ] Configurações de integração
- [ ] Notificações (Bell)

### Fase 5 — Refinamento
- [ ] 2FA
- [ ] Testes E2E dos fluxos críticos
- [ ] Otimização de performance e acessibilidade

---

## 14. Fora de escopo (v1)

- API oficial do WhatsApp Business (Meta).
- App mobile nativo (apenas web responsivo).
- Integração com ERP/CRM externos.
- Campanhas de marketing em massa.
- Multi-idioma (apenas pt-BR).
- Billing e planos (uso interno).

---

## 15. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Instabilidade da Evolution API | Alto | Monitoramento de status; retry com backoff; alertas de desconexão |
| Limites da API não oficial | Médio | Documentar limites; fallback manual de envio |
| Qualidade da classificação IA | Médio | Permitir correção manual pelo vendedor; revisar prompts/modelo |
| RLS mal configurado | Alto | Testes de permissão por papel; revisão de policies antes do deploy |

---

## 16. Glossário

| Termo | Definição |
|-------|-----------|
| **Lead quente** | Lead com alto interesse de compra, classificado automaticamente pela IA |
| **Pipeline** | Funil visual com etapas: Novo → Em Contato → Qualificado → Fechado |
| **Evolution API** | API não oficial para integração com WhatsApp |
| **RLS** | Row Level Security — políticas de acesso a nível de linha no PostgreSQL |
| **Soft delete** | Exclusão lógica via `deleted_at`, sem remoção física do registro |

---

## 17. Referências

- Base de conhecimento do projeto: `knowledge-base.md`
- Cliente Supabase: `src/integrations/supabase/client.ts`
- Documentação Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com

---

*Este PRD é a fonte de verdade para desenvolvimento. Implementações que divergirem do especificado devem ser documentadas em comentário de código ou mensagem de commit, referenciando a seção afetada.*
