# Civic Assistance configuration

Civic Assistance is a citizen-only, read-only feature at the existing
`citizen/assistance` route. Conversation history is stored in MongoDB and scoped to the
authenticated citizen. The latest conversation retains up to 100 messages. New chat
starts a new conversation; it does not delete complaint records.

## Configure the optional AI provider

Set these values only in `backend/.env` or the backend host's secret/environment settings:

```dotenv
CHAT_PROVIDER_URL=https://your-provider.example/v1/chat/completions
CHAT_PROVIDER_MODEL=your-configured-model-name
CHAT_PROVIDER_API_KEY=your-server-side-key
```

The URL is a complete **chat-completions-compatible** HTTP endpoint. It must accept
`model`, `messages`, `temperature`, and `max_tokens` and return text at
`choices[0].message.content`. HTTPS is required for remote providers. Plain HTTP is allowed
only for a provider on localhost/127.0.0.1/::1. Redirects are not followed. A local provider
can omit the key when it does not require authentication. Restart Express after changing
configuration. No provider key belongs in `mobile/.env`, Expo public variables, or source.

The provider classifies a question into the supported civic intents. It does not generate
database facts or issue database commands. The server validates the intent enum and renders
curated civic guidance, so statuses, authority names, addresses and completion dates cannot
be invented by provider prose. Previous questions are bounded context, not instructions.
This is a deliberately focused assistant rather than a general-purpose model interface.

Supported guidance covers reporting, required submission information, status explanations,
photo capture, categories and finding your own complaint history. Include a `CIV-123456`
reference to retrieve the recorded title/category/status/submission date from your own
account. Complaint details are obtained with an ownership-scoped MongoDB query, not from
the provider. Foreign and missing references receive the same account-scoped not-found reply.

## Availability and privacy

With no provider URL/model, a timeout, malformed output, or a provider failure, the app
explicitly shows **Built-in civic guide** and an AI-unavailable notice. This guidance is
not presented as a successful AI response. Existing reporting and tracking still work.

- `GET /api/chat/conversation` reads only the caller's latest conversation.
- `POST /api/chat/messages` accepts a message (1–2000 characters), optional owned
  conversation ID, and optional complaint reference. It is rate-limited to 12/minute.
- Both routes require authentication and the citizen role.
- The provider has no tools for status changes, verification, deletion, or querying MongoDB.
- Keys, authorization headers and provider responses are not returned to the frontend.
- Questions and limited previous user questions are sent to the configured provider.
  Actual complaint lookup replies are generated locally without sending records to it.

Backend tests exercise a local HTTP provider contract, invalid provider output, deterministic
fallback, ownership enforcement, authorization and history persistence. A commercial or
production model provider has not been configured or validated by these tests.
