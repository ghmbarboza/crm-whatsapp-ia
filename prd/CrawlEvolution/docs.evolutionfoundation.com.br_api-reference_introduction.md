---
url: "https://docs.evolutionfoundation.com.br/api-reference/introduction"
title: "Introdução às APIs - Documentação do Evolution Foundation"
---

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Pular para o conteúdo principal](https://docs.evolutionfoundation.com.br/api-reference/introduction#content-area)

[Início](https://docs.evolutionfoundation.com.br/) [Evolution](https://docs.evolutionfoundation.com.br/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/api-reference/introduction)

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#vis%C3%A3o-geral)  Visão Geral

A plataforma oferece APIs REST completas para integração, automação e desenvolvimento. Cada serviço da plataforma possui sua própria API documentada com especificações OpenAPI (Swagger).**O que você vai encontrar aqui:**

- Documentação completa de todas as APIs disponíveis
- Especificações OpenAPI para cada serviço
- Exemplos de uso e integração
- Guias de autenticação e autorização

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#apis-dispon%C3%ADveis)  APIs Disponíveis

A plataforma é composta por múltiplos microserviços, cada um com sua própria API:

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#servi%C3%A7os-de-aplica%C3%A7%C3%A3o)  Serviços de Aplicação

**EvoAI Core Service**

- Gerenciamento de agentes de IA
- Custom Tools e MCP (Model Context Protocol)
- Sincronização com Evolution bots
- Base URL: `https://api.evoai.app`

**EvoAI CRM**

- Gerenciamento de conversas e mensagens
- CRUD de contatos e agentes
- Configuração de inboxes e canais
- Base URL: `https://api.evoai.app`

**EvoAuth Service**

- Autenticação e autorização
- Multi-Factor Authentication (MFA)
- Role-Based Access Control (RBAC)
- Base URL: `https://api.evoai.app`

**EvoAI Campaign**

- Criação e gerenciamento de campanhas
- Segmentação de contatos
- Automações e workflows
- Base URL: `https://api.evoai.app`

**EvoAI Processor**

- Processamento assíncrono de agentes
- Execução de workflows de IA
- Gerenciamento de filas
- Base URL: `https://api.evoai.app`

**EvoAI Knowledge**

- Upload e gerenciamento de documentos
- Busca semântica
- RAG (Retrieval-Augmented Generation)
- Base URL: `https://api.evoai.app`

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#servi%C3%A7os-de-infraestrutura-evolution)  Serviços de Infraestrutura Evolution

**Evolution API**

- Gerenciamento de instâncias WhatsApp
- Envio e recebimento de mensagens
- Integrações com chatbots
- Base URL: `https://api.evoai.app`

**Evolution Go**

- Gateway de alta performance
- Processamento concorrente
- Base URL: `https://api.evoai.app`

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#base-url)  Base URL

Todos os serviços utilizam a mesma Base URL:

- **Base URL**: `https://api.evoai.app`

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#openapi-/-swagger)  OpenAPI / Swagger

Todas as APIs possuem especificações OpenAPI completas em formato YAML. Você pode importar essas especificações em ferramentas como Postman, Insomnia, ou gerar SDKs automaticamente.

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#especifica%C3%A7%C3%B5es-dispon%C3%ADveis)  Especificações Disponíveis

#### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#servi%C3%A7os-de-aplica%C3%A7%C3%A3o-2)  Serviços de Aplicação

- **[Evo Auth Service](https://docs.evolutionfoundation.com.br/evo-auth-service/create-account)** \- Autenticação, gerenciamento de usuários e contas
- **[EvoAI Core Service](https://docs.evolutionfoundation.com.br/evo-ai-core/list-agents-by-client-id)** \- Agentes de IA, ferramentas MCP e processamento inteligente
- **[EvoAI CRM Service](https://docs.evolutionfoundation.com.br/evo-ai-crm/create-lead)** \- Gestão de contatos, conversas, inboxes, labels e macros
- **[EvoAI Processor Service](https://docs.evolutionfoundation.com.br/evo-ai-processor/chat)** \- Processamento de IA, integrações e sessões
- **[EvoAI Knowledge Service](https://docs.evolutionfoundation.com.br/evo-ai-knowledge/create-knowledge)** \- Base de conhecimento e gerenciamento de memória

#### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#servi%C3%A7os-de-infraestrutura-evolution-2)  Serviços de Infraestrutura Evolution

- **[Evolution API](https://docs.evolutionfoundation.com.br/evolution-api/verify-facebook-credentials)** \- API principal do Evolution para WhatsApp
- **[Evolution Go](https://docs.evolutionfoundation.com.br/evolution-go/get-all-instances)** \- Implementação em Go do Evolution

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#autentica%C3%A7%C3%A3o)  Autenticação

O padrão principal de autenticação nas APIs EvoAI é **API Access Token (UUID)** enviado no header `api_access_token`.Para obter credenciais e entender os detalhes completos de autenticação, consulte o guia dedicado:**[Guia Completo de Autenticação](https://docs.evolutionfoundation.com.br/api-reference/authentication)****Exemplo rápido:**

```
curl -X GET https://api.evoai.app/api/v1/agents \
  -H "api_access_token: <SEU_TOKEN_UUID>" \
  -H "Content-Type: application/json"
```

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#como-usar-esta-documenta%C3%A7%C3%A3o)  Como Usar Esta Documentação

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#navega%C3%A7%C3%A3o)  Navegação

- **Introdução** (esta página) - Visão geral das APIs e como começar
- **Autenticação** \- Guia completo de API Access Token e multi-tenant
- **Especificações OpenAPI** \- Documentação interativa de cada serviço (veja seção acima)

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#especifica%C3%A7%C3%B5es-openapi)  Especificações OpenAPI

Cada API possui uma especificação OpenAPI completa em formato YAML. Você pode:

- Importar no Postman, Insomnia ou outras ferramentas
- Gerar clientes SDK automaticamente usando `openapi-generator`
- Visualizar interativamente usando Swagger UI

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#exemplos-de-requisi%C3%A7%C3%B5es)  Exemplos de Requisições

Cada endpoint inclui exemplos de requisições e respostas com:

- Códigos de status HTTP esperados
- Estrutura de payloads de requisição
- Formato de respostas JSON

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#c%C3%B3digos-de-status-http)  Códigos de Status HTTP

Todas as APIs seguem padrões consistentes:**Códigos de Sucesso:**

- `200` \- OK (requisição bem-sucedida)
- `201` \- Created (recurso criado com sucesso)

**Códigos de Erro:**

- `400` \- Bad Request (dados inválidos)
- `401` \- Unauthorized (token inválido ou ausente)
- `403` \- Forbidden (sem permissão)
- `404` \- Not Found (recurso não encontrado)
- `500` \- Internal Server Error (erro do servidor)
- `522` \- Connection Timed Out (timeout na conexão)

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#quick-start)  Quick Start

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#exemplo-listar-agentes-ia)  Exemplo: Listar Agentes IA

```
curl -X GET https://api.evoai.app/api/v1/agents \
  -H "api_access_token: <SEU_TOKEN_UUID>" \
  -H "Content-Type: application/json"
```

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#exemplo-criar-um-agente-ia)  Exemplo: Criar um Agente IA

```
curl -X POST https://api.evoai.app/api/v1/agents \
  -H "api_access_token: <SEU_TOKEN_UUID>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Agente IA",
    "type": "llm",
    "model": "gpt-4",
    "prompt": "Você é um assistente útil.",
    "temperature": 0.7
  }'
```

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#conven%C3%A7%C3%B5es)  Convenções

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#formato-de-data)  Formato de Data

Todas as APIs usam formato ISO 8601:

```
2026-01-26T10:30:00Z
```

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#pagina%C3%A7%C3%A3o)  Paginação

APIs que retornam listas suportam paginação:

```
GET /api/v1/agents?page=1&pageSize=10
```

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#filtros-e-busca)  Filtros e Busca

Muitas APIs suportam filtros via query parameters:

```
GET /api/v1/agents?status=active&type=llm
```

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#ferramentas-recomendadas)  Ferramentas Recomendadas

- **Postman** \- Coleção de APIs e testes
- **Insomnia** \- Cliente REST alternativo
- **Swagger UI** \- Visualização interativa das APIs
- **OpenAPI Generator** \- Geração automática de SDKs
- **curl** \- Testes rápidos via linha de comando

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#pr%C3%B3ximos-passos)  Próximos Passos

1. Escolha a API que você precisa usar
2. Consulte a especificação OpenAPI correspondente
3. Configure autenticação obtendo seu API Access Token
4. Comece a integrar usando os exemplos fornecidos

## [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#faq)  FAQ

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#como-obtenho-credenciais-de-api)  Como obtenho credenciais de API?

O API Access Token (UUID) pode ser obtido através do painel de configurações do usuário ou administrador. Consulte o [guia completo de autenticação](https://docs.evolutionfoundation.com.br/api-reference/authentication) para detalhes.

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#posso-usar-as-apis-em-produ%C3%A7%C3%A3o)  Posso usar as APIs em produção?

Sim, todas as APIs são estáveis e prontas para produção. Certifique-se de usar HTTPS e gerenciar seus tokens de forma segura.

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#as-apis-suportam-rate-limiting)  As APIs suportam rate limiting?

Sim, a maioria das APIs implementa rate limiting. Consulte a documentação específica de cada API para limites detalhados.

### [​](https://docs.evolutionfoundation.com.br/api-reference/introduction\#como-reporto-problemas-ou-sugiro-melhorias)  Como reporto problemas ou sugiro melhorias?

Abra uma issue no [GitHub](https://github.com/evolution-foundation/evo-ai-services/issues) ou entre em contato através do email de suporte.

* * *

**Pronto para começar?**

1. Configure a [autenticação](https://docs.evolutionfoundation.com.br/api-reference/authentication) para obter seu API Access Token
2. Consulte os exemplos de uso abaixo ou nos guias específicos de integração

[AutenticaçãoGuia completo de autenticação com API Access Token (UUID) e multi-tenant para todas as APIs Evo CRM\\
\\
Próximo](https://docs.evolutionfoundation.com.br/api-reference/authentication)

Ctrl+I