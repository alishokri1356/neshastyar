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
  - Models: GLM-5.3 → Gemma 4 31B → NVIDIA Nemotron (OpenRouter)
  - Auth header: `x-internal-secret` (must match backend `INTERNAL_WEBHOOK_SECRET`; n8n needs env `INTERNAL_WEBHOOK_SECRET`)

## Notes

- Prefer the **live published** workflow in n8n over local JSON exports.
- Modiryar V3 remains in n8n but is deactivated (rollback).

