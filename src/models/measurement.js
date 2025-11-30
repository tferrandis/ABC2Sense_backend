const { Schema, model } = require('mongoose');

const MeasurementSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  location: {
    lat: { type: Number, required: false },
    long: { type: Number, required: false },
  },
  measurements: [
    {
      sensor_id: { type: Number, required: true },
      value: { type: Schema.Types.Mixed, required: true }, // Puede ser String o Number
    }
  ]
});



const Measurement = model('Measurement', MeasurementSchema);
module.exports = Measurement;
	

