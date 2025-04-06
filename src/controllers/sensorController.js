const Sensor = require('../models/sensor');
const SensorDefinition = require('../models/sensorDefinition');

// Guardar medida para varios sensores
exports.addMeasure = async (req, res) => {
  const { timestamp = new Date(), latitude = null, longitude = null, sensors } = req.body;

  // Validar formato del campo "sensors"
  if (!sensors || typeof sensors !== 'object' || Object.keys(sensors).length === 0) {
    return res.status(400).json({ error: "Sensors must be a non-empty object." });
  }

  try {
    // Convertir las keys (sensorIds) a números
    const rawEntries = Object.entries(sensors);
    const entries = rawEntries.map(([k, v]) => [parseInt(k), v]);

    // Validar si existen esos sensorId definidos
    const sensorIds = entries.map(([id]) => id);
    const definedSensors = await SensorDefinition.find({ sensorId: { $in: sensorIds } });
    const definedIds = definedSensors.map(s => s.sensorId);
    const invalidIds = sensorIds.filter(id => !definedIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Undefined sensor IDs: ${invalidIds.join(', ')}` });
    }

    // Guardar cada medida
    const savedSensors = [];

    for (let [sensorId, value] of entries) {
      const sensor = new Sensor({
        user: req.user._id,
        timestamp: new Date(timestamp),
        sensorId,
        value,
        coordinates: (latitude != null && longitude != null)
          ? { latitude, longitude }
          : undefined
      });

      await sensor.save();
      savedSensors.push(sensor);
    }

    res.status(201).json(savedSensors);

  } catch (error) {
    console.error("Error saving measurements:", error);
    res.status(500).json({ error: "Error saving measurements." });
  }
};

// Obtener medidas del usuario con filtro por timestamp
exports.getMeasures = async (req, res) => {
  const { from, to } = req.query;
  const filter = { user: req.user._id };

  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  try {
    const measures = await Sensor.find(filter);
    res.status(200).json(measures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Sensor definitions
exports.createSensorDefinition = async (req, res) => {
  const { sensorId, title, measure, description } = req.body;
  try {
    const existing = await SensorDefinition.findOne({ sensorId });
    if (existing) return res.status(400).json({ message: "Sensor ID already exists" });

    const def = new SensorDefinition({ sensorId, title, description, measure });
    await def.save();
    res.status(201).json(def);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSensorDefinitions = async (req, res) => {
  try {
    const sensors = await SensorDefinition.find({});
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
