const passport = require('passport');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Sensor = require('../models/sensor');
const Measurement = require('../models/measurement'); 
const { sendMail } = require('../services/mailer');


exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
};

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



