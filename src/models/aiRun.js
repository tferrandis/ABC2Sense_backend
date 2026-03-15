const { Schema, model } = require('mongoose');

const AiRunSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['analysis', 'report', 'preset_suggestions', 'chat'], required: true, index: true },
  model: { type: String, required: true },
  prompt_version: { type: String, default: 'v1' },
  request_payload: { type: Schema.Types.Mixed, default: {} },
  response_payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['ok', 'error'], default: 'ok', index: true },
  error_message: { type: String, default: null },
  latency_ms: { type: Number, default: null },
  created_at: { type: Date, default: Date.now, index: true }
});

module.exports = model('AiRun', AiRunSchema);
