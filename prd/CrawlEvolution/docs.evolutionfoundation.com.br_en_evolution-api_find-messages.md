---
url: "https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages"
title: "Find Messages - Documentação do Evolution Foundation"
---

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#content-area)

[Início](https://docs.evolutionfoundation.com.br/en) [Evolution](https://docs.evolutionfoundation.com.br/en/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/en/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/en/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/en/api-reference/introduction)

POST

http://localhost:8080https://api.evolution-api.com{customUrl}

/

chat

/

findMessages

/

{instanceName}

Try it

Find Messages

cURL

```
curl --request POST \
  --url http://localhost:8080/chat/findMessages/{instanceName} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "where": {},
  "take": 123,
  "skip": 123,
  "orderBy": {}
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
  "messages": {
    "total": 0,
    "pages": 0,
    "currentPage": 1,
    "records": [\
      {\
        "id": "<string>",\
        "key": {},\
        "message": {},\
        "messageType": "<string>",\
        "fromMe": true,\
        "timestamp": 123\
      }\
    ]
  }
}
```

#### Authorizations

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#authorization-apikey)

apikey

string

header

required

API Key for authentication (global or instance-specific)

#### Path Parameters

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#parameter-instance-name)

instanceName

string

required

WhatsApp instance name

Example:

`"my-instance"`

#### Body

application/json

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#body-where)

where

object

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#body-take)

take

integer

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#body-skip)

skip

integer

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#body-order-by)

orderBy

object

#### Response

200

application/json

Messages found

[​](https://docs.evolutionfoundation.com.br/en/evolution-api/find-messages#response-messages)

messages

object

Showchild attributes

[Previous](https://docs.evolutionfoundation.com.br/en/evolution-api/find-contacts) [Mark Message as ReadMark message as read\\
\\
Next](https://docs.evolutionfoundation.com.br/en/evolution-api/mark-message-as-read)

Ctrl+I

Find Messages

cURL

```
curl --request POST \
  --url http://localhost:8080/chat/findMessages/{instanceName} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "where": {},
  "take": 123,
  "skip": 123,
  "orderBy": {}
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
  "messages": {
    "total": 0,
    "pages": 0,
    "currentPage": 1,
    "records": [\
      {\
        "id": "<string>",\
        "key": {},\
        "message": {},\
        "messageType": "<string>",\
        "fromMe": true,\
        "timestamp": 123\
      }\
    ]
  }
}
```