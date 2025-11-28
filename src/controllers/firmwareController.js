const Firmware = require('../models/firmware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/firmware';
    // Create directory if it doesn't exist
    if (\!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'firmware-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.bin', '.hex', '.elf', '.ino'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext) || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only firmware files are allowed.'));
    }
  }
}).single('firmware');

// Upload firmware
exports.upload = (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Upload error', 
        error: err.message 
      });
    } else if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    if (\!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    try {
      const { version, description } = req.body;

      if (\!version || \!description) {
        // Delete uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          success: false, 
          message: 'Version and description are required' 
        });
      }

      // Check if version already exists
      const existingFirmware = await Firmware.findOne({ version });
      if (existingFirmware) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          success: false, 
          message: 'Firmware version already exists' 
        });
      }

      // Create firmware record
      const firmware = new Firmware({
        version,
        description,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedBy: req.admin._id
      });

      await firmware.save();

      res.status(201).json({
        success: true,
        message: 'Firmware uploaded successfully',
        firmware
      });
    } catch (error) {
      // Delete file if database save fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: error.message 
      });
    }
  });
};

// List all firmwares
exports.list = async (req, res) => {
  try {
    const firmwares = await Firmware.find()
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: firmwares.length,
      firmwares
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get firmware by ID
exports.getById = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id)
      .populate('uploadedBy', 'username email');

    if (\!firmware) {
      return res.status(404).json({ 
        success: false, 
        message: 'Firmware not found' 
      });
    }

    res.json({
      success: true,
      firmware
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Download firmware
exports.download = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id);

    if (\!firmware) {
      return res.status(404).json({ 
        success: false, 
        message: 'Firmware not found' 
      });
    }

    // Increment download counter
    firmware.downloads += 1;
    await firmware.save();

    // Send file
    res.download(firmware.path, firmware.originalName);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get latest firmware
exports.getLatest = async (req, res) => {
  try {
    const firmware = await Firmware.findOne({ isActive: true })
      .sort({ createdAt: -1 });

    if (\!firmware) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active firmware available' 
      });
    }

    res.json({
      success: true,
      firmware: {
        version: firmware.version,
        description: firmware.description,
        size: firmware.size,
        createdAt: firmware.createdAt,
        downloadUrl: `/api/firmware/download/${firmware._id}`
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Set firmware as active
exports.setActive = async (req, res) => {
  try {
    // Deactivate all firmwares
    await Firmware.updateMany({}, { isActive: false });

    // Activate the selected firmware
    const firmware = await Firmware.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (\!firmware) {
      return res.status(404).json({ 
        success: false, 
        message: 'Firmware not found' 
      });
    }

    res.json({
      success: true,
      message: 'Firmware activated successfully',
      firmware
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Delete firmware
exports.delete = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id);

    if (\!firmware) {
      return res.status(404).json({ 
        success: false, 
        message: 'Firmware not found' 
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(firmware.path)) {
      fs.unlinkSync(firmware.path);
    }

    // Delete from database
    await Firmware.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Firmware deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};
