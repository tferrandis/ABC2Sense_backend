const { Schema, model } = require('mongoose');

const AiPresetSuggestionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  notebook_id: { type: String, default: null, index: true },
  crop_type: { type: String, required: true },
  suggestions: { type: [Schema.Types.Mixed], default: [] },
  run_id: { type: Schema.Types.ObjectId, ref: 'AiRun', required: true, index: true },
  created_at: { type: Date, default: Date.now, index: true }
});

module.exports = model('AiPresetSuggestion', AiPresetSuggestionSchema);
