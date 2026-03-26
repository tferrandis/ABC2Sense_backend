const { Schema, model } = require('mongoose');

const NotebookSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['simple', 'area'], default: 'simple' },
  area: {
    mode: { type: String, enum: ['circle', 'polygon'], default: 'circle' },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    radius_m: { type: Number, default: null },
    points: [{
      lat: { type: Number, required: true },
      lon: { type: Number, required: true }
    }]
  },
  emoji: { type: String, default: null },
  color_hex: { type: String, default: null },
  description: { type: String, default: null },
  preset_id: { type: String, default: null },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = model('Notebook', NotebookSchema);
