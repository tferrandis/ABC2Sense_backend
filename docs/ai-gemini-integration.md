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
Add to `.env`:

```env
AI_ENABLED=true
GEMINI_API_KEY=<your_key>
GEMINI_MODEL_FAST=gemini-2.0-flash
GEMINI_MODEL_REASON=gemini-2.0-flash
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
AI_TIMEOUT_MS=20000
```

## API endpoints
All endpoints require JWT auth.

- `POST /api/ai/analysis`
  - Input: `notebookId?`, `currentFrom`, `currentTo`, `previousFrom?`, `previousTo?`, `mode?`, `cropContext?`
  - Output: `runId`, `insight`, `recommendations`

- `POST /api/ai/report`
  - Input: `measurementId`, `cropContext?`
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
