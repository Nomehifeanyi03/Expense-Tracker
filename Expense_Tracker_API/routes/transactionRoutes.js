const express = require('express');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getRecurring,
} = require('../controllers/transactionController');
const { uploadReceipt, getReceipt, deleteReceipt } = require('../controllers/receiptController');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/recurring', getRecurring);
router.route('/').get(getTransactions).post(createTransaction);
router.route('/:id').get(getTransaction).put(updateTransaction).delete(deleteTransaction);
router.route('/:id/receipt').post(handleUpload, uploadReceipt).get(getReceipt).delete(deleteReceipt);

module.exports = router;