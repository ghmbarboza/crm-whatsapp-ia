---
url: "https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance.md"
title: undefined
---

\> ## Documentation Index
\> Fetch the complete documentation index at: https://docs.evolutionfoundation.com.br/llms.txt
\> Use this file to discover all available pages before exploring further.

\# Connect to instance

\> Connect to instance with the provided data

\## OpenAPI

\`\`\`\`yaml /api-reference/openapi/Evolution-Go/evo-go-instance.yaml post /instance/connect
openapi: 3.0.0
info:
 title: Evolution Foundation - Evolution Go - Instance
 description: Go implementation of Evolution
 version: '1.0'
servers:
 \- url: http://localhost:8080/
 description: Development server (HTTP)
 \- url: https://localhost:8080/
 description: Development server (HTTPS)
 \- url: '{customUrl}'
 description: Custom server
 variables:
 customUrl:
 default: https://your-instance.com
 description: Enter your server URL
security:
 \- ApiKeyAuth: \[\]
paths:
 /instance/connect:
 post:
 summary: Connect to instance
 description: Connect to instance with the provided data
 requestBody:
 required: true
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ConnectInstance'
 description: Instance data
 responses:
 '200':
 description: Instance connected successfully
 content:
 application/json:
 schema:
 type: object
 properties:
 success:
 type: boolean
 example: true
 message:
 type: string
 example:
 data:
 eventString: >-
 MESSAGE,SEND\_MESSAGE,READ\_RECEIPT,PRESENCE,HISTORY\_SYNC,CHAT\_PRESENCE,CALL,CONNECTION,LABEL,CONTACT,GROUP,NEWSLETTER,QRCODE
 jid: ''
 webhookUrl: https://your-webhook-url.com/webhook
 message: success
 '400':
 description: Bad Request - Invalid input data
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: BAD\_REQUEST
 message: Invalid request data. Instance information is required.
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/connect
 method: POST
 '401':
 description: Unauthorized - Invalid or missing API key
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: UNAUTHORIZED
 message: Invalid or missing API key
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/connect
 method: POST
 '403':
 description: Forbidden - Insufficient permissions
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: FORBIDDEN
 message: Insufficient permissions to connect to instance
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/connect
 method: POST
 '404':
 description: Not Found - Instance not found
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/ErrorResponse'
 example:
 success: false
 error:
 code: NOT\_FOUND
 message: Instance not found
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /instance/connect
 method: POST
 '500':
 description: Internal Server Error
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
 path: /instance/connect
 method: POST
components:
 schemas:
 ConnectInstance:
 type: object
 properties:
 immediate:
 type: boolean
 phone:
 type: string
 subscribe:
 items:
 type: string
 type: array
 webhookUrl:
 type: string
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