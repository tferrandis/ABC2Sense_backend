const DEFAULT_MODEL = process.env.GEMINI_MODEL_FAST || 'gemini-2.0-flash';
const API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';

function parseJsonFromText(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const match = trimmed.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

async function generateJson({ prompt, model = DEFAULT_MODEL, timeoutMs = 20000 }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY missing');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseJsonFromText(text);

    if (!parsed) {
      throw new Error('Gemini response is not valid JSON');
    }

    return {
      model,
      latencyMs: Date.now() - started,
      raw: payload,
      json: parsed
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateJson };
