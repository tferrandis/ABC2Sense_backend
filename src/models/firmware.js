const { Schema, model } = require("mongoose");

const FirmwareSchema = new Schema({
  version: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  filename: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  mimetype: { 
    type: String, 
    required: true 
  },
  path: { 
    type: String, 
    required: true 
  },
  uploadedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },
  downloads: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Firmware = model('Firmware', FirmwareSchema);
module.exports = Firmware;
