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
  enabled: { type: Boolean, default: true }
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
