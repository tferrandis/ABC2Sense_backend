const Measurement = require('../models/measurement');

exports.createMeasurement = async (req, res) => {
  const { _id, device_id, user_id, timestamp, location, measurements } = req.body;
  try {
    const measurement = new Measurement({
      _id,
      device_id,
      user_id,
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

exports.getMeasurementsByUserId = async (req, res) => {
    const { user_id } = req.params; // Obtener el user_id de los parámetros de la URL
    try {
      const measurements = await Measurement.find({ user_id });
      if (!measurements.length) {
        return res.status(404).json({ message: 'No se encontraron mediciones para este usuario' });
      }
      res.status(200).json(measurements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

// Aquí podrías agregar otros métodos para gestionar las mediciones, como obtener una medición por ID, etc.
