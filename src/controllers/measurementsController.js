const Measurement = require('../models/measurement');

// Crear una nueva medición usando user_id del token
exports.createMeasurement = async (req, res) => {
  const { _id, timestamp, location, measurements } = req.body;

  try {
    const measurement = new Measurement({
      _id,
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
