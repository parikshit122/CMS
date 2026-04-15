const successResponse = (res, statusCode = 200, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, statusCode = 500, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { successResponse, errorResponse };