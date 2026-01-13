/**
 * Create a custom error object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} [errors] - Additional error details (optional)
 * @returns {Error} Custom error object
 */
const createError = (statusCode, message, errors = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) {
    error.errors = errors;
  }
  return error;
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  //   if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Invalid JSON format in request body",
  //     });
  //   }
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || null;

  // Log error for debugging
  console.error(`[Error] ${statusCode} - ${message}`, err);

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = {
  createError,
  errorHandler,
};
