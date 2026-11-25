const mongoose = require('mongoose');
const path = require('path');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { UPLOAD_DIR, hasValidSignature, removeFile } = require('../utils/receiptFiles');

// Attach (or replace) a receipt on a transaction
exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose a file to upload' });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      await removeFile(req.file.filename);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
    if (!transaction) {
      await removeFile(req.file.filename);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const filePath = path.join(UPLOAD_DIR, req.file.filename);
    if (!(await hasValidSignature(filePath, req.file.mimetype))) {
      await removeFile(req.file.filename);
      return res.status(400).json({ message: 'The file content does not match its type' });
    }

    const oldFileName = transaction.receipt && transaction.receipt.fileName;

    transaction.receipt = {
      fileName: req.file.filename,
      originalName: req.file.originalname.slice(0, 100),
      mimeType: req.file.mimetype,
      size: req.file.size,
    };
    await transaction.save();

    await removeFile(oldFileName);

    res.json({
      message: 'Receipt uploaded',
      receipt: {
        originalName: transaction.receipt.originalName,
        mimeType: transaction.receipt.mimeType,
        size: transaction.receipt.size,
      },
    });
  } catch (error) {
    if (req.file) await removeFile(req.file.filename);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download or view the receipt of a transaction
exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
    if (!transaction || !transaction.receipt || !transaction.receipt.fileName) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(transaction.receipt.fileName));

    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: 'Receipt file not found' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove the receipt from a transaction
exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
    if (!transaction || !transaction.receipt || !transaction.receipt.fileName) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const fileName = transaction.receipt.fileName;
    transaction.receipt = undefined;
    await transaction.save();
    await removeFile(fileName);

    res.json({ message: 'Receipt removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};