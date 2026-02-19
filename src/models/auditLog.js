const { Schema, model } = require('mongoose');

const AuditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  actorIp: { type: String, default: null },
  action: { type: String, required: true },
  target: { type: String, default: null },
  targetId: { type: Schema.Types.ObjectId, default: null },
  status: { type: String, enum: ['success', 'failure'], required: true },
  details: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });

const AuditLog = model('AuditLog', AuditLogSchema);
module.exports = AuditLog;
