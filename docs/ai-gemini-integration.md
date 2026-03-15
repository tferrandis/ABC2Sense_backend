# AI + Gemini Integration (ABC2Sense Backend)

## Overview
This module adds an AI orchestration layer for agronomic analysis using Gemini.

Implemented capabilities:
- Temporal comparison analysis (`current` vs `previous` windows)
- Measurement-specific AI report generation
- Crop-based preset suggestions
- Guarded sensor Q&A chat
- Feedback capture for recommendation quality
- Run traceability (`ai_runs`) with prompt version and latency

## Environment setup
Add to `.env` (server-side only):

```env
AI_ENABLED=true
GEMINI_API_KEY=<your_key>
GEMINI_MODEL_FAST=gemini-2.0-flash
GEMINI_MODEL_REASON=gemini-2.0-flash
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
AI_TIMEOUT_MS=20000
```

Security notes:
- `GEMINI_API_KEY` must live only in backend `.env`.
- Never hardcode the key in source files.
- Never expose the key in Flutter/mobile app.
- `.env` is already ignored by git in this repo (`.gitignore`).
- Rotate/revoke the key if you suspect leakage.

## How to get a Gemini API key
1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
2. Sign in with your Google account.
3. Click **Create API key** (or select an existing project).
4. Copy the generated key.
5. Put it in backend `.env` as `GEMINI_API_KEY=...`.
6. Restart backend process/service after updating `.env`.

Recommended operational setup:
- Use a different key per environment (dev/staging/prod).
- Restrict usage in Google Cloud where possible.
- Store keys in secret manager/CI secrets for deployments.

## API endpoints
`GET /api/ai/status` is public and reports availability.
All other endpoints require JWT auth.

- `POST /api/ai/analysis`
  - Input: `notebookId?`, `currentFrom`, `currentTo`, `previousFrom?`, `previousTo?`, `mode?`, `cropContext?`
  - Output: `runId`, `insight`, `recommendations`

- `POST /api/ai/report`
  - Input: `measurementId`, `cropContext?`
  - Output: `runId`, `insight`, `report`

- `POST /api/ai/report-from-data`
  - Input: `measurement` object (timestamp + sensors), `cropContext?`
  - Output: `runId`, `insight`, `report`

- `POST /api/ai/preset-suggestions`
  - Input: `notebookId?`, `cropType`, `objective?`, `cropContext?`
  - Output: `runId`, `presetSuggestions`

- `POST /api/ai/chat`
  - Input: `question`, `notebookId?`, `context?`
  - Output: guarded JSON answer

- `POST /api/ai/feedback`
  - Input: `recommendationId?`, `runId?`, `useful`, `notes?`

- `GET /api/ai/insights?notebookId=&measurementId=&limit=`

- `GET /api/ai/runs/:id`

## Prompt strategy
Prompt versions are explicit and stored in `ai_runs.prompt_version`:
- `analysis_compare_v1`
- `measurement_report_v1`
- `preset_suggest_v1`
- `sensor_chat_guarded_v1`

Prompts enforce strict JSON output and include an insufficient-data fallback.

## Data models
New models:
- `AiRun`
- `AiInsight`
- `AiRecommendation`
- `AiPresetSuggestion`
- `AiFeedback`

## Notes
- If `AI_ENABLED=false`, endpoints return `503` with a clear message.
- `responseMimeType=application/json` is requested from Gemini.
- Chat endpoint is constrained to sensor/crop support topics.
