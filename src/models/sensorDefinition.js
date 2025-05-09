const { Schema, model } = require("mongoose");

const SensorDefinitionSchema = new Schema({
  sensorId: { type: Number, required: true, unique: true }, 
  title: { type: String, required: true },
  description: { type: String }, 
  measure: { type: Number, required: true },
  unit : {type: String,  required: true}
});

const SensorDefinition = model("SensorDefinition", SensorDefinitionSchema);
module.exports = SensorDefinition;
