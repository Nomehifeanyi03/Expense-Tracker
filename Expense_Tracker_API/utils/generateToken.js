const jwt = require('jsonwebtoken');


// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '365d' });
};

module.exports = generateToken;