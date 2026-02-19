const { Schema, model } = require('mongoose');

const MeasurementSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  client_measurement_id: { type: String, default: null },
  device_id: { type: String, required: false },
  timestamp: { type: Date, default: Date.now, required: true },
  timestamp_device_ms: { type: Number, default: null },
  source: { type: String, default: null },
  location: {
    lat: { type: Number, required: false, default: null },
    long: { type: Number, required: false, default: null },
  },
  location_used: { type: Boolean, default: false },
  capture_with_gps: { type: Boolean, default: false },
  notebook_id: { type: String, default: null },
  measurements: [
    {
      sensor_id: { type: Schema.Types.Mixed, required: true },
      value: { type: Number, required: true },
    }
  ],
  notes: { type: String, required: false }
});

MeasurementSchema.index({ user_id: 1, timestamp: -1 });
MeasurementSchema.index({ 'measurements.sensor_id': 1 });
MeasurementSchema.index(
  { user_id: 1, client_measurement_id: 1 },
  { unique: true, sparse: true, partialFilterExpression: { client_measurement_id: { $type: 'string' } } }
);

const Measurement = model('Measurement', MeasurementSchema);
module.exports = Measurement;
