// controllers/sensorController.js
const SensorDefinition = require('../models/sensorDefinition');

/**
 * @api {post} /api/sensor/definitions Create Sensor Definition
 * @apiName CreateSensorDefinition
 * @apiGroup Sensor Definitions
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new sensor type definition
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Number} sensorId Unique sensor ID
 * @apiBody {String} title Sensor title
 * @apiBody {String} measure What the sensor measures
 * @apiBody {String} unit Unit of measurement
 * @apiBody {String} description Sensor description
 *
 * @apiSuccess (201) {Object} definition Created sensor definition
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "sensorId": 1,
 *       "title": "Temperature Sensor",
 *       "measure": "Temperature",
 *       "unit": "°C",
 *       "description": "Measures ambient temperature"
 *     }
 *
 * @apiError (400) {String} message Sensor ID already exists
 * @apiError (401) Unauthorized User not authenticated
 */
exports.createSensorDefinition = async (req, res) => {
  const { sensorId, title, measure, unit, description } = req.body;
  try {
    const existing = await SensorDefinition.findOne({ sensorId });
    if (existing) return res.status(400).json({ message: "Sensor ID already exists" });

    const def = new SensorDefinition({ sensorId, title, description, unit, measure });
    await def.save();
    res.status(201).json(def);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @api {get} /api/sensor/definitions Get All Sensor Definitions
 * @apiName GetSensorDefinitions
 * @apiGroup Sensor Definitions
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all sensor type definitions
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} sensors Array of sensor definitions
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "sensorId": 1,
 *         "title": "Temperature Sensor",
 *         "measure": "Temperature",
 *         "unit": "°C",
 *         "description": "Measures ambient temperature"
 *       }
 *     ]
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getSensorDefinitions = async (req, res) => {
  try {
    const sensors = await SensorDefinition.find({});
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
