const express = require('express');
const { importCsv } = require('../controllers/importController');
const { handleCsvUpload } = require('../middleware/csvUploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/csv', handleCsvUpload, importCsv);

module.exports = router;