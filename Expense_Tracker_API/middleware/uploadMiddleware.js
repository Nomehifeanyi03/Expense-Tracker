const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR } = require('../utils/receiptFiles');

const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}.${ALLOWED_TYPES[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Only JPG, PNG and PDF files are allowed'));
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('receipt')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. The limit is 5 MB.' });
      }
      return res.status(400).json({ message: error.message });
    }
    next();
  });
};

module.exports = { handleUpload };