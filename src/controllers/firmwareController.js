const Firmware = require('../models/firmware');
const OtaEvent = require('../models/otaEvent');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const resolveClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const logOtaEvent = async (req, data) => {
  try {
    await OtaEvent.create({
      ip: resolveClientIp(req),
      userAgent: req.get('user-agent') || null,
      deviceId: req.get('x-device-id') || req.query.deviceId || null,
      ...data
    });
  } catch (error) {
    console.error('[OTA_EVENT_LOG_ERROR]', error.message);
  }
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/firmware';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
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

/**
 * @api {post} /api/firmware/upload Upload Firmware (Admin)
 * @apiName UploadFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Upload a new firmware file (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 * @apiHeader {String} Content-Type multipart/form-data
 *
 * @apiBody {File} firmware Firmware file (.bin, .hex, .elf, .ino)
 * @apiBody {String} version Firmware version
 * @apiBody {String} description Firmware description
 *
 * @apiSuccess (201) {Boolean} success Success status
 * @apiSuccess (201) {String} message Success message
 * @apiSuccess (201) {Object} firmware Created firmware object
 *
 * @apiError (400) {Boolean} success False
 * @apiError (400) {String} message Validation error or file upload error
 */
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const { version, description } = req.body;

      if (!version || !description) {
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

      await logOtaEvent(req, {
        type: 'upload',
        status: 'success',
        firmware: firmware._id,
        version: firmware.version,
        meta: {
          size: firmware.size,
          filename: firmware.originalName,
          uploadedBy: req.admin?._id?.toString() || null
        }
      });

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
      await logOtaEvent(req, {
        type: 'upload',
        status: 'error',
        meta: { error: error.message }
      });

      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  });
};

/**
 * @api {get} /api/firmware List All Firmware (Admin)
 * @apiName ListFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Get list of all firmware files (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Number} count Number of firmware files
 * @apiSuccess {Object[]} firmwares Array of firmware objects
 *
 * @apiError (500) {Boolean} success False
 * @apiError (500) {String} message Error message
 */
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

/**
 * @api {get} /api/firmware/:id Get Firmware by ID (Admin)
 * @apiName GetFirmwareById
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Get specific firmware details by ID (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiParam {String} id Firmware ID
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} firmware Firmware object
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message Firmware not found
 */
// Get firmware by ID
exports.getById = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id)
      .populate('uploadedBy', 'username email');

    if (!firmware) {
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

/**
 * @api {get} /api/firmware/download/:id Download Firmware
 * @apiName DownloadFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Download firmware file (public for IoT devices)
 *
 * @apiParam {String} id Firmware ID
 *
 * @apiSuccess {File} file Firmware file download
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message Firmware not found
 */
// Download firmware
exports.download = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id);

    if (!firmware) {
      await logOtaEvent(req, {
        type: 'download',
        status: 'error',
        meta: { error: 'Firmware not found', firmwareId: req.params.id }
      });

      return res.status(404).json({
        success: false,
        message: 'Firmware not found'
      });
    }

    // Increment download counter
    firmware.downloads += 1;
    await firmware.save();

    await logOtaEvent(req, {
      type: 'download',
      status: 'success',
      firmware: firmware._id,
      version: firmware.version,
      meta: { downloads: firmware.downloads }
    });

    // Send file
    res.download(firmware.path, firmware.originalName);
  } catch (error) {
    await logOtaEvent(req, {
      type: 'download',
      status: 'error',
      meta: { error: error.message, firmwareId: req.params.id }
    });

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @api {get} /api/firmware/latest Get Latest Firmware
 * @apiName GetLatestFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Get the latest active firmware (public for IoT devices)
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} firmware Firmware information
 * @apiSuccess {String} firmware.version Firmware version
 * @apiSuccess {String} firmware.description Firmware description
 * @apiSuccess {Number} firmware.size File size in bytes
 * @apiSuccess {String} firmware.createdAt Upload timestamp
 * @apiSuccess {String} firmware.downloadUrl Download URL
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message No active firmware available
 */
// Get firmware catalog
exports.getCatalog = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;

    const firmwares = await Firmware.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit);

    await logOtaEvent(req, {
      type: 'catalog',
      status: 'success',
      meta: {
        limit,
        results: firmwares.length
      }
    });

    res.json({
      success: true,
      count: firmwares.length,
      firmwares: firmwares.map((firmware) => ({
        id: firmware._id,
        version: firmware.version,
        description: firmware.description,
        size: firmware.size,
        createdAt: firmware.createdAt,
        downloadUrl: `/api/firmware/download/${firmware._id}`
      }))
    });
  } catch (error) {
    await logOtaEvent(req, {
      type: 'catalog',
      status: 'error',
      meta: { error: error.message }
    });

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

    if (!firmware) {
      await logOtaEvent(req, {
        type: 'latest',
        status: 'error',
        meta: { error: 'No active firmware available' }
      });

      return res.status(404).json({
        success: false,
        message: 'No active firmware available'
      });
    }

    await logOtaEvent(req, {
      type: 'latest',
      status: 'success',
      firmware: firmware._id,
      version: firmware.version
    });

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
    await logOtaEvent(req, {
      type: 'latest',
      status: 'error',
      meta: { error: error.message }
    });

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @api {put} /api/firmware/:id/activate Activate Firmware (Admin)
 * @apiName ActivateFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Set firmware as active version (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiParam {String} id Firmware ID
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} firmware Updated firmware object
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message Firmware not found
 */
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

    if (!firmware) {
      await logOtaEvent(req, {
        type: 'activate',
        status: 'error',
        meta: { error: 'Firmware not found', firmwareId: req.params.id }
      });

      return res.status(404).json({
        success: false,
        message: 'Firmware not found'
      });
    }

    await logOtaEvent(req, {
      type: 'activate',
      status: 'success',
      firmware: firmware._id,
      version: firmware.version,
      meta: { activatedBy: req.admin?._id?.toString() || null }
    });

    res.json({
      success: true,
      message: 'Firmware activated successfully',
      firmware
    });
  } catch (error) {
    await logOtaEvent(req, {
      type: 'activate',
      status: 'error',
      meta: { error: error.message, firmwareId: req.params.id }
    });

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// List OTA events (admin)
exports.listEvents = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 200)
      : 50;

    const events = await OtaEvent.find()
      .populate('firmware', 'version')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @api {delete} /api/firmware/:id Delete Firmware (Admin)
 * @apiName DeleteFirmware
 * @apiGroup Firmware
 * @apiVersion 1.0.0
 *
 * @apiDescription Delete firmware file and database record (admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 *
 * @apiParam {String} id Firmware ID
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} message Success message
 *
 * @apiError (404) {Boolean} success False
 * @apiError (404) {String} message Firmware not found
 */
// Delete firmware
exports.delete = async (req, res) => {
  try {
    const firmware = await Firmware.findById(req.params.id);

    if (!firmware) {
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
