//const mongoose = require('mongoose');
const {Schema, model} = require("mongoose");
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  registrationDate: { type: Date, default: Date.now },
  uuid: { type: String, default: uuidv4 },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['inactive', 'active', 'past_due', 'canceled'],
      default: 'inactive'
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false }
  }
});


UserSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});


UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = model('User', UserSchema);
module.exports = User;
