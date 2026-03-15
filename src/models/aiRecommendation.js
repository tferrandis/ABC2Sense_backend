const { Schema, model } = require('mongoose');

const AiRecommendationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  notebook_id: { type: String, default: null, index: true },
  measurement_id: { type: String, default: null, index: true },
  recommendation: { type: String, required: true },
  rationale: { type: String, default: '' },
  priority: { type: Number, default: 3 },
  confidence: { type: Number, default: null },
  source: { type: String, default: 'gemini' },
  run_id: { type: Schema.Types.ObjectId, ref: 'AiRun', required: true, index: true },
  status: { type: String, enum: ['new', 'applied', 'dismissed'], default: 'new', index: true },
  created_at: { type: Date, default: Date.now, index: true }
});

module.exports = model('AiRecommendation', AiRecommendationSchema);
