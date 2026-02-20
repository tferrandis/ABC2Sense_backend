const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/user');
const Subscription = require('../models/subscription');
const AuditLog = require('../models/auditLog');
const SensorDefinition = require('../models/sensorDefinition');
const Firmware = require('../models/firmware');

const getClientIp = (req) => req.ip || req.headers['x-forwarded-for'] || null;

const safeAuditLog = async (payload) => {
  try {
    await AuditLog.create(payload);
  } catch (_) {}
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return null;
};

const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

const firmwareUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(process.cwd(), 'uploads/firmware');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `admin-web-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const firmwareUploadMiddleware = multer({
  storage: firmwareUploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.bin', '.hex', '.elf', '.ino'];
    if (allowed.includes(ext) || file.mimetype === 'application/octet-stream') return cb(null, true);
    return cb(new Error('Invalid file type. Only firmware files are allowed.'));
  }
}).single('firmware');

exports.listUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1, registrationDate: -1 })
      .limit(100);

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, role, emailVerified } = req.body;
    const patch = {};
    if (typeof username === 'string') patch.username = username.trim();
    if (typeof role === 'string') patch.role = role;
    if (typeof emailVerified === 'boolean') patch.emailVerified = emailVerified;

    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_user_update', target: 'User', targetId: user._id, status: 'success', details: `Updated user ${user.email}` });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.listSubscriptions = async (_req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('userId', 'email username').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: subscriptions.length, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, startsAt } = req.body;
    if (!userId || !plan) return res.status(400).json({ success: false, message: 'userId and plan are required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subscription = await Subscription.create({ userId, plan, startsAt: startsAt ? new Date(startsAt) : new Date(), status: 'active' });
    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_subscription_create', target: 'Subscription', targetId: subscription._id, status: 'success', details: `Created ${plan} subscription for ${user.email}` });
    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { plan, status, endsAt } = req.body;
    const patch = {};
    if (typeof plan === 'string') patch.plan = plan;
    if (typeof status === 'string') patch.status = status;
    if (endsAt !== undefined) patch.endsAt = endsAt ? new Date(endsAt) : null;

    const subscription = await Subscription.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_subscription_update', target: 'Subscription', targetId: subscription._id, status: 'success', details: `Updated subscription ${subscription._id}` });
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(req.params.id, { status: 'canceled', endsAt: new Date() }, { new: true, runValidators: true });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_subscription_cancel', target: 'Subscription', targetId: subscription._id, status: 'success', details: `Canceled subscription ${subscription._id}` });
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.listSensorDefinitions = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const enabled = parseBoolean(req.query.enabled);
    const filter = {};
    if (q) {
      filter.$or = [
        { key: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    if (enabled !== null) filter.enabled = enabled;

    const sensors = await SensorDefinition.find(filter).sort({ sensorId: 1, created_at: -1 }).limit(200);
    res.json({ success: true, count: sensors.length, sensors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createSensorDefinition = async (req, res) => {
  try {
    const { sensorId, key, name, unit, description, origin, enabled } = req.body;
    if (!Number.isInteger(sensorId) || sensorId <= 0) return res.status(400).json({ success: false, message: 'sensorId must be a positive integer' });
    if (!key || !name || !unit || !origin) return res.status(400).json({ success: false, message: 'key, name, unit and origin are required' });

    const sensor = await SensorDefinition.create({
      sensorId,
      key,
      name,
      unit,
      description,
      origin,
      enabled: typeof enabled === 'boolean' ? enabled : true
    });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_sensor_create', target: 'SensorDefinition', targetId: sensor._id, status: 'success', details: `Created sensor definition ${sensor.key}` });
    res.status(201).json({ success: true, sensor });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.updateSensorDefinition = async (req, res) => {
  try {
    const { key, name, unit, description, origin, enabled } = req.body;
    const patch = {};
    if (typeof key === 'string' && key.trim()) patch.key = key.trim();
    if (typeof name === 'string' && name.trim()) patch.name = name.trim();
    if (typeof unit === 'string' && unit.trim()) patch.unit = unit.trim();
    if (typeof description === 'string') patch.description = description;
    if (typeof origin === 'string') patch.origin = origin;
    if (typeof enabled === 'boolean') patch.enabled = enabled;

    const sensor = await SensorDefinition.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!sensor) return res.status(404).json({ success: false, message: 'Sensor definition not found' });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_sensor_update', target: 'SensorDefinition', targetId: sensor._id, status: 'success', details: `Updated sensor definition ${sensor.key}` });
    res.json({ success: true, sensor });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.setSensorDefinitionEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled must be a boolean' });

    const sensor = await SensorDefinition.findByIdAndUpdate(req.params.id, { enabled }, { new: true, runValidators: true });
    if (!sensor) return res.status(404).json({ success: false, message: 'Sensor definition not found' });

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: enabled ? 'admin_web_sensor_enable' : 'admin_web_sensor_disable', target: 'SensorDefinition', targetId: sensor._id, status: 'success', details: `${enabled ? 'Enabled' : 'Disabled'} sensor definition ${sensor.key}` });
    res.json({ success: true, sensor });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.listFirmware = async (req, res) => {
  try {
    const isActive = parseBoolean(req.query.isActive);
    const filter = {};
    if (isActive !== null) filter.isActive = isActive;

    const firmwares = await Firmware.find(filter).populate('uploadedBy', 'username email').sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: firmwares.length, firmwares });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.uploadFirmware = (req, res) => {
  firmwareUploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: err.message });
    if (err) return res.status(400).json({ success: false, message: err.message });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded (field: firmware)' });

    try {
      const { version, description } = req.body;
      if (!version || !description) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'version and description are required' });
      }
      if (!semverRegex.test(version)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'version must match semver format x.y.z[-label]' });
      }

      const existingVersion = await Firmware.findOne({ version });
      if (existingVersion) {
        fs.unlinkSync(req.file.path);
        return res.status(409).json({ success: false, message: 'Firmware version already exists' });
      }

      const firmware = await Firmware.create({
        version,
        description,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedBy: req.admin._id,
        isActive: false
      });

      await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: 'admin_web_firmware_upload', target: 'Firmware', targetId: firmware._id, status: 'success', details: `Uploaded firmware ${firmware.version} (${firmware.originalName})` });
      res.status(201).json({ success: true, firmware });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
    }
  });
};

exports.setFirmwareEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled must be a boolean' });

    const firmware = await Firmware.findById(req.params.id);
    if (!firmware) return res.status(404).json({ success: false, message: 'Firmware not found' });

    if (enabled) {
      await Firmware.updateMany({}, { isActive: false });
      firmware.isActive = true;
    } else {
      firmware.isActive = false;
    }
    await firmware.save();

    await safeAuditLog({ actor: req.admin?._id, actorIp: getClientIp(req), action: enabled ? 'admin_web_firmware_enable' : 'admin_web_firmware_disable', target: 'Firmware', targetId: firmware._id, status: 'success', details: `${enabled ? 'Enabled' : 'Disabled'} firmware ${firmware.version}` });
    res.json({ success: true, firmware });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const { action, status, target, from, to, q, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = {};
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (target) filter.target = target;
    if (q && q.trim()) filter.details = { $regex: q.trim(), $options: 'i' };

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).populate('actor', 'email username role'),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit), logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
