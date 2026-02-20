const { Schema, model } = require('mongoose');

const PresetSensorRangeSchema = new Schema({
  sensor_id: { type: Schema.Types.Mixed, required: true },
  optimal_min: { type: Number, required: true },
  optimal_max: { type: Number, required: true }
}, { _id: false });

const PresetSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  notebook_id: { type: String, default: null },
  sensor_ranges: { type: [PresetSensorRangeSchema], default: [] },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = model('Preset', PresetSchema);
