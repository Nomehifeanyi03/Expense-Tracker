const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const PasswordResetToken = require('../models/PasswordResetToken');
const formatUser = require('../utils/formatUser');

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR', 'CAD'];
const DATE_FORMATS = ['MMM D, YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const THEMES = ['system', 'light', 'dark'];
const BOOLEAN_SETTINGS = ['emailAlertsEnabled', 'weeklySummaryEnabled', 'rolloverEnabled'];

// Update the profile (name)
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ message: 'Name must be 50 characters or fewer' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update settings (currency, date format, theme, notification switches, rollover)
exports.updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const { defaultCurrency, dateFormat, theme } = body;
    const updates = {};

    if (defaultCurrency !== undefined) {
      if (!CURRENCIES.includes(defaultCurrency)) {
        return res.status(400).json({ message: 'Unsupported currency' });
      }
      updates.defaultCurrency = defaultCurrency;
    }

    if (dateFormat !== undefined) {
      if (!DATE_FORMATS.includes(dateFormat)) {
        return res.status(400).json({ message: 'Unsupported date format' });
      }
      updates.dateFormat = dateFormat;
    }

    if (theme !== undefined) {
      if (!THEMES.includes(theme)) {
        return res.status(400).json({ message: 'Theme must be system, light or dark' });
      }
      updates.theme = theme;
    }

    for (const key of BOOLEAN_SETTINGS) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') {
          return res.status(400).json({ message: `${key} must be true or false` });
        }
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid settings were sent' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change the password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user.password) {
      return res
        .status(400)
        .json({ message: 'This account signs in with Google and has no password to change' });
    }
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await PasswordResetToken.deleteMany({ user: user._id });

    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Permanently delete the account and all its data
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (user.password) {
      const { password } = req.body || {};

      if (!password) {
        return res.status(400).json({ message: 'Password is required to delete your account' });
      }
      if (!(await user.comparePassword(password))) {
        return res.status(400).json({ message: 'Password is incorrect' });
      }
    }

    await Promise.all([
      Transaction.deleteMany({ user: user._id }),
      Budget.deleteMany({ user: user._id }),
      Notification.deleteMany({ user: user._id }),
      Category.deleteMany({ user: user._id }),
      PasswordResetToken.deleteMany({ user: user._id }),
    ]);

    await User.deleteOne({ _id: user._id });

    res.json({ message: 'Your account and all your data have been deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
