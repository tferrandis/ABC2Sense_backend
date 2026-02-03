const { Schema, model } = require("mongoose");
const bcrypt = require('bcryptjs');

const AdminSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'superadmin'], 
    default: 'admin'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  }
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password
AdminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Admin = model('Admin', AdminSchema);
module.exports = Admin;
