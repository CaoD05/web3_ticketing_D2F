require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { isAddress } = require("ethers");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../utils/prismaClient");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

/**
 * updateProfile — PUT /api/auth/profile
 *
 * Body: { FullName?, Email? }
 * Cập nhật thông tin cá nhân (cần JWT)
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { FullName, Email } = req.body;

    const data = {};
    if (FullName !== undefined) {
      const trimmed = String(FullName).trim();
      if (!trimmed) {
        return res.status(400).json({ ok: false, message: "FullName không được để trống" });
      }
      data.FullName = trimmed;
    }

    if (Email !== undefined) {
      const normalized = normalizeEmail(Email);
      if (!validateEmail(normalized)) {
        return res.status(400).json({ ok: false, message: "Email không hợp lệ" });
      }
      // Kiểm tra email đã tồn tại chưa (trừ chính mình)
      const existingUser = await prisma.user.findFirst({
        where: {
          Email: { equals: normalized, mode: "insensitive" },
          NOT: { UserID: userId },
        },
      });
      if (existingUser) {
        return res.status(409).json({ ok: false, message: "Email này đã được sử dụng" });
      }
      data.Email = normalized;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, message: "Không có thông tin để cập nhật" });
    }

    const updated = await prisma.user.update({
      where: { UserID: userId },
      data,
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Cập nhật thông tin thành công",
      user: toPublicUser(updated),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi cập nhật thông tin",
      error: error.message,
    });
  }
}

/**
 * linkWallet — PUT /api/auth/link-wallet
 *
 * Body: { walletAddress }
 * Liên kết ví MetaMask vào tài khoản hiện tại
 */
async function linkWallet(req, res) {
  try {
    const userId = req.user.userId;
    const { walletAddress } = req.body;

    if (!walletAddress || !isAddress(walletAddress)) {
      return res.status(400).json({ ok: false, message: "walletAddress không hợp lệ" });
    }

    const normalizedWallet = normalizeWalletAddress(walletAddress);

    // Kiểm tra ví đã được liên kết với tài khoản khác chưa
    const existingUser = await prisma.user.findFirst({
      where: {
        WalletAddress: { equals: normalizedWallet, mode: "insensitive" },
        NOT: { UserID: userId },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "Ví này đã được liên kết với tài khoản khác",
      });
    }

    const updated = await prisma.user.update({
      where: { UserID: userId },
      data: { WalletAddress: normalizedWallet },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Liên kết ví thành công",
      user: toPublicUser(updated),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi liên kết ví",
      error: error.message,
    });
  }
}

/**
 * changePassword — PUT /api/auth/change-password
 *
 * Body: { currentPassword, newPassword }
 * Đổi mật khẩu (cần JWT + mật khẩu hiện tại)
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "currentPassword và newPassword là bắt buộc",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        ok: false,
        message: "Mật khẩu mới phải có ít nhất 8 ký tự",
      });
    }

    const user = await prisma.user.findUnique({
      where: { UserID: userId },
      select: { PasswordHash: true },
    });

    if (!user || !user.PasswordHash) {
      return res.status(400).json({
        ok: false,
        message: "Tài khoản này không sử dụng mật khẩu (đăng nhập bằng ví/Google)",
      });
    }

    if (!verifyPassword(currentPassword, user.PasswordHash)) {
      return res.status(401).json({
        ok: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    await prisma.user.update({
      where: { UserID: userId },
      data: { PasswordHash: hashPassword(newPassword) },
    });

    return res.status(200).json({
      ok: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi đổi mật khẩu",
      error: error.message,
    });
  }
}

/**
 * googleLogin — POST /api/auth/google
 *
 * Body: { idToken }
 *
 * Flow:
 *   1. Frontend dùng Google Sign-In SDK lấy id_token
 *   2. Backend verify id_token với Google
 *   3. Tìm user theo GoogleSub:
 *      - Nếu đã có → đăng nhập, cấp JWT
 *      - Nếu chưa có → kiểm tra email đã tồn tại chưa:
 *        + Nếu email tồn tại → liên kết GoogleSub vào tài khoản đó
 *        + Nếu chưa → tạo tài khoản mới
 */
async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        ok: false,
        message: "idToken là bắt buộc",
      });
    }

    if (!googleClient) {
      return res.status(503).json({
        ok: false,
        message: "Google OAuth chưa được cấu hình. Vui lòng thiết lập GOOGLE_CLIENT_ID trong .env",
      });
    }

    // Verify id_token với Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({
        ok: false,
        message: "Google token không hợp lệ hoặc đã hết hạn",
        error: verifyError.message,
      });
    }

    const { sub: googleSub, email, name, picture } = payload;

    if (!googleSub) {
      return res.status(400).json({
        ok: false,
        message: "Không lấy được thông tin từ Google token",
      });
    }

    const normalizedEmail = email ? normalizeEmail(email) : null;

    // 1. Tìm user đã liên kết Google
    let user = await prisma.user.findFirst({
      where: { GoogleSub: googleSub },
    });

    if (user) {
      // Đã có tài khoản Google → đăng nhập
      const token = createAuthToken(user);
      return res.status(200).json({
        ok: true,
        message: "Đăng nhập bằng Google thành công",
        isNewUser: false,
        token,
        user: toPublicUser(user),
      });
    }

    // 2. Tìm user theo email (tài khoản email/password đã tồn tại)
    if (normalizedEmail) {
      user = await prisma.user.findFirst({
        where: {
          Email: { equals: normalizedEmail, mode: "insensitive" },
        },
      });

      if (user) {
        // Liên kết GoogleSub vào tài khoản hiện tại
        user = await prisma.user.update({
          where: { UserID: user.UserID },
          data: { GoogleSub: googleSub },
        });

        const token = createAuthToken(user);
        return res.status(200).json({
          ok: true,
          message: "Đã liên kết tài khoản Google thành công",
          isNewUser: false,
          token,
          user: toPublicUser(user),
        });
      }
    }

    // 3. Tạo tài khoản mới
    const displayName = name || (normalizedEmail ? normalizedEmail.split("@")[0] : "Google User");

    user = await prisma.user.create({
      data: {
        FullName: displayName,
        Email: normalizedEmail,
        GoogleSub: googleSub,
        PasswordHash: null,
        WalletAddress: null,
        Role: "user",
      },
    });

    const token = createAuthToken(user);
    return res.status(201).json({
      ok: true,
      message: "Đăng ký bằng Google thành công",
      isNewUser: true,
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Email hoặc tài khoản Google này đã được sử dụng",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Lỗi đăng nhập bằng Google",
      error: error.message,
    });
  }
}

module.exports = { login, register, getMe, updateProfile, linkWallet, changePassword, googleLogin };

