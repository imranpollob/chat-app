const bcrypt = require('bcrypt');
const createError = require('http-errors');
const User = require('../models/User');
const env = require('../config/env');
const { generateToken } = require('../utils/token');

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  createdAt: user.createdAt
});

const register = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw createError(400, 'Username and password are required');
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw createError(409, 'Username already exists');
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await User.create({ username, password: hashedPassword });

  const token = generateToken({ id: user._id, username: user.username });

  res.status(201).json({
    message: 'Registration successful',
    user: sanitizeUser(user),
    token
  });
};

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw createError(400, 'Username and password are required');
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw createError(401, 'Invalid username or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw createError(401, 'Invalid username or password');
  }

  const token = generateToken({ id: user._id, username: user.username });

  res.json({
    message: 'Login successful',
    user: sanitizeUser(user),
    token
  });
};

module.exports = {
  register,
  login
};
