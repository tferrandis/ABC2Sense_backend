const User = require('../models/user');
const passport = require('passport');
const jwt = require('jsonwebtoken');

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
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Server error', err });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials', info });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
    
     let token= generateAndSaveToken(user);

      return res.json({ user, token });
    });
  })(req, res, next);
};

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