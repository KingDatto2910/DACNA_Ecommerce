// Trung gian xử lý lỗi toàn cục cho Express
// Đặt ở cuối server.js: app.use(errorHandler)
export function errorHandler(err, req, res, next) {
  console.error("Error:", err.message || err);

  // Nếu lỗi đã có HTTP code
  if (res.headersSent) return next(err);

  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    ok: false,
    error: message,
  });
}
