<<<<<<< HEAD
const User = require('../models/user');
const passport = require('passport');
const jwt = require('jsonwebtoken');
=======
const passport = require('passport');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Sensor = require('../models/sensor');
const Measurement = require('../models/measurement'); 
const { sendMail } = require('../services/mailer');

>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476

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
<<<<<<< HEAD
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
=======
  console.log("🔍 Datos recibidos:", req.body); 

  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error("🚨 Error en Passport:", err);
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
      return res.status(500).json({ message: 'Server error', err });
    }

    if (!user) {
<<<<<<< HEAD
      return res.status(400).json({ message: 'Invalid credentials', info });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
    
     let token= generateAndSaveToken(user);

      return res.json({ user, token });
=======
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
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
    });
  })(req, res, next);
};

<<<<<<< HEAD
async function generateAndSaveToken(user){
      const token = await jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Guardar el token en la colección Token
        const tokenDocument = new Token({
          userId: user._id,             // ID del usuario
          token: token                  // El token generado
        });

        await tokenDocument.save();  

        return token;
}
=======

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



>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
