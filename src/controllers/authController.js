const passport = require('passport');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const PasswordResetToken = require('../models/passwordResetToken');
const AuditLog = require('../models/auditLog');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Sensor = require('../models/sensor');
const Measurement = require('../models/measurement');
const { sendMail } = require('../services/mailer');

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate an access token + refresh token pair and persist the refresh token hash.
 */
async function generateTokenPair(userId) {
  const expirationDate = new Date(Date.now() + ACCESS_TOKEN_MS);
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = RefreshToken.hashToken(rawRefreshToken);

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
  });

  return { accessToken, refreshToken: rawRefreshToken, expiresAt: expirationDate.toISOString() };
}

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
 * @apiSuccess (201) {String} accessToken JWT access token (15m expiration)
 * @apiSuccess (201) {String} refreshToken Refresh token (7d expiration)
 * @apiSuccess (201) {String} expiresAt Access token expiration timestamp
 *
 * @apiError (400) {String} message Email already registered / Username already taken
 * @apiError (500) {String} message Server error
 */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const tokens = await generateTokenPair(user._id);

    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      ...tokens
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
 * @apiDescription Authenticate user and receive access + refresh tokens
 *
 * @apiBody {String} identifier User's email or username
 * @apiBody {String} password User's password
 *
 * @apiSuccess {Object} user User information
 * @apiSuccess {String} accessToken JWT access token (15m expiration)
 * @apiSuccess {String} refreshToken Refresh token (7d expiration)
 * @apiSuccess {String} expiresAt Access token expiration timestamp
 *
 * @apiError (400) {String} message Invalid credentials
 * @apiError (429) {String} error Too many login attempts
 * @apiError (500) {String} message Server error
 */
exports.login = (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Server error', error: err.message });
    }

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas', info });
    }

    try {
      const tokens = await generateTokenPair(user._id);

      return res.json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        },
        ...tokens
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error generating tokens', error: error.message });
    }
  })(req, res, next);
};

/**
 * @api {post} /api/auth/refresh Refresh Tokens
 * @apiName RefreshTokens
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Rotate refresh token and get a new access + refresh token pair
 *
 * @apiBody {String} refreshToken Current valid refresh token
 *
 * @apiSuccess {String} accessToken New JWT access token
 * @apiSuccess {String} refreshToken New refresh token
 * @apiSuccess {String} expiresAt Access token expiration timestamp
 *
 * @apiError (401) {String} message Invalid or expired refresh token
 * @apiError (429) {String} error Too many refresh attempts
 */
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokenHash = RefreshToken.hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!storedToken) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Revoke old token
    storedToken.revoked = true;
    await storedToken.save();

    // Generate new pair
    const tokens = await generateTokenPair(storedToken.userId);

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

/**
 * @api {post} /api/auth/logout Logout
 * @apiName LogoutUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Revoke the current refresh token to end the session
 *
 * @apiHeader {String} Authorization Bearer JWT token
 * @apiBody {String} refreshToken Refresh token to revoke
 *
 * @apiSuccess {String} message Logged out successfully
 *
 * @apiError (401) Unauthorized User not authenticated
 */
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokenHash = RefreshToken.hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash,
      userId: req.user._id,
      revoked: false
    });

    if (storedToken) {
      storedToken.revoked = true;
      await storedToken.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

/**
 * @api {get} /api/auth/me Get Current User
 * @apiName GetMe
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Get the authenticated user's profile
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {String} _id User ID
 * @apiSuccess {String} username Username
 * @apiSuccess {String} email Email
 * @apiSuccess {String} role User role
 * @apiSuccess {Boolean} emailVerified Email verification status
 * @apiSuccess {String} registrationDate Registration date
 *
 * @apiError (401) Unauthorized User not authenticated
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await Sensor.deleteMany({ user: req.user._id });
    await Measurement.deleteMany({ user_id: req.user._id });
    await RefreshToken.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'User and related data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @api {post} /api/auth/forgot-password Forgot Password
 * @apiName ForgotPassword
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Request a password reset token. Always returns 200 to prevent email enumeration.
 *
 * @apiBody {String} email User's email address
 *
 * @apiSuccess {String} message Confirmation message
 *
 * @apiError (429) {String} error Too many requests
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const clientIp = req.ip;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      await AuditLog.create({
        actor: null,
        actorIp: clientIp,
        action: 'password_reset_request',
        target: 'User',
        status: 'failure',
        details: 'Email not found (no info leaked to client)'
      });
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Invalidate any previous unused tokens for this user
    await PasswordResetToken.updateMany(
      { userId: user._id, usedAt: null },
      { usedAt: new Date() }
    );

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = PasswordResetToken.hashToken(rawToken);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    await sendMail({
      to: user.email,
      subject: 'Password Reset - ABC2Sense',
      html: `<p>You requested a password reset.</p><p>Click the following link to reset your password (valid for 15 minutes):</p><a href="${resetUrl}">${resetUrl}</a><p>If you did not request this, please ignore this email.</p>`
    });

    await AuditLog.create({
      actor: user._id,
      actorIp: clientIp,
      action: 'password_reset_request',
      target: 'User',
      targetId: user._id,
      status: 'success',
      details: 'Reset token issued and email sent'
    });

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
};

/**
 * @api {post} /api/auth/reset-password Reset Password
 * @apiName ResetPassword
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiDescription Reset password using a valid reset token. Invalidates all active sessions.
 *
 * @apiBody {String} token Reset token received via email
 * @apiBody {String} password New password (min 8 chars, 1 uppercase, 1 special char)
 *
 * @apiSuccess {String} message Password reset confirmation
 *
 * @apiError (400) {String} message Invalid or expired reset token
 */
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const clientIp = req.ip;

  try {
    const tokenHash = PasswordResetToken.hashToken(token);
    const storedToken = await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!storedToken) {
      await AuditLog.create({
        actor: null,
        actorIp: clientIp,
        action: 'password_reset',
        status: 'failure',
        details: 'Invalid or expired reset token'
      });
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    const user = await User.findById(storedToken.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    user.password = password;
    await user.save();

    // Mark token as used
    storedToken.usedAt = new Date();
    await storedToken.save();

    // Revoke all refresh tokens (force re-login on all devices)
    await RefreshToken.updateMany(
      { userId: user._id, revoked: false },
      { revoked: true }
    );

    await AuditLog.create({
      actor: user._id,
      actorIp: clientIp,
      action: 'password_reset',
      target: 'User',
      targetId: user._id,
      status: 'success',
      details: 'Password updated, all sessions revoked'
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};
