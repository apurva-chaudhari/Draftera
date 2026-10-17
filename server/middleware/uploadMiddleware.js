
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(
        new Error("Only PDF drawing files are allowed.")
      );
    }

    callback(null, true);
  },
});

const validatePdfSignature = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please select a PDF drawing file.",
    });
  }

  const signature = req.file.buffer.subarray(0, 5).toString("ascii");

  if (signature !== "%PDF-") {
    return res.status(400).json({
      success: false,
      message: "The uploaded file is not a valid PDF.",
    });
  }

  next();
};

module.exports = {
  upload,
  validatePdfSignature,
};
