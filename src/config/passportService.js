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
    return done(error);
  }
}));



module.exports = passport;
