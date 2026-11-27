const User = require('../models/User');
const Category = require('../models/Category');
const defaultCategories = require('../config/defaultCategories');
const generateToken = require('../utils/generateToken');
const formatUser = require('../utils/formatUser');
const crypto = require('crypto');
const PasswordResetToken = require('../models/PasswordResetToken');
const sendEmail = require('../utils/sendEmail');



const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const RESET_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password });

    await Category.insertMany(
      defaultCategories.map((c) => ({ ...c, user: user._id, isDefault: true }))
    );

    res.status(201).json({ token: generateToken(user._id), user: formatUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Log in an existing user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !user.password || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await User.updateOne({ _id: user._id }, { lastActiveAt: new Date() });

    res.json({ token: generateToken(user._id), user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get the logged-in user's details
exports.getUserInfo = async (req, res) => {
  try {
    res.json(formatUser(req.user));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Step 1: the user asks for a reset link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      await PasswordResetToken.deleteMany({ user: user._id });

      const token = crypto.randomBytes(32).toString('hex');

      await PasswordResetToken.create({
        user: user._id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const link = `${process.env.CLIENT_URL}/reset-password/${token}`;

      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your Expense Tracker password',
          text: `Hi ${user.name},\n\nUse this link to set a new password. It expires in 1 hour:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
        });
      } catch (emailError) {
        console.error('Reset email failed:', emailError.message);
      }
    }

    res.json({ message: RESET_MESSAGE });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Step 2: the user sets a new password using the link
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid request' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const record = await PasswordResetToken.findOneAndUpdate(
      { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
      { usedAt: new Date() },
      { new: true }
    );

    if (!record) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    const user = await User.findById(record.user).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    user.password = password;
    await user.save();

    await PasswordResetToken.deleteMany({ user: user._id });

    res.json({ message: 'Password updated. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};