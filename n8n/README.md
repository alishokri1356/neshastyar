# Neshastyar n8n workflows

## Active analyze pipeline

- **Neshastyar V4** (`uGFuUqZOCE0Ay0nY`) — main meeting pipeline webhook  
  Path: `7df546f1-321a-40d7-a5c1-3084ad0ce697`
- **Neshastyar_openrouter_analyze** (`cqOMmPHbmAGej0hs`) — OpenRouter model runner
- **Modiryar_google_analyze** (`2MmlReW5QRBVzkrn`) — Gemini Flash chain (unchanged)
- **Modiryar_nvidia_analyze** (`ModNvidiaAnalyze`) — NVIDIA free chain (unchanged)

## Fallback rules

- Auto: gemini_flash → deepseek → glm → qwen → gemini_4_argon → gpt_61_sol → claude_sonnet → gemma → nvidia
- Manual: chosen model → gemma → nvidia

## Chat

- **Neshastyar-AI V1** — sync chat answers for `/api/chats`
  - Local export: `neshastyar_ai_v1.workflow.json`
  - Webhook path: `c8f3a91e-4d2b-4e7a-9c1f-6b8e5d0a3f27`
  - Model: NVIDIA Nemotron Ultra only (`nvidia/nemotron-3-ultra-550b-a55b:free` via OpenRouter)
  - Auth header: `x-internal-secret` (must match backend `INTERNAL_WEBHOOK_SECRET`)
  - n8n compose needs `INTERNAL_WEBHOOK_SECRET` and `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` so the Code node can validate the secret

## AI Editor

- **AI Editor V1** (`AiEditorV1`) — sync meeting edits for `POST /api/meetings/:id/ai-edit`
  - Local export: `ai_editor_v1.workflow.json`
  - Webhook path: `d53a1a3c-062a-4ac6-a84d-44cd3578cc52`
  - Input: `{ system, user }` built by the backend (meeting details, tags, participants, transcript, instruction)
  - Models: NVIDIA Nemotron Ultra (`nvidia/nemotron-3-ultra-550b-a55b:free`), on failure Gemma 4 31B (`google/gemma-4-31b-it`), both via OpenRouter
  - Output: `{ ok: true, edited: {...}, model }` or HTTP 502 `{ ok: false, error }`
  - Auth header: `x-internal-secret` (same as chat)

## Dictation

- **Neshastyar Dictation V1** (`DwBH1XaakRw0MIpU`) — sync speech-to-text for `POST /api/dictation/transcribe`
  - Local export: `dictation_v1.workflow.json`
  - Webhook path: `0859818d-c960-4b83-bdd7-8cbebc247912`
  - Input: `{ mimeType, audio }` (base64 clip, max 2 minutes, recorded in the Android app)
  - Model: `gemini-3.5-transcribe` via Google Gemini API directly (credential `Google Gemini(PaLM) Api account`), no OpenRouter
  - Output: `{ ok: true, text, model }` or `{ ok: false, error }` (401 bad secret, 400 bad input, 502 model failure)
  - Auth header: `x-internal-secret` (same as chat)
  - Meeting transcription (`modiryar_googleTranscribe_v1`) is unchanged

## Notes

- Prefer the **live published** workflow in n8n over local JSON exports.
- Modiryar V3 remains in n8n but is deactivated (rollback).

