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

## Notes

- Prefer the **live published** workflow in n8n over local JSON exports.
- Modiryar V3 remains in n8n but is deactivated (rollback).
