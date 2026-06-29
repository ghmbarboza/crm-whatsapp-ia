---
url: "https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message"
title: "Send Text Message - Documentação do Evolution Foundation"
---

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#content-area)

[Início](https://docs.evolutionfoundation.com.br/en) [Evolution](https://docs.evolutionfoundation.com.br/en/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/en/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/en/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/en/api-reference/introduction)

POST

http://localhost:8080https://api.evolution-api.com{customUrl}

/

message

/

sendText

/

{instanceName}

Try it

Send Text Message

cURL

```
curl --request POST \
  --url http://localhost:8080/message/sendText/{instanceName} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "number": "<string>",
  "textMessage": {
    "text": "<string>"
  },
  "delay": 123,
  "quoted": {},
  "linkPreview": true,
  "mentioned": [\
    "<string>"\
  ]
}
'
```

200

400

401

403

404

500

```
{
  "key": {},
  "message": {},
  "status": "<string>"
}
```

#### Authorizations

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#authorization-apikey)

apikey

string

header

required

API Key for authentication (global or instance-specific)

#### Path Parameters

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#parameter-instance-name)

instanceName

string

required

WhatsApp instance name

Example:

`"my-instance"`

#### Body

application/json

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-number)

number

string

required

Phone number with country code (e.g., 5511999999999)

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-text-message)

textMessage

object

required

Showchild attributes

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-delay)

delay

integer

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-quoted)

quoted

object

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-link-preview)

linkPreview

boolean

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#body-mentioned)

mentioned

string\[\]

#### Response

200

application/json

Message sent

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#response-key)

key

object

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#response-message)

message

object

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message#response-status)

status

string

[Previous](https://docs.evolutionfoundation.com.br/en/evolution-api/send-template-message) [Archive ChatArchive or unarchive a chat\\
\\
Next](https://docs.evolutionfoundation.com.br/en/evolution-api/archive-chat)

Ctrl+I

Send Text Message

cURL

```
curl --request POST \
  --url http://localhost:8080/message/sendText/{instanceName} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "number": "<string>",
  "textMessage": {
    "text": "<string>"
  },
  "delay": 123,
  "quoted": {},
  "linkPreview": true,
  "mentioned": [\
    "<string>"\
  ]
}
'
```

200

400

401

403

404

500

```
{
  "key": {},
  "message": {},
  "status": "<string>"
}
```