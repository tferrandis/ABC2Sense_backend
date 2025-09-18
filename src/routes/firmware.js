const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");
const firmwareController = require("../controllers/firmwareController");

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/firmware");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Subir firmware
router.post(
  "/firmware",
  passport.authenticate("jwt", { session: false }),
  upload.single("firmware"),
  firmwareController.uploadFirmware
);

// Descargar firmware
router.get(
  "/firmware/:filename",
  passport.authenticate("jwt", { session: false }),
  firmwareController.downloadFirmware
);

// Listar firmwares
router.get(
  "/firmware",
  passport.authenticate("jwt", { session: false }),
  firmwareController.listFirmwares
);

module.exports = router;
