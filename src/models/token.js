const { Schema, model } = require('mongoose');

const TokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // Relacionado con el usuario
  token: { type: String, required: true },                               // El token JWT
  createdAt: { type: Date, default: Date.now, expires: '8h' },           // Expira en 8 horas
});

const Token = model('Token', TokenSchema);
module.exports = Token;
