const { Schema, model } = require('mongoose');

const MeasurementSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  device_id: { type: String, required: false },
  timestamp: { type: Date, default: Date.now, required: true },
  location: {
    lat: { type: Number, required: false, default: null },
    long: { type: Number, required: false, default: null },
  },
  measurements: [
    {
      sensor_id: { type: Schema.Types.Mixed, required: true },
      value: { type: Number, required: true },
    }
  ],
  notes: { type: String, required: false }
});



const Measurement = model('Measurement', MeasurementSchema);
module.exports = Measurement;
