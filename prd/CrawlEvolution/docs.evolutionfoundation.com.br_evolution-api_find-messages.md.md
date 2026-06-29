---
url: "https://docs.evolutionfoundation.com.br/evolution-api/find-messages.md"
title: undefined
---

\> ## Documentation Index
\> Fetch the complete documentation index at: https://docs.evolutionfoundation.com.br/llms.txt
\> Use this file to discover all available pages before exploring further.

\# Find Messages

\> Search and filter messages

\## OpenAPI

\`\`\`\`yaml /api-reference/openapi/Evolution-API/chat.yaml post /chat/findMessages/{instanceName}
openapi: 3.0.4
info:
 title: Evolution Foundation - Evolution API - Chat
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
 /chat/findMessages/{instanceName}:
 post:
 summary: Find Messages
 description: Search and filter messages
 parameters:
 \- $ref: '#/components/parameters/InstanceName'
 requestBody:
 content:
 application/json:
 schema:
 $ref: '#/components/schemas/Query'
 responses:
 '200':
 description: Messages found
 content:
 application/json:
 schema:
 type: object
 properties:
 messages:
 type: object
 properties:
 total:
 type: integer
 example: 0
 pages:
 type: integer
 example: 0
 currentPage:
 type: integer
 example: 1
 records:
 type: array
 items:
 $ref: '#/components/schemas/Message'
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
 message: Invalid request parameters
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /chat/findMessages/{instanceName}
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
 path: /chat/findMessages/{instanceName}
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
 path: /chat/findMessages/{instanceName}
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
 message: Instance not found
 meta:
 timestamp: '2024-01-15T10:30:00Z'
 path: /chat/findMessages/{instanceName}
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
 path: /chat/findMessages/{instanceName}
 method: POST
components:
 parameters:
 InstanceName:
 name: instanceName
 in: path
 required: true
 description: WhatsApp instance name
 schema:
 type: string
 example: my-instance
 schemas:
 Query:
 type: object
 properties:
 where:
 type: object
 take:
 type: integer
 skip:
 type: integer
 orderBy:
 type: object
 Message:
 type: object
 properties:
 id:
 type: string
 key:
 type: object
 message:
 type: object
 messageType:
 type: string
 fromMe:
 type: boolean
 timestamp:
 type: integer
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