const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (payload, options = {}) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d', ...options });

const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

module.exports = {
  generateToken,
  verifyToken
};
