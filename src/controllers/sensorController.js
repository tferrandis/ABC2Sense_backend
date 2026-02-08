// controllers/sensorController.js
const SensorDefinition = require('../models/sensorDefinition');

/**
 * @api {post} /api/sensor/definitions Create Sensor Definition
 * @apiName CreateSensorDefinition
 * @apiGroup Sensor Definitions
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new sensor type definition in the catalog
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Number} sensorId Unique numeric sensor ID
 * @apiBody {String} key Unique alphanumeric key (e.g. "TEMP", "PH"). Stored as uppercase.
 * @apiBody {String} name Display name (e.g. "Temperature Sensor")
 * @apiBody {String} unit Unit of measurement (e.g. "°C", "pH", "%")
 * @apiBody {String} [description] Sensor description
 * @apiBody {String="device","backend","manual"} origin Source type of the sensor
 * @apiBody {Boolean} [enabled=true] Whether the sensor is active
 *
 * @apiSuccess (201) {Object} definition Created sensor definition
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "sensorId": 1,
 *       "key": "TEMP",
 *       "name": "Temperature Sensor",
 *       "unit": "°C",
 *       "description": "Measures ambient temperature",
 *       "origin": "device",
 *       "enabled": true,
 *       "created_at": "2026-01-15T10:00:00.000Z",
 *       "updated_at": "2026-01-15T10:00:00.000Z"
 *     }
 *
 * @apiError (400) {String} message Sensor ID or key already exists
 * @apiError (401) Unauthorized User not authenticated
 */
exports.createSensorDefinition = async (req, res) => {
  const { sensorId, key, name, unit, description, origin, enabled } = req.body;
  try {
    const existingId = await SensorDefinition.findOne({ sensorId });
    if (existingId) return res.status(400).json({ message: "Sensor ID already exists" });

    const existingKey = await SensorDefinition.findOne({ key: key.toUpperCase() });
    if (existingKey) return res.status(400).json({ message: "Sensor key already exists" });

    const def = new SensorDefinition({ sensorId, key, name, unit, description, origin, enabled });
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
 * @apiDescription Get all sensor type definitions from the catalog
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
 *         "key": "TEMP",
 *         "name": "Temperature Sensor",
 *         "unit": "°C",
 *         "description": "Measures ambient temperature",
 *         "origin": "device",
 *         "enabled": true,
 *         "created_at": "2026-01-15T10:00:00.000Z",
 *         "updated_at": "2026-01-15T10:00:00.000Z"
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
