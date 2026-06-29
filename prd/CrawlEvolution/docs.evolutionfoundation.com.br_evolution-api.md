---
url: "https://docs.evolutionfoundation.com.br/evolution-api"
title: "Evolution API - Documentação do Evolution Foundation"
---

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Pular para o conteúdo principal](https://docs.evolutionfoundation.com.br/evolution-api#content-area)

[Início](https://docs.evolutionfoundation.com.br/) [Evolution](https://docs.evolutionfoundation.com.br/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/api-reference/introduction)

A **Evolution API** é a API REST principal do ecossistema Evolution para integração com WhatsApp. Construída com Node.js e TypeScript, oferece uma solução completa e robusta para comunicação via WhatsApp, suportando tanto a conexão via [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web) quanto a API oficial do WhatsApp Business (Meta Cloud API).

## [​](https://docs.evolutionfoundation.com.br/evolution-api\#principais-recursos)  Principais recursos

- **Multi-provedor** — Suporte a Baileys (WhatsApp Web), Meta Business API e Evolution Provider
- **API RESTful** — Endpoints REST completos para gerenciamento de instâncias, mensagens, grupos e contatos
- **Multi-tenant** — Isolamento completo por instância com autenticação independente
- **Integrações nativas** — Typebot, Chatwoot, OpenAI, Dify, N8N, Flowise e EvoAI
- **Sistema de eventos** — WebSocket, RabbitMQ, Amazon SQS, Kafka, NATS e Pusher
- **Armazenamento de mídia** — Suporte a Amazon S3 e MinIO para arquivos de mídia
- **Multi-banco** — Compatível com PostgreSQL e MySQL via Prisma ORM
- **Cache Redis** — Cache distribuído para alta performance
- **QR Code** — Geração de QR Code para pareamento de dispositivos
- **Docker** — Configuração Docker pronta para produção

## [​](https://docs.evolutionfoundation.com.br/evolution-api\#stack-tecnol%C3%B3gica)  Stack tecnológica

| Tecnologia | Uso |
| --- | --- |
| Node.js 20+ | Runtime principal |
| TypeScript 5+ | Linguagem principal |
| Express.js | Framework HTTP |
| Prisma ORM | Acesso a dados (PostgreSQL/MySQL) |
| Redis | Cache e filas |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | Cliente WhatsApp Web |
| Meta Cloud API | WhatsApp Business API oficial |
| Socket.io | Eventos em tempo real |
| Docker | Containerização |

## [​](https://docs.evolutionfoundation.com.br/evolution-api\#tipos-de-conex%C3%A3o)  Tipos de conexão

A Evolution API suporta dois tipos de conexão com o WhatsApp:

- **WhatsApp API - Baileys**: API gratuita baseada no WhatsApp Web, ideal para automações e chatbots
- **WhatsApp Cloud API**: API oficial da Meta para empresas, com suporte a mensagens em escala e templates

## [​](https://docs.evolutionfoundation.com.br/evolution-api\#se%C3%A7%C3%B5es)  Seções

[**Instalação** \\
\\
Guia rápido de instalação e configuração](https://docs.evolutionfoundation.com.br/evolution-api/installation)

[**Docker** \\
\\
Deploy com Docker e Docker Swarm](https://docs.evolutionfoundation.com.br/evolution-api/install/docker)

[**NVM** \\
\\
Instalação local com Node Version Manager](https://docs.evolutionfoundation.com.br/evolution-api/install/nvm)

[**Nginx e SSL** \\
\\
Proxy reverso com certificado SSL](https://docs.evolutionfoundation.com.br/evolution-api/install/nginx)

[**Variáveis de Ambiente** \\
\\
Referência completa de variáveis de configuração](https://docs.evolutionfoundation.com.br/evolution-api/configuration/env)

[**Webhooks** \\
\\
Configuração de webhooks e eventos](https://docs.evolutionfoundation.com.br/evolution-api/configuration/webhooks)

[**Integrações** \\
\\
Chatbots, eventos e canais](https://docs.evolutionfoundation.com.br/evolution-api/integrations/chatwoot)

[**Evolution API** \\
\\
Documentação técnica completa dos endpoints](https://docs.evolutionfoundation.com.br/evolution-api/connect-instance)

[**Atualização** \\
\\
Como manter sua instância atualizada](https://docs.evolutionfoundation.com.br/evolution-api/updates)

[Visão GeralEscolha o método de instalação ideal para seu cenário\\
\\
Próximo](https://docs.evolutionfoundation.com.br/evolution-api/installation)

Ctrl+I