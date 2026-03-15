const { Schema, model } = require('mongoose');

const AiInsightSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  notebook_id: { type: String, default: null, index: true },
  measurement_id: { type: String, default: null, index: true },
  type: { type: String, enum: ['analysis', 'report'], required: true },
  summary: { type: String, default: '' },
  anomalies: { type: [Schema.Types.Mixed], default: [] },
  trends: { type: [Schema.Types.Mixed], default: [] },
  confidence: { type: Number, default: null },
  run_id: { type: Schema.Types.ObjectId, ref: 'AiRun', required: true, index: true },
  created_at: { type: Date, default: Date.now, index: true }
});

module.exports = model('AiInsight', AiInsightSchema);
