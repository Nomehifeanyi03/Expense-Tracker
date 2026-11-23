const express = require("express");
const { protect } = require("../middleware/authMiddleware")
const {
    registerUser,
    loginUser,
    getUserInfo,
    forgotPassword,
    resetPassword,
} = require("../controllers/authController");


const router = express.Router();

router.post('/register', registerUser);

router.post("/login", loginUser);

router.get("/getUser", protect, getUserInfo);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

module.exports = router;