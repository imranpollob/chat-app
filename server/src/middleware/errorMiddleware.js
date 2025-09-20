const createError = require('http-errors');

// Not found handler
const notFound = (_req, _res, next) => {
  next(createError(404, 'Resource not found'));
};

// Global error handler
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.status || error.statusCode || 500;
  const payload = {
    message: error.message || 'Something went wrong'
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler
};
