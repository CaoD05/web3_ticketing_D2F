require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { isAddress } = require("ethers");
const prisma = require("../utils/prismaClient");

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = "24h";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeWalletAddress(walletAddress) {
  return String(walletAddress || "").trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, derivedKey] = String(storedHash || "").split(":");
  if (!salt || !derivedKey) {
    return false;
  }
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(derivedKey, "hex"));
}

function createAuthToken(user) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET chưa được cấu hình trong file .env");
  }

  return jwt.sign(
    {
      userId: user.UserID,
      email: user.Email,
      fullName: user.FullName,
      role: user.Role,
      walletAddress: user.WalletAddress,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function toPublicUser(user) {
  return {
    userId: user.UserID,
    fullName: user.FullName,
    email: user.Email,
    role: user.Role,
    walletAddress: user.WalletAddress,
    createdAt: user.CreatedAt,
  };
}

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
    const { walletAddress, email, password } = req.body;

    if (walletAddress && !email && !password) {
      if (!isAddress(walletAddress)) {
        return res.status(400).json({
          ok: false,
          message: "walletAddress không hợp lệ",
        });
      }

      const normalizedWallet = normalizeWalletAddress(walletAddress);
      const user = await prisma.user.findFirst({
        where: {
          WalletAddress: {
            equals: normalizedWallet,
            mode: 'insensitive',
          },
        },
        select: {
          UserID: true,
          FullName: true,
          WalletAddress: true,
          Role: true,
          Email: true,
          CreatedAt: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Ví này chưa được đăng ký trong hệ thống. Vui lòng liên hệ admin.",
        });
      }

      const token = createAuthToken(user);
      return res.status(200).json({
        ok: true,
        message: "Đăng nhập thành công",
        token,
        user: toPublicUser(user),
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email và mật khẩu là bắt buộc",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findFirst({
      where: {
        Email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
      },
    });

    if (!user || !user.PasswordHash || !verifyPassword(password, user.PasswordHash)) {
      return res.status(401).json({
        ok: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    const token = createAuthToken(user);
    return res.status(200).json({
      ok: true,
      message: "Đăng nhập thành công",
      token,
      user: toPublicUser(user),
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

async function register(req, res) {
  try {
    const { FullName, Email, Password } = req.body;

    if (!Email || !Password) {
      return res.status(400).json({
        ok: false,
        message: "Email và mật khẩu là bắt buộc",
      });
    }

    const normalizedEmail = normalizeEmail(Email);
    const displayName = FullName?.trim() || normalizedEmail.split("@")[0] || "Khách hàng";

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({
        ok: false,
        message: "Email không hợp lệ",
      });
    }

    if (Password.length < 8) {
      return res.status(400).json({
        ok: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        Email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { UserID: true },
    });

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "Email này đã được đăng ký",
      });
    }

    const createdUser = await prisma.user.create({
      data: {
        FullName: displayName,
        Email: normalizedEmail,
        PasswordHash: hashPassword(Password),
        WalletAddress: null,
        Role: "user",
      },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    const token = createAuthToken(createdUser);

    return res.status(201).json({
      ok: true,
      message: "Đăng ký thành công",
      token,
      user: toPublicUser(createdUser),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Email này đã được đăng ký",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Lỗi đăng ký",
      error: error.message,
    });
  }
}

module.exports = { login, register, getMe };
