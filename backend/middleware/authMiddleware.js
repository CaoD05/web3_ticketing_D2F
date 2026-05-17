require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const prisma = require("../utils/prismaClient");

/**
 * verifyToken — Middleware xác thực JWT
 *
 * Kiểm tra header: Authorization: Bearer <token>
 * Nếu hợp lệ → lưu payload vào req.user và gọi next()
 * Nếu không   → trả về 401 Unauthorized
 */
async function verifyToken(req, res, next) {
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
    
    // DB Check for suspension
    const user = await prisma.user.findUnique({
      where: { UserID: decoded.userId },
      select: { UserID: true, Role: true, IsSuspended: true },
    });

    if (!user) {
      return res.status(401).json({ ok: false, message: "Người dùng không tồn tại hoặc đã bị xóa." });
    }

    if (user.IsSuspended) {
      return res.status(403).json({ 
        ok: false, 
        message: "Tài khoản của bạn đã bị tạm đình chỉ. Vui lòng liên hệ quản trị viên." 
      });
    }

    req.user = {
      userId: user.UserID,
      role: user.Role,
    };
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
 * verifyTokenOptional — Phiên bản không bắt buộc của verifyToken
 * Dùng cho các route Public nhưng cần biết User đang đăng nhập là ai (ví dụ để Admin thấy event ẩn)
 */
async function verifyTokenOptional(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { UserID: decoded.userId },
      select: { UserID: true, Role: true, IsSuspended: true },
    });

    if (user && !user.IsSuspended) {
      req.user = { userId: user.UserID, role: user.Role };
    }
    next();
  } catch (err) {
    next();
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

module.exports = { verifyToken, verifyTokenOptional, requireRole };
