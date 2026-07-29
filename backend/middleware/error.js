const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // PostgreSQL Specific Errors
  if (err.code === '23505') {
    // Unique key violation
    statusCode = 400;
    message = 'Resource already exists or duplicate entry';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    message = 'Invalid reference key. Relational constraint violated.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
