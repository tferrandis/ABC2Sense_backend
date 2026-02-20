const { Schema, model } = require("mongoose");

const SensorDefinitionSchema = new Schema({
  sensorId: { type: Number, required: true, unique: true },
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  description: { type: String },
  origin: {
    type: String,
    required: true,
    enum: ["device", "backend", "manual"]
  },
  decimals: { type: Number, required: true, min: 0, max: 9, default: 2 },
  enabled: { type: Boolean, default: true },
  catalogVersion: { type: Number, required: true, default: 1, min: 1 }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

SensorDefinitionSchema.pre('save', function (next) {
  if (this.key) {
    this.key = this.key.toUpperCase();
  }
  next();
});

const SensorDefinition = model("SensorDefinition", SensorDefinitionSchema);
module.exports = SensorDefinition;
