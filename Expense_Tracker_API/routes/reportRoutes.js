const express = require('express');
const { getDashboard, getReports } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/', getReports);

module.exports = router;