const { Schema, model } = require('mongoose');

const AiFeedbackSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recommendation_id: { type: Schema.Types.ObjectId, ref: 'AiRecommendation', default: null, index: true },
  run_id: { type: Schema.Types.ObjectId, ref: 'AiRun', default: null, index: true },
  useful: { type: Boolean, required: true },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now, index: true }
});

module.exports = model('AiFeedback', AiFeedbackSchema);
