require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * verifyToken — Middleware xác thực JWT
 *
 * Kiểm tra header: Authorization: Bearer <token>
 * Nếu hợp lệ → lưu payload vào req.user và gọi next()
 * Nếu không   → trả về 401 Unauthorized
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      message: "Không tìm thấy token. Vui lòng đăng nhập.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, walletAddress, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        ok: false,
        message: "Token đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }
    return res.status(401).json({
      ok: false,
      message: "Token không hợp lệ.",
    });
  }
}

/**
 * requireRole(...roles) — Middleware phân quyền
 *
 * Dùng sau verifyToken để giới hạn truy cập theo Role.
 * Ví dụ: router.post("/events", verifyToken, requireRole("admin"), createEvent)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Chưa xác thực." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: `Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: [${roles.join(", ")}].`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
