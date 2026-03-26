const Notebook = require('../models/notebook');
const Preset = require('../models/preset');
const Measurement = require('../models/measurement');
const SensorDefinition = require('../models/sensorDefinition');

function resolveOwner(req, requestedUserId) {
  return (req.user.role === 'admin' && requestedUserId) ? requestedUserId : req.user._id;
}

function normalizeHexColor(colorHex) {
  if (!colorHex) return null;
  const raw = String(colorHex).trim();
  const normalized = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    throw new Error('color_hex must be a valid hex color (#RRGGBB)');
  }
  return normalized.toUpperCase();
}

function validateArea(type, area) {
  if (type !== 'area') return;
  if (!area) return; // area notebooks can exist without defined area yet

  const mode = area.mode || 'circle';
  if (!['circle', 'polygon'].includes(mode)) {
    throw new Error('area.mode must be circle or polygon');
  }

  if (mode === 'polygon') {
    if (!Array.isArray(area.points) || area.points.length < 3) {
      throw new Error('area.points must contain at least 3 points for polygon mode');
    }
    for (const p of area.points) {
      if (typeof p?.lat !== 'number' || typeof p?.lon !== 'number') {
        throw new Error('polygon points require numeric lat and lon');
      }
    }
    return;
  }

  // circle mode: if any circle field provided, require full set
  const lon = area.lon ?? area.long;
  const hasAny = area.lat != null || lon != null || area.radius_m != null;
  if (!hasAny) return;

  if (typeof area.lat !== 'number' || typeof lon !== 'number' || typeof area.radius_m !== 'number') {
    throw new Error('Area circle requires area.lat, area.lon and area.radius_m as numbers');
  }
}

function normalizeArea(area) {
  if (!area) return null;
  const mode = area.mode || 'circle';
  if (mode === 'polygon') {
    return {
      mode: 'polygon',
      lat: null,
      lon: null,
      radius_m: null,
      points: (area.points || []).map((p) => ({ lat: p.lat, lon: p.lon }))
    };
  }

  return {
    mode: 'circle',
    lat: area.lat ?? null,
    lon: area.lon ?? area.long ?? null,
    radius_m: area.radius_m ?? null,
    points: []
  };
}

function normalizeSensorRanges(inputRanges) {
  if (!Array.isArray(inputRanges)) throw new Error('sensor_ranges must be an array');

  return inputRanges.map((range) => {
    const sensorId = isNaN(range.sensor_id) ? range.sensor_id : parseInt(range.sensor_id, 10);
    const optimalMin = typeof range.optimal_min === 'number' ? range.optimal_min : range.min;
    const optimalMax = typeof range.optimal_max === 'number' ? range.optimal_max : range.max;
    return {
      sensor_id: sensorId,
      optimal_min: optimalMin,
      optimal_max: optimalMax
    };
  });
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

    const sensorId = isNaN(range.sensor_id) ? range.sensor_id : parseInt(range.sensor_id, 10);
    const exists = await SensorDefinition.exists({ sensorId, enabled: true });
    if (!exists) {
      throw new Error(`sensor_id ${range.sensor_id} is not available in enabled sensor catalog`);
    }
  }
}

async function validatePresetOwnership({ presetId, owner }) {
  if (!presetId) return;
  const preset = await Preset.findById(presetId);
  if (!preset) throw new Error('preset_id does not exist');
  if (String(preset.user_id) !== String(owner)) {
    throw new Error('preset_id does not belong to owner');
  }
}

exports.createNotebook = async (req, res) => {
  try {
    const {
      name,
      type = 'simple',
      area = null,
      description = null,
      preset_id = null,
      emoji = null,
      color_hex = null,
      user_id = null
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    validateArea(type, area);
    const owner = resolveOwner(req, user_id);

    const duplicate = await Notebook.findOne({ user_id: owner, name: { $regex: `^${String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (duplicate) return res.status(409).json({ error: 'Notebook name already exists' });

    await validatePresetOwnership({ presetId: preset_id, owner });

    const notebook = await Notebook.create({
      user_id: owner,
      name: String(name).trim(),
      type,
      area: normalizeArea(area),
      description,
      preset_id: preset_id || null,
      emoji: emoji ? String(emoji).trim() : null,
      color_hex: normalizeHexColor(color_hex)
    });
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
    const nextArea = Object.prototype.hasOwnProperty.call(req.body, 'area') ? req.body.area : notebook.area;
    validateArea(nextType, nextArea);

    if (req.body.name && String(req.body.name).trim().toLowerCase() !== String(notebook.name).trim().toLowerCase()) {
      const duplicate = await Notebook.findOne({
        _id: { $ne: notebook._id },
        user_id: notebook.user_id,
        name: { $regex: `^${String(req.body.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
      });
      if (duplicate) return res.status(409).json({ error: 'Notebook name already exists' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) notebook.name = String(req.body.name).trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'type')) notebook.type = req.body.type;
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) notebook.description = req.body.description;
    if (Object.prototype.hasOwnProperty.call(req.body, 'preset_id')) {
      await validatePresetOwnership({ presetId: req.body.preset_id, owner: notebook.user_id });
      notebook.preset_id = req.body.preset_id || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'emoji')) notebook.emoji = req.body.emoji ? String(req.body.emoji).trim() : null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'color_hex')) notebook.color_hex = normalizeHexColor(req.body.color_hex);
    if (Object.prototype.hasOwnProperty.call(req.body, 'area')) notebook.area = normalizeArea(req.body.area);

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
    const {
      name,
      notebook_id = null,
      sensor_ranges = null,
      ranges = null,
      user_id = null
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const owner = resolveOwner(req, user_id);
    const normalizedRanges = normalizeSensorRanges(sensor_ranges || ranges || []);
    await validatePresetRanges(normalizedRanges);

    if (notebook_id) {
      const notebook = await Notebook.findById(notebook_id);
      if (!notebook) return res.status(400).json({ error: 'notebook_id does not exist' });
      if (notebook.user_id.toString() !== owner.toString()) {
        return res.status(403).json({ error: 'notebook_id does not belong to owner' });
      }
    }

    const preset = await Preset.create({ user_id: owner, name, notebook_id, sensor_ranges: normalizedRanges });
    const out = preset.toObject();
    out.id = String(out._id);
    out.ranges = (out.sensor_ranges || []).map((r) => ({
      sensor_id: r.sensor_id,
      min: r.optimal_min,
      max: r.optimal_max
    }));
    return res.status(201).json(out);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getPresets = async (req, res) => {
  try {
    const owner = resolveOwner(req, req.query.userId);
    const presets = await Preset.find({ user_id: owner }).sort({ created_at: -1 });
    const mapped = presets.map((p) => {
      const out = p.toObject();
      out.id = String(out._id);
      out.ranges = (out.sensor_ranges || []).map((r) => ({
        sensor_id: r.sensor_id,
        min: r.optimal_min,
        max: r.optimal_max
      }));
      return out;
    });
    return res.status(200).json({ total: mapped.length, presets: mapped });
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

    const patch = { ...req.body };
    if (patch.sensor_ranges || patch.ranges) {
      const normalizedRanges = normalizeSensorRanges(patch.sensor_ranges || patch.ranges || []);
      await validatePresetRanges(normalizedRanges);
      patch.sensor_ranges = normalizedRanges;
      delete patch.ranges;
    }

    Object.assign(preset, patch);
    await preset.save();

    const out = preset.toObject();
    out.id = String(out._id);
    out.ranges = (out.sensor_ranges || []).map((r) => ({
      sensor_id: r.sensor_id,
      min: r.optimal_min,
      max: r.optimal_max
    }));
    return res.status(200).json(out);
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
