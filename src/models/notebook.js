const { Schema, model } = require('mongoose');

const NotebookSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['simple', 'area'], default: 'simple' },
  area: {
    lat: { type: Number, default: null },
    long: { type: Number, default: null },
    radius_m: { type: Number, default: null }
  },
  description: { type: String, default: null },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = model('Notebook', NotebookSchema);
