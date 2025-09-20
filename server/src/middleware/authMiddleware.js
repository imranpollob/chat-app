const createError = require('http-errors');
const { verifyToken } = require('../utils/token');

const authMiddleware = (required = true) => (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (!required) {
      req.user = null;
      return next();
    }
    return next(createError(401, 'Authentication token missing'));
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(createError(401, 'Invalid authentication header'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(createError(401, 'Invalid or expired token'));
  }
};

module.exports = authMiddleware;
