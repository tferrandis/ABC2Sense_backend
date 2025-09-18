const path = require("path");
const fs = require("fs");

const firmwareDir = path.join(__dirname, "..", "uploads", "firmware");

// Aseguramos que exista la carpeta
if (!fs.existsSync(firmwareDir)) {
  fs.mkdirSync(firmwareDir, { recursive: true });
}

exports.uploadFirmware = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.status(201).json({ 
    message: "Firmware uploaded successfully", 
    filename: req.file.filename 
  });
};

exports.downloadFirmware = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(firmwareDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  res.download(filePath);
};

exports.listFirmwares = (req, res) => {
  fs.readdir(firmwareDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Error reading firmware directory" });
    }
    res.json({ files });
  });
};
