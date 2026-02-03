const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const User = require('../models/user');

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
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
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
      return res.status(403).json({ 
        success: false, 
        message: 'Only superadmins can create new admins' 
      });
    }

    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email and password are required' 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
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
