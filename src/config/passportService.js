<<<<<<< HEAD
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// Configura la estrategia local
passport.use(new LocalStrategy({
  usernameField: 'identifier',  // 'identifier' puede ser email o username
  passwordField: 'password'
}, async (identifier, password, done) => {
  try {
    console.log('Identifier received:', identifier);

    // Intentar buscar al usuario por email o username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });
   

    if (!user) {
      console.log("aki?")
      return done(null, false, { message: 'User not found' });
    }

    // Comparar la contraseña ingresada con la almacenada en la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect user or password' });
    }

    // Si las credenciales son correctas, devolver el usuario
    return done(null, true, {});
  } catch (error) {
=======

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 🔐 Estrategia Local (Autenticación con username o email y password)
 */
passport.use(new LocalStrategy({
  usernameField: 'identifier', // Permite email o username
  passwordField: 'password',
  session: false
}, async (identifier, password, done) => {
  try {
    console.log("🔍 Buscando usuario con:", identifier);

    // Buscar usuario por email o username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      console.warn("⚠️ Usuario no encontrado:", identifier);
      return done(null, false, { message: 'Usuario no encontrado' });
    }

    console.log("✅ Usuario encontrado:", user.username);

    // Comparar contraseña encriptada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn("❌ Contraseña incorrecta para:", identifier);
      return done(null, false, { message: 'Contraseña incorrecta' });
    }

    console.log("🔑 Login exitoso para:", user.username);
    return done(null, user);
  } catch (error) {
    console.error("🚨 Error en autenticación:", error);
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
    return done(error);
  }
}));

<<<<<<< HEAD

=======
/**
 * 🔐 Estrategia JWT (Autenticación con token)
 */
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    console.log("🔍 Verificando JWT para usuario ID:", jwt_payload.id);
    
    const user = await User.findById(jwt_payload.id);
    if (!user) {
      console.warn("⚠️ Usuario no encontrado con ID:", jwt_payload.id);
      return done(null, false);
    }

    console.log("✅ Usuario autenticado con JWT:", user.username);
    return done(null, user);
  } catch (error) {
    console.error("🚨 Error en la estrategia JWT:", error);
    return done(error, false);
  }
}));
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476

module.exports = passport;
