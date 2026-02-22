const SensorDefinition = require('../models/sensorDefinition');

const serialize = (sensor) => ({
  id: sensor._id,
  sensorId: sensor.sensorId,
  name: sensor.name,
  unit: sensor.unit,
  decimals: sensor.decimals,
  enabled: sensor.enabled,
  catalog_version: sensor.catalogVersion
});

exports.list = async (req, res) => {
  try {
    const includeDisabled = req.query.includeDisabled === 'true';
    const filter = includeDisabled ? {} : { enabled: true };

    const items = await SensorDefinition.find(filter).sort({ sensorId: 1 });
    res.json({ success: true, count: items.length, sensors: items.map(serialize) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { sensorId, key, name, unit, decimals, enabled } = req.body;

    const [existingId, existingKey] = await Promise.all([
      SensorDefinition.findOne({ sensorId }),
      SensorDefinition.findOne({ key: key.toUpperCase() })
    ]);

    if (existingId) return res.status(409).json({ success: false, message: 'sensorId already exists' });
    if (existingKey) return res.status(409).json({ success: false, message: 'key already exists' });

    const sensor = await SensorDefinition.create({
      sensorId,
      key,
      name,
      unit,
      decimals,
      enabled: enabled !== undefined ? enabled : true,
      origin: 'backend',
      catalogVersion: 1
    });

    res.status(201).json({ success: true, sensor: serialize(sensor) });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation error', error: error.message });
  }
};

exports.patch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const mutableFields = ['name', 'unit', 'decimals', 'enabled'];

    mutableFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const sensor = await SensorDefinition.findById(id);
    if (!sensor) return res.status(404).json({ success: false, message: 'Sensor not found' });

    let changed = false;
    Object.entries(updates).forEach(([field, value]) => {
      if (sensor[field] !== value) {
        sensor[field] = value;
        changed = true;
      }
    });

    if (changed) {
      sensor.catalogVersion += 1;
      await sensor.save();
    }

    res.json({ success: true, sensor: serialize(sensor) });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation error', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const sensor = await SensorDefinition.findById(id);
    if (!sensor) return res.status(404).json({ success: false, message: 'Sensor not found' });

    if (sensor.enabled) {
      sensor.enabled = false;
      sensor.catalogVersion += 1;
      await sensor.save();
    }

    res.json({ success: true, message: 'Sensor deprecated (disabled)', sensor: serialize(sensor) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
