const Measurement = require('../models/measurement');

/**
 * @api {post} /api/measurements Create Measurement
 * @apiName CreateMeasurement
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new measurement record
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {String} timestamp Measurement timestamp
 * @apiBody {Object} location Location object with latitude and longitude
 * @apiBody {Object} measurements Object with measurement data
 *
 * @apiSuccess (201) {Object} measurement Created measurement object
 *
 * @apiError (400) {String} error Validation error
 * @apiError (401) Unauthorized User not authenticated
 */
// Crear una nueva medición usando user_id del token
exports.createMeasurement = async (req, res) => {
  const { timestamp, location, measurements } = req.body;

  try {
    const measurement = new Measurement({
      user_id: req.user._id, // Tomar user_id del token de autenticación
      timestamp,
      location,
      measurements,
    });

    await measurement.save();
    res.status(201).json(measurement);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @api {get} /api/measurements Get User Measurements
 * @apiName GetMeasurementsByUserId
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all measurements for the authenticated user
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} measurements Array of measurement objects
 *
 * @apiError (404) {String} message No measurements found
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
// Obtener todas las mediciones del usuario autenticado
exports.getMeasurementsByUserId = async (req, res) => {
  try {
    const userId = req.user._id; 
    const measurements = await Measurement.find({ user_id: userId });

    if (!measurements.length) {
      return res.status(404).json({ message: 'No se encontraron mediciones para este usuario' });
    }

    res.status(200).json(measurements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
