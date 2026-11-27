const jwt = require('jsonwebtoken');
const User = require('../models/User');

const INACTIVITY_LIMIT = 30 * 24 * 60 * 60 * 1000;
const UPDATE_INTERVAL = 60 * 60 * 1000;

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    const idleTime = Date.now() - user.lastActiveAt.getTime();

    if (idleTime > INACTIVITY_LIMIT) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    if (idleTime > UPDATE_INTERVAL) {
      await User.updateOne({ _id: user._id }, { lastActiveAt: new Date() });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };