const Notebook = require('../models/notebook');
const Preset = require('../models/preset');
const Measurement = require('../models/measurement');
const SensorDefinition = require('../models/sensorDefinition');

function resolveOwner(req, requestedUserId) {
  return (req.user.role === 'admin' && requestedUserId) ? requestedUserId : req.user._id;
}

function validateArea(type, area) {
  if (type !== 'area') return;
  if (!area || typeof area.lat !== 'number' || typeof area.long !== 'number' || typeof area.radius_m !== 'number') {
    throw new Error('Area notebooks require area.lat, area.long and area.radius_m as numbers');
  }
}

async function validatePresetRanges(sensorRanges) {
  if (!Array.isArray(sensorRanges)) throw new Error('sensor_ranges must be an array');

  for (const range of sensorRanges) {
    if (typeof range.optimal_min !== 'number' || typeof range.optimal_max !== 'number') {
      throw new Error('optimal_min and optimal_max must be numbers');
    }
    if (range.optimal_min > range.optimal_max) {
      throw new Error('optimal_min cannot be greater than optimal_max');
    }

    const sensorId = isNaN(range.sensor_id) ? range.sensor_id : parseInt(range.sensor_id);
    const exists = await SensorDefinition.exists({ sensorId, enabled: true });
    if (!exists) {
      throw new Error(`sensor_id ${range.sensor_id} is not available in enabled sensor catalog`);
    }
  }
}

exports.createNotebook = async (req, res) => {
  try {
    const { name, type = 'simple', area = null, description = null, user_id = null } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    validateArea(type, area);

    const owner = resolveOwner(req, user_id);
    const notebook = await Notebook.create({ user_id: owner, name, type, area, description });
    return res.status(201).json(notebook);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getNotebooks = async (req, res) => {
  try {
    const owner = resolveOwner(req, req.query.userId);
    const notebooks = await Notebook.find({ user_id: owner }).sort({ created_at: -1 });
    return res.status(200).json({ total: notebooks.length, notebooks });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findById(req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });
    if (notebook.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const nextType = req.body.type || notebook.type;
    const nextArea = req.body.area || notebook.area;
    validateArea(nextType, nextArea);

    Object.assign(notebook, req.body);
    await notebook.save();
    return res.status(200).json(notebook);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.deleteNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findById(req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });
    if (notebook.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Notebook.findByIdAndDelete(req.params.id);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.createPreset = async (req, res) => {
  try {
    const { name, notebook_id = null, sensor_ranges = [], user_id = null } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const owner = resolveOwner(req, user_id);
    await validatePresetRanges(sensor_ranges);

    if (notebook_id) {
      const notebook = await Notebook.findById(notebook_id);
      if (!notebook) return res.status(400).json({ error: 'notebook_id does not exist' });
      if (notebook.user_id.toString() !== owner.toString()) {
        return res.status(403).json({ error: 'notebook_id does not belong to owner' });
      }
    }

    const preset = await Preset.create({ user_id: owner, name, notebook_id, sensor_ranges });
    return res.status(201).json(preset);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getPresets = async (req, res) => {
  try {
    const owner = resolveOwner(req, req.query.userId);
    const presets = await Preset.find({ user_id: owner }).sort({ created_at: -1 });
    return res.status(200).json({ total: presets.length, presets });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updatePreset = async (req, res) => {
  try {
    const preset = await Preset.findById(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    if (preset.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.body.sensor_ranges) await validatePresetRanges(req.body.sensor_ranges);
    Object.assign(preset, req.body);
    await preset.save();
    return res.status(200).json(preset);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.deletePreset = async (req, res) => {
  try {
    const preset = await Preset.findById(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    if (preset.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Preset.findByIdAndDelete(req.params.id);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.assignMeasurementToNotebook = async (req, res) => {
  try {
    const { notebookId, measurementId } = req.params;
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });

    if (notebook.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const measurement = await Measurement.findById(measurementId);
    if (!measurement) return res.status(404).json({ error: 'Measurement not found' });
    if (measurement.user_id.toString() !== notebook.user_id.toString()) {
      return res.status(400).json({ error: 'Measurement owner mismatch with notebook owner' });
    }

    measurement.notebook_id = notebook._id.toString();
    await measurement.save();
    return res.status(200).json({ assigned: true, measurementId, notebookId: notebook._id.toString() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
