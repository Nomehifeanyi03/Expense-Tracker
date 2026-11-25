const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SIGNATURES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

const hasValidSignature = async (filePath, mimeType) => {
  const signature = SIGNATURES[mimeType];
  if (!signature) return false;

  const file = await fs.promises.open(filePath, 'r');
  try {
    const { buffer } = await file.read(Buffer.alloc(signature.length), 0, signature.length, 0);
    return signature.every((byte, index) => buffer[index] === byte);
  } finally {
    await file.close();
  }
};

const removeFile = async (fileName) => {
  if (!fileName) return;
  try {
    await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(fileName)));
  } catch (error) {
    // the file is already gone, so there is nothing to do
  }
};

module.exports = { UPLOAD_DIR, hasValidSignature, removeFile };