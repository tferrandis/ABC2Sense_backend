// controllers/sensorController.js
const Sensor = require('../models/sensor');

exports.createSensor = async (req, res) => {
  const { sensorId, value, latitude, longitude } = req.body;
  try {
    const sensor = new Sensor({
      user: req.user._id,
      sensorId,
      value,
      coordinates: { latitude, longitude },
    });
    await sensor.save();
    res.status(201).json(sensor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSensorsByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const sensors = await Sensor.find({ user: userId });
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
