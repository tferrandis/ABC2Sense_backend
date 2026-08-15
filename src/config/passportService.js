const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 🔐 Estrategia Local (autenticación con email o username + password)
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'identifier', // puede ser email o username
      passwordField: 'password',
      session: false,
    },
    async (identifier, password, done) => {
      try {
        // Identifiers are PII; do not log them.

        // Buscar usuario por email o username
        const user = await User.findOne({
          $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user) {
          console.warn('Login failed: user not found');
          return done(null, false, { message: 'Usuario no encontrado' });
        }

        // Comparar la contraseña encriptada
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.warn('Login failed: bad password');
          return done(null, false, { message: 'Credenciales inválidas' });
        }

        console.log('Login OK for user id', user._id.toString());
        return done(null, user);
      } catch (error) {
        console.error('🚨 Error en autenticación local:', error);
        return done(error);
      }
    }
  )
);

/**
 * 🔑 Estrategia JWT (autenticación mediante token Bearer)
 */
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {

      const user = await User.findById(jwt_payload.id);
      if (!user) {
        console.warn('JWT references unknown user id');
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      console.error('🚨 Error en la estrategia JWT:', error);
      return done(error, false);
    }
  })
);

module.exports = passport;
