const rateLimit = require("express-rate-limit");

/**
 * orderLimiter — Giới hạn API mua vé
 *
 * 10 requests / 15 phút / IP
 * Áp dụng cho: POST /api/orders
 */
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true, // Trả headers RateLimit-*
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Bạn đã gửi quá nhiều yêu cầu mua vé. Vui lòng thử lại sau 15 phút.",
  },
});

/**
 * uploadLimiter — Giới hạn API upload ảnh
 *
 * 20 requests / 15 phút / IP
 * Áp dụng cho: POST /api/upload
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Bạn đã upload quá nhiều ảnh. Vui lòng thử lại sau 15 phút.",
  },
});

module.exports = { orderLimiter, uploadLimiter };
