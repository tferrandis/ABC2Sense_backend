const passport = require('passport');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Sensor = require('../models/sensor');
const Measurement = require('../models/measurement');
const { sendMail } = require('../services/mailer');

/**
 * @api {post} /api/auth/register Register User
 * @apiName RegisterUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Register a new user account and receive authentication tokens
 *
 * @apiBody {String} username User's username (min 3 characters)
 * @apiBody {String} email User's email address
 * @apiBody {String} password User's password (min 8 chars, 1 uppercase, 1 special char)
 *
 * @apiSuccess (201) {Object} user User information
 * @apiSuccess (201) {String} user._id User ID
 * @apiSuccess (201) {String} user.username Username
 * @apiSuccess (201) {String} user.email Email address
 * @apiSuccess (201) {String} user.role User role (default: "user")
 * @apiSuccess (201) {Boolean} user.emailVerified Email verification status (default: false)
 * @apiSuccess (201) {String} accessToken JWT access token (8h expiration)
 * @apiSuccess (201) {String} refreshToken JWT refresh token (7d expiration)
 * @apiSuccess (201) {String} expiresAt Access token expiration timestamp
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "user": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "username": "johndoe",
 *         "email": "john@example.com",
 *         "role": "user",
 *         "emailVerified": false
 *       },
 *       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "expiresAt": "2024-01-01T20:00:00.000Z"
 *     }
 *
 * @apiError (400) {String} message Email already registered
 * @apiError (400) {String} message Username already taken
 * @apiError (400) {Array} errors Validation errors
 * @apiError (500) {String} message Server error
 */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check for existing username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create user (role defaults to 'user', emailVerified defaults to false)
    const user = new User({ username, email, password });
    await user.save();

    // Generate access token (8h expiration)
    const accessTokenExpiresIn = '8h';
    const expirationDate = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: accessTokenExpiresIn });

    // Generate refresh token (7d expiration)
    const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return user data without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    };

    res.status(201).json({
      user: userResponse,
      accessToken,
      refreshToken,
      expiresAt: expirationDate.toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

/**
 * @api {post} /api/auth/login User Login
 * @apiName LoginUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Authenticate user and receive JWT token
 *
 * @apiBody {String} email User's email address
 * @apiBody {String} password User's password
 *
 * @apiSuccess {Object} user User information
 * @apiSuccess {String} token JWT authentication token
 * @apiSuccess {String} expiresAt Token expiration timestamp
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "username": "johndoe",
 *         "email": "john@example.com"
 *       },
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "expiresAt": "2024-01-01T12:00:00.000Z"
 *     }
 *
 * @apiError (400) {String} message Invalid credentials message
 * @apiError (500) {String} message Server error message
 */
exports.login = (req, res, next) => {
  console.log("🔍 Datos recibidos:", req.body); 

  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error("🚨 Error en Passport:", err);
      return res.status(500).json({ message: 'Server error', err });
    }

    if (!user) {
      console.warn("⚠️ Usuario no encontrado o credenciales incorrectas:", info);
      return res.status(400).json({ message: 'Credenciales inválidas', info });
    }

    req.login(user, { session: false }, async (err) => {
      if (err) {
        console.error("🚨 Error en login:", err);
        return res.status(500).send(err);
      }

      console.log("✅ Login exitoso para:", user.username);

      // Definir duración y caducidad
      const expiresIn = '8h';
      const expirationDate = new Date(Date.now() + 8 * 60 * 60 * 1000); 

      // Generar token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn });

      return res.json({
        user,
        token,
        expiresAt: expirationDate.toISOString() 
      });
    });
  })(req, res, next);
};


exports.deleteAccount = async (req, res) => {
  try {
    await Sensor.deleteMany({ user: req.user._id });

    await Measurement.deleteMany({ user_id: req.user._id });

        await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'User and related data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'User not found' });

  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, user._id);

  const resetUrl = `test`;

  await sendMail({
    to: user.email,
    subject: 'Password Reset',
    html: `<p>Click the following link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
  });

  res.json({ message: 'Reset link sent to email' });
};



