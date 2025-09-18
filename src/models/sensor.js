// models/Sensor.js
const {Schema, model} = require("mongoose");

const SensorSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  sensorId: { type: String, required: true },
  value: { type: Number, required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
});


const Sensor = model('Sensor', SensorSchema);
module.exports = Sensor;
