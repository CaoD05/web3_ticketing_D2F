require("dotenv").config();
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prismaClient");

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = "24h";

/**
 * login — POST /api/auth/login
 *
 * Body: { walletAddress }
 *
 * Web3 flow: Người dùng prove quyền sở hữu ví bằng chữ ký on-chain.
 * Ở bước này, ta lookup ví trong DB Users:
 *   - Nếu tìm thấy → cấp JWT chứa { userId, walletAddress, role }
 *   - Nếu chưa có  → trả về 401 (chưa đăng ký)
 */
async function login(req, res) {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        message: "walletAddress là bắt buộc",
      });
    }

    // Chuẩn hóa địa chỉ ví về chữ thường để so sánh
    const normalizedWallet = walletAddress.toLowerCase();

    // Tìm user trong DB theo WalletAddress sử dụng Prisma (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        WalletAddress: {
          equals: normalizedWallet,
          mode: 'insensitive' // PostgreSQL only - ignore case
        }
      },
      select: {
        UserID: true,
        FullName: true,
        WalletAddress: true,
        Role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Ví này chưa được đăng ký trong hệ thống. Vui lòng liên hệ admin.",
      });
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET chưa được cấu hình trong file .env");
    }

    // Tạo JWT Token có thời hạn 24h
    const token = jwt.sign(
      {
        userId:        user.UserID,
        walletAddress: user.WalletAddress,
        role:          user.Role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      ok: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        userId:        user.UserID,
        fullName:      user.FullName,
        walletAddress: user.WalletAddress,
        role:          user.Role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi đăng nhập",
      error: error.message,
    });
  }
}

/**
 * getMe — GET /api/auth/me
 *
 * Trả về thông tin người dùng hiện tại từ token (dùng sau verifyToken middleware)
 */
function getMe(req, res) {
  return res.status(200).json({
    ok: true,
    user: req.user,
  });
}

module.exports = { login, getMe };
