const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const User = require('../models/user');
const Measurement = require('../models/measurement');
const Sensor = require('../models/sensor');
const Firmware = require('../models/firmware');
const RefreshToken = require('../models/refreshToken');
const AuditLog = require('../models/auditLog');

const getClientIp = (req) => req.ip || req.headers['x-forwarded-for'] || null;

const safeAuditLog = async (payload) => {
  try {
    await AuditLog.create(payload);
  } catch (_) {
    // Audit logging must never break the main flow.
  }
};

/**
 * @api {post} /api/auth Admin Login
 * @apiName AdminLogin
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Authenticate admin and receive JWT token
 *
 * @apiBody {String} email Admin's email address
 * @apiBody {String} password Admin's password
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} token JWT authentication token
 * @apiSuccess {Object} admin Admin information
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "admin": {
 *         "id": "507f1f77bcf86cd799439011",
 *         "username": "admin",
 *         "email": "admin@example.com",
 *         "role": "admin"
 *       }
 *     }
 *
 * @apiError (400) {Boolean} success False
 * @apiError (400) {String} message Email and password are required
 * @apiError (401) {Boolean} success False
 * @apiError (401) {String} message Invalid credentials
 */
// Login admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      await safeAuditLog({
        actor: null,
        actorIp: getClientIp(req),
        action: 'admin_login',
        target: 'Admin',
        status: 'failure',
        details: 'Missing email or password'
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      await safeAuditLog({
        actor: null,
        actorIp: getClientIp(req),
        action: 'admin_login',
        target: 'Admin',
        status: 'failure',
        details: `Admin not found for email ${email}`
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await safeAuditLog({
        actor: admin._id,
        actorIp: getClientIp(req),
        action: 'admin_login',
        target: 'Admin',
        targetId: admin._id,
        status: 'failure',
        details: 'Invalid password'
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role,
        isAdmin: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await safeAuditLog({
      actor: admin._id,
      actorIp: getClientIp(req),
      action: 'admin_login',
      target: 'Admin',
      targetId: admin._id,
      status: 'success',
      details: 'Admin login successful'
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {get} /api/auth/users Get All Users (Admin)
 * @apiName GetUsers
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all users (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Number} count Number of users
 * @apiSuccess {Object[]} users Array of user objects
 *
 * @apiError (500) {Boolean} success False
 * @apiError (500) {String} message Error message
 */
// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {get} /api/auth/users/:id Get User by ID (Admin)
 * @apiName GetUserById
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Get specific user by ID (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiParam {String} id User's ID
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} user User object
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message User not found
 */
// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {delete} /api/auth/users/:id Delete User (Admin)
 * @apiName DeleteUser
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Delete user by ID (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiParam {String} id User's ID
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} message Success message
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message User not found
 */
// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {get} /api/auth/stats Get Statistics (Admin)
 * @apiName GetStats
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Get system statistics (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} stats Statistics object
 * @apiSuccess {Number} stats.totalUsers Total number of users
 * @apiSuccess {Number} stats.totalAdmins Total number of admins
 *
 * @apiError (500) {Boolean} success False
 * @apiError (500) {String} message Error message
 */
// Get stats
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await Admin.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {get} /api/auth/profile Get Admin Profile
 * @apiName GetProfile
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Get authenticated admin profile
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} admin Admin object
 *
 * @apiError (500) {Boolean} success False
 * @apiError (500) {String} message Error message
 */
// Get profile
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      admin: req.admin
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * @api {post} /api/auth/create Create Admin (Superadmin)
 * @apiName CreateAdmin
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new admin account (superadmin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (superadmin)
 *
 * @apiBody {String} username Admin's username
 * @apiBody {String} email Admin's email address
 * @apiBody {String} password Admin's password
 * @apiBody {String} [role=admin] Admin role (admin or superadmin)
 *
 * @apiSuccess (201) {Boolean} success Success status
 * @apiSuccess (201) {String} message Success message
 * @apiSuccess (201) {Object} admin Created admin object
 *
 * @apiError (400) {Boolean} success False
 * @apiError (400) {String} message Validation error
 * @apiError (403) {Boolean} success False
 * @apiError (403) {String} message Only superadmins can create new admins
 */
// Create admin (superadmin only)
exports.createAdmin = async (req, res) => {
  try {
    // Check if requester is superadmin
    if (req.admin.role !== 'superadmin') {
      await safeAuditLog({
        actor: req.admin?._id || null,
        actorIp: getClientIp(req),
        action: 'admin_create',
        target: 'Admin',
        status: 'failure',
        details: 'Non-superadmin attempted admin creation'
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Only superadmins can create new admins' 
      });
    }

    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password) {
      await safeAuditLog({
        actor: req.admin?._id || null,
        actorIp: getClientIp(req),
        action: 'admin_create',
        target: 'Admin',
        status: 'failure',
        details: 'Missing username/email/password'
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email and password are required' 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      await safeAuditLog({
        actor: req.admin?._id || null,
        actorIp: getClientIp(req),
        action: 'admin_create',
        target: 'Admin',
        status: 'failure',
        details: `Admin already exists for email ${email} or username ${username}`
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Admin with this email or username already exists' 
      });
    }

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password,
      role: role || 'admin'
    });

    await admin.save();

    await safeAuditLog({
      actor: req.admin?._id || null,
      actorIp: getClientIp(req),
      action: 'admin_create',
      target: 'Admin',
      targetId: admin._id,
      status: 'success',
      details: `Admin ${admin.email} created with role ${admin.role}`
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get audit logs (admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      status,
      actor,
      from,
      to,
      page = 1,
      limit = 50
    } = req.query;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = {};
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (actor) filter.actor = actor;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      logs: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Device inventory from measurements (admin only)
exports.getDevicesInventory = async (req, res) => {
  try {
    const {
      q,
      userId,
      from,
      to,
      page = 1,
      limit = 25
    } = req.query;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const match = {
      device_id: { $exists: true, $ne: null, $ne: '' }
    };

    if (userId) {
      match.user_id = userId;
    }

    if (q) {
      match.device_id = { $regex: q, $options: 'i' };
    }

    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }

    const [result] = await Measurement.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$device_id',
          userId: { $first: '$user_id' },
          totalMeasurements: { $sum: 1 },
          firstSeenAt: { $min: '$timestamp' },
          lastSeenAt: { $max: '$timestamp' },
          lastSource: { $first: '$source' },
          lastLocation: { $first: '$location' }
        }
      },
      { $sort: { lastSeenAt: -1 } },
      {
        $facet: {
          rows: [
            { $skip: (safePage - 1) * safeLimit },
            { $limit: safeLimit }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const rows = (result && result.rows) || [];
    const total = (result && result.total && result.total[0] && result.total[0].count) || 0;

    res.json({
      success: true,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      devices: rows.map((row) => ({
        deviceId: row._id,
        userId: row.userId,
        totalMeasurements: row.totalMeasurements,
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        lastSource: row.lastSource || null,
        lastLocation: row.lastLocation || null
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Dashboard KPIs + Health (admin only)
exports.getDashboardKpis = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalMeasurements,
      totalSensors,
      totalFirmware,
      activeRefreshTokens,
      failedAuditEvents24h
    ] = await Promise.all([
      User.countDocuments(),
      Admin.countDocuments(),
      Measurement.countDocuments(),
      Sensor.countDocuments(),
      Firmware.countDocuments(),
      RefreshToken.countDocuments({ revoked: false }),
      AuditLog.countDocuments({
        status: 'failure',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      kpis: {
        totals: {
          users: totalUsers,
          admins: totalAdmins,
          measurements: totalMeasurements,
          sensors: totalSensors,
          firmware: totalFirmware,
          activeSessions: activeRefreshTokens
        },
        health: {
          status: 'ok',
          failedAuditEvents24h,
          serverTime: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime())
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
