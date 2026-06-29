---
url: "https://docs.evolutionfoundation.com.br/evolution-api/create-instance.md"
title: undefined
---

\> ## Documentation Index
\> Fetch the complete documentation index at: https://docs.evolutionfoundation.com.br/llms.txt
\> Use this file to discover all available pages before exploring further.

\# Create Instance

\> Create a new WhatsApp instance

\## OpenAPI

\`\`\`\`yaml /api-reference/openapi/Evolution-API/instance.yaml post /instance/create
openapi: 3.0.4
info:
 title: Evolution Foundation - Evolution API - Instance
 description: Main Evolution API for WhatsApp
 version: 2.3.7
servers:
 \- url: http://localhost:8080
 description: Local development server
 \- url: https://api.evolution-api.com
 description: Production server
 \- url: '{customUrl}'
 description: Custom server
 variables:
 customUrl:
 default: https://your-instance.com
 description: Enter your server URL
security:
 \- ApiKeyAuth: \[\]
paths:
 /instance/create:
 post:
 summary: Create Instance
 description: Create a new WhatsApp instance
 requestBody:
 required: true
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/InstanceCreate'
 responses:
 '201':
 description: Created
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/InstanceCreateResponse'
 '400':
 description: Bad Request (invalid data)
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: BAD\_REQUEST
 message: Invalid input data
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/create
 method: POST
 '401':
 description: Unauthorized (invalid or missing token)
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: UNAUTHORIZED
 message: Invalid or missing authentication token
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/create
 method: POST
 '403':
 description: Forbidden (insufficient permissions)
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: FORBIDDEN
 message: Insufficient permissions to perform this action
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/create
 method: POST
 '404':
 description: Not Found (resource not found)
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: NOT\_FOUND
 message: Resource not found
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/create
 method: POST
 '500':
 description: Internal Server Error (server error)
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: INTERNAL\_SERVER\_ERROR
 message: An unexpected error occurred
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/create
 method: POST
components:
 schemas:
 InstanceCreate:
 type: object
 required:
 \- instanceName
 properties:
 instanceName:
 type: string
 qrcode:
 type: boolean
 default: true
 integration:
 type: string
 token:
 type: string
 number:
 type: string
 webhook:
 type: object
 properties:
 enabled:
 type: boolean
 url:
 type: string
 events:
 type: array
 items:
 type: string
 InstanceCreateResponse:
 type: object
 properties:
 instance:
 type: object
 properties:
 instanceName:
 type: string
 example: sua-instancia
 instanceId:
 type: string
 example: exemple-instance-id
 integration:
 type: string
 example: WHATSAPP-BAILEYS
 webhookWaBusiness:
 type: string
 nullable: true
 example: null
 accessTokenWaBusiness:
 type: string
 example: ''
 status:
 type: string
 example: connecting
 hash:
 type: string
 example: exemple-hash
 webhook:
 type: object
 websocket:
 type: object
 rabbitmq:
 type: object
 nats:
 type: object
 sqs:
 type: object
 settings:
 type: object
 properties:
 rejectCall:
 type: boolean
 example: false
 msgCall:
 type: string
 example: ''
 groupsIgnore:
 type: boolean
 example: false
 alwaysOnline:
 type: boolean
 example: false
 readMessages:
 type: boolean
 example: false
 readStatus:
 type: boolean
 example: false
 syncFullHistory:
 type: boolean
 example: false
 wavoipToken:
 type: string
 example: ''
 qrcode:
 type: object
 properties:
 pairingCode:
 type: string
 nullable: true
 example: null
 code:
 type: string
 example: 2@exemple
 base64:
 type: string
 example: data:image/png;base64,exemple
 count:
 type: integer
 example: 1
 ErrorResponse:
 type: object
 required:
 \- success
 \- error
 properties:
 success:
 type: boolean
 example: false
 error:
 type: object
 required:
 \- code
 \- message
 properties:
 code:
 type: string
 message:
 type: string
 meta:
 type: object
 properties:
 timestamp:
 type: string
 format: date-time
 path:
 type: string
 method:
 type: string
 securitySchemes:
 ApiKeyAuth:
 type: apiKey
 in: header
 name: apikey
 description: API Key for authentication (global or instance-specific)

\`\`\`\`