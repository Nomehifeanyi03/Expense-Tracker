const express = require('express');
const { exportCsv, exportPdf } = require('../controllers/exportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/csv', exportCsv);
router.get('/pdf', exportPdf);

module.exports = router;