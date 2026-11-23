const express = require('express');
const {
  updateProfile,
  updateSettings,
  changePassword,
  deleteAccount,
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.put('/profile', updateProfile);
router.patch('/settings', updateSettings);
router.put('/password', changePassword);
router.delete('/', deleteAccount);

module.exports = router;