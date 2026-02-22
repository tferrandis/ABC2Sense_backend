const { Schema, model } = require('mongoose');

const OtaEventSchema = new Schema({
  type: {
    type: String,
    enum: ['catalog', 'latest', 'download', 'upload', 'activate'],
    required: true
  },
  firmware: {
    type: Schema.Types.ObjectId,
    ref: 'Firmware',
    default: null
  },
  version: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  deviceId: {
    type: String,
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

OtaEventSchema.index({ type: 1, createdAt: -1 });
OtaEventSchema.index({ firmware: 1, createdAt: -1 });
OtaEventSchema.index({ deviceId: 1, createdAt: -1 });

module.exports = model('OtaEvent', OtaEventSchema);
