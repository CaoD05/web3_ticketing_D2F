require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prismaClient");
const { isAddress } = require("ethers");

const JWT_SECRET = process.env.JWT_SECRET;
const rawGoogleClientIds =
  process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_IDS = rawGoogleClientIds
  .split(",")
  .map((clientId) => clientId.trim())
  .filter(Boolean);
const JWT_EXPIRES = "24h";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeWalletAddress(walletAddress) {
  return walletAddress.trim().toLowerCase();
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
  const [salt, derivedKey] = (storedHash || "").split(":");

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
      googleSub: user.GoogleSub,
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
    googleSub: user.GoogleSub,
    createdAt: user.CreatedAt,
  };
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

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
          mode: "insensitive",
        },
      },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    if (!user.PasswordHash) {
      return res.status(409).json({
        ok: false,
        message: "Tài khoản này đang dùng Google. Hãy đăng nhập bằng Google.",
      });
    }

    if (!verifyPassword(password, user.PasswordHash)) {
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

async function register(req, res) {
  try {
    const { FullName, Email, Password } = req.body;

    if (!FullName || !Email || !Password) {
      return res.status(400).json({
        ok: false,
        message: "Họ tên, email và mật khẩu là bắt buộc",
      });
    }

    const normalizedEmail = normalizeEmail(Email);

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
        FullName: FullName.trim(),
        Email: normalizedEmail,
        PasswordHash: hashPassword(Password),
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

async function googleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        message: "Google credential là bắt buộc",
      });
    }

    if (!GOOGLE_CLIENT_IDS.length) {
      return res.status(500).json({
        ok: false,
        message: "GOOGLE_CLIENT_ID chưa được cấu hình",
      });
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!tokenInfoResponse.ok) {
      return res.status(401).json({
        ok: false,
        message: "Google token không hợp lệ",
      });
    }

    const tokenInfo = await tokenInfoResponse.json();

    const tokenAudience = (tokenInfo.aud || "").trim();

    if (!GOOGLE_CLIENT_IDS.includes(tokenAudience)) {
      return res.status(401).json({
        ok: false,
        message: "Google token không khớp client id",
        ...(process.env.NODE_ENV !== "production"
          ? {
              debug: {
                tokenAudience,
                allowedClientIds: GOOGLE_CLIENT_IDS,
              },
            }
          : {}),
      });
    }

    const normalizedEmail = normalizeEmail(tokenInfo.email || "");
    const googleSub = tokenInfo.sub;
    const fullName = (tokenInfo.name || tokenInfo.given_name || normalizedEmail.split("@")[0] || "Google User").trim();

    if (!normalizedEmail || !googleSub) {
      return res.status(401).json({
        ok: false,
        message: "Google token thiếu thông tin cần thiết",
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { GoogleSub: googleSub },
          {
            Email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          FullName: fullName,
          Email: normalizedEmail,
          GoogleSub: googleSub,
          Role: "user",
        },
        select: {
          UserID: true,
          FullName: true,
          Email: true,
          PasswordHash: true,
          WalletAddress: true,
          GoogleSub: true,
          Role: true,
          CreatedAt: true,
        },
      });
    } else if (!user.GoogleSub) {
      user = await prisma.user.update({
        where: { UserID: user.UserID },
        data: {
          GoogleSub: googleSub,
          FullName: user.FullName || fullName,
        },
        select: {
          UserID: true,
          FullName: true,
          Email: true,
          PasswordHash: true,
          WalletAddress: true,
          GoogleSub: true,
          Role: true,
          CreatedAt: true,
        },
      });
    }

    const token = createAuthToken(user);

    return res.status(200).json({
      ok: true,
      message: "Đăng nhập Google thành công",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi đăng nhập Google",
      error: error.message,
    });
  }
}

async function connectWallet(req, res) {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        message: "WalletAddress là bắt buộc",
      });
    }

    if (!isAddress(walletAddress)) {
      return res.status(400).json({
        ok: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    const normalizedWallet = normalizeWalletAddress(walletAddress);

    const currentUser = await prisma.user.findUnique({
      where: { UserID: req.user.userId },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({
        ok: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const existingWalletOwner = await prisma.user.findFirst({
      where: {
        WalletAddress: {
          equals: normalizedWallet,
          mode: "insensitive",
        },
        NOT: {
          UserID: currentUser.UserID,
        },
      },
      select: { UserID: true },
    });

    if (existingWalletOwner) {
      return res.status(409).json({
        ok: false,
        message: "Ví MetaMask này đã được liên kết với tài khoản khác",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { UserID: currentUser.UserID },
      data: { WalletAddress: normalizedWallet },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Đã liên kết MetaMask thành công",
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi liên kết MetaMask",
      error: error.message,
    });
  }
}

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { UserID: req.user.userId },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        PasswordHash: true,
        WalletAddress: true,
        GoogleSub: true,
        Role: true,
        CreatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      ok: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Lỗi lấy thông tin người dùng",
      error: error.message,
    });
  }
}

module.exports = { login, register, googleAuth, connectWallet, getMe };
