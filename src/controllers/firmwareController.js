const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");
const firmwareController = require("../controllers/firmwareController");

// Note: The controller already handles multer, so you may have duplicate multer config
// But if you want to keep your simple config here, that's fine

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/firmware");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage });

// Subir firmware - use correct function name
router.post(
    "/firmware",
    passport.authenticate("jwt", { session: false }),
    firmwareController.upload  // Changed from uploadFirmware
);

// Descargar firmware - use correct function name
router.get(
    "/firmware/:id",  // Note: controller uses :id, not :filename
    passport.authenticate("jwt", { session: false }),
    firmwareController.download  // Changed from downloadFirmware
);

// Listar firmwares - use correct function name
router.get(
    "/firmware",
    passport.authenticate("jwt", { session: false }),
    firmwareController.list  // Changed from listFirmwares
);

module.exports = router;