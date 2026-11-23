const express = require('express');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getBudgets).put(setBudget);
router.delete('/:id', deleteBudget);

module.exports = router;