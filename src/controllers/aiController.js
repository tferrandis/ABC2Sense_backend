const Measurement = require('../models/measurement');
const AiRun = require('../models/aiRun');
const AiInsight = require('../models/aiInsight');
const AiRecommendation = require('../models/aiRecommendation');
const AiPresetSuggestion = require('../models/aiPresetSuggestion');
const AiFeedback = require('../models/aiFeedback');
const { generateJson } = require('../services/ai/geminiClient');
const { buildAnalysisContext } = require('../services/ai/analysisFeatureService');
const {
  analysisComparePrompt,
  measurementReportPrompt,
  presetSuggestPrompt,
  sensorChatPrompt
} = require('../services/ai/promptTemplates');

const AI_ENABLED = String(process.env.AI_ENABLED || 'false').toLowerCase() === 'true';

function disabledResponse(res) {
  return res.status(503).json({ error: 'AI module disabled. Set AI_ENABLED=true.' });
}

async function saveRun({ userId, kind, model, promptVersion, requestPayload, responsePayload, status, errorMessage, latencyMs }) {
  return AiRun.create({
    user_id: userId,
    kind,
    model,
    prompt_version: promptVersion,
    request_payload: requestPayload,
    response_payload: responsePayload,
    status,
    error_message: errorMessage || null,
    latency_ms: latencyMs || null
  });
}

exports.analysis = async (req, res) => {
  if (!AI_ENABLED) return disabledResponse(res);

  const userId = req.user.id;
  const { notebookId, currentFrom, currentTo, previousFrom, previousTo, mode = 'auto', cropContext = {} } = req.body;

  if (!currentFrom || !currentTo) {
    return res.status(400).json({ error: 'currentFrom and currentTo are required' });
  }

  const context = await buildAnalysisContext({ userId, notebookId, currentFrom, currentTo, previousFrom, previousTo, mode });
  const promptObj = analysisComparePrompt({ ...context, cropContext });

  try {
    const response = await generateJson({ prompt: promptObj.prompt, model: process.env.GEMINI_MODEL_REASON || process.env.GEMINI_MODEL_FAST });
    const run = await saveRun({
      userId,
      kind: 'analysis',
      model: response.model,
      promptVersion: promptObj.version,
      requestPayload: { notebookId, currentFrom, currentTo, previousFrom, previousTo, mode, cropContext },
      responsePayload: response.json,
      status: 'ok',
      latencyMs: response.latencyMs
    });

    const insight = await AiInsight.create({
      user_id: userId,
      notebook_id: notebookId || null,
      type: 'analysis',
      summary: response.json.summary || '',
      anomalies: response.json.anomalies || [],
      trends: response.json.trends || [],
      confidence: response.json.confidence || null,
      run_id: run._id
    });

    const recommendations = Array.isArray(response.json.recommendations)
      ? await AiRecommendation.insertMany(
          response.json.recommendations.map((r) => ({
            user_id: userId,
            notebook_id: notebookId || null,
            recommendation: r.action || 'N/A',
            rationale: r.why || '',
            priority: r.priority || 3,
            confidence: r.confidence ?? null,
            run_id: run._id
          }))
        )
      : [];

    return res.json({ runId: run._id, insight, recommendations });
  } catch (error) {
    const run = await saveRun({
      userId,
      kind: 'analysis',
      model: process.env.GEMINI_MODEL_REASON || process.env.GEMINI_MODEL_FAST || 'unknown',
      promptVersion: promptObj.version,
      requestPayload: { notebookId, currentFrom, currentTo, previousFrom, previousTo, mode, cropContext },
      responsePayload: {},
      status: 'error',
      errorMessage: error.message
    });
    return res.status(500).json({ error: 'analysis_failed', details: error.message, runId: run._id });
  }
};

exports.report = async (req, res) => {
  if (!AI_ENABLED) return disabledResponse(res);

  const userId = req.user.id;
  const { measurementId, cropContext = {} } = req.body;

  if (!measurementId) return res.status(400).json({ error: 'measurementId is required' });

  const measurement = await Measurement.findOne({ _id: measurementId, user_id: userId }).lean();
  if (!measurement) return res.status(404).json({ error: 'Measurement not found' });

  const promptObj = measurementReportPrompt({ measurement, cropContext });

  try {
    const response = await generateJson({ prompt: promptObj.prompt, model: process.env.GEMINI_MODEL_REASON || process.env.GEMINI_MODEL_FAST });
    const run = await saveRun({
      userId,
      kind: 'report',
      model: response.model,
      promptVersion: promptObj.version,
      requestPayload: { measurementId, cropContext },
      responsePayload: response.json,
      status: 'ok',
      latencyMs: response.latencyMs
    });

    const insight = await AiInsight.create({
      user_id: userId,
      notebook_id: measurement.notebook_id || null,
      measurement_id: measurement._id,
      type: 'report',
      summary: response.json.summary || '',
      anomalies: response.json.risks || [],
      trends: [],
      confidence: response.json.confidence || null,
      run_id: run._id
    });

    return res.json({ runId: run._id, insight, report: response.json });
  } catch (error) {
    const run = await saveRun({
      userId,
      kind: 'report',
      model: process.env.GEMINI_MODEL_REASON || process.env.GEMINI_MODEL_FAST || 'unknown',
      promptVersion: promptObj.version,
      requestPayload: { measurementId, cropContext },
      responsePayload: {},
      status: 'error',
      errorMessage: error.message
    });
    return res.status(500).json({ error: 'report_failed', details: error.message, runId: run._id });
  }
};

exports.presetSuggestions = async (req, res) => {
  if (!AI_ENABLED) return disabledResponse(res);

  const userId = req.user.id;
  const { notebookId = null, cropType, objective = null, cropContext = {} } = req.body;

  if (!cropType) return res.status(400).json({ error: 'cropType is required' });

  const promptObj = presetSuggestPrompt({ notebookId, cropType, objective, cropContext });

  try {
    const response = await generateJson({ prompt: promptObj.prompt, model: process.env.GEMINI_MODEL_FAST });
    const run = await saveRun({
      userId,
      kind: 'preset_suggestions',
      model: response.model,
      promptVersion: promptObj.version,
      requestPayload: { notebookId, cropType, objective, cropContext },
      responsePayload: response.json,
      status: 'ok',
      latencyMs: response.latencyMs
    });

    const doc = await AiPresetSuggestion.create({
      user_id: userId,
      notebook_id: notebookId,
      crop_type: cropType,
      suggestions: response.json.suggestions || [],
      run_id: run._id
    });

    return res.json({ runId: run._id, presetSuggestions: doc.suggestions });
  } catch (error) {
    const run = await saveRun({
      userId,
      kind: 'preset_suggestions',
      model: process.env.GEMINI_MODEL_FAST || 'unknown',
      promptVersion: promptObj.version,
      requestPayload: { notebookId, cropType, objective, cropContext },
      responsePayload: {},
      status: 'error',
      errorMessage: error.message
    });
    return res.status(500).json({ error: 'preset_suggestions_failed', details: error.message, runId: run._id });
  }
};

exports.chat = async (req, res) => {
  if (!AI_ENABLED) return disabledResponse(res);

  const userId = req.user.id;
  const { question, notebookId = null, context = {} } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });

  const promptObj = sensorChatPrompt({ question, notebookId, context });

  try {
    const response = await generateJson({ prompt: promptObj.prompt, model: process.env.GEMINI_MODEL_FAST });
    const run = await saveRun({
      userId,
      kind: 'chat',
      model: response.model,
      promptVersion: promptObj.version,
      requestPayload: { question, notebookId, context },
      responsePayload: response.json,
      status: 'ok',
      latencyMs: response.latencyMs
    });

    return res.json({ runId: run._id, ...response.json });
  } catch (error) {
    const run = await saveRun({
      userId,
      kind: 'chat',
      model: process.env.GEMINI_MODEL_FAST || 'unknown',
      promptVersion: promptObj.version,
      requestPayload: { question, notebookId, context },
      responsePayload: {},
      status: 'error',
      errorMessage: error.message
    });
    return res.status(500).json({ error: 'chat_failed', details: error.message, runId: run._id });
  }
};

exports.feedback = async (req, res) => {
  const userId = req.user.id;
  const { recommendationId = null, runId = null, useful, notes = '' } = req.body;

  if (typeof useful !== 'boolean') {
    return res.status(400).json({ error: 'useful must be boolean' });
  }

  const feedback = await AiFeedback.create({
    user_id: userId,
    recommendation_id: recommendationId,
    run_id: runId,
    useful,
    notes
  });

  return res.status(201).json(feedback);
};

exports.getInsights = async (req, res) => {
  const userId = req.user.id;
  const { notebookId = null, measurementId = null, limit = 20 } = req.query;

  const filter = { user_id: userId };
  if (notebookId) filter.notebook_id = notebookId;
  if (measurementId) filter.measurement_id = measurementId;

  const insights = await AiInsight.find(filter).sort({ created_at: -1 }).limit(Number(limit)).lean();
  return res.json(insights);
};

exports.getRunById = async (req, res) => {
  const userId = req.user.id;
  const run = await AiRun.findOne({ _id: req.params.id, user_id: userId }).lean();
  if (!run) return res.status(404).json({ error: 'Run not found' });
  return res.json(run);
};
