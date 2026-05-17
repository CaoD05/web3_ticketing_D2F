const prisma = require("../utils/prismaClient");

const ALLOWED_ROLES = ["admin", "organizer", "user"];

// ─── GET /api/users ──────────────────────────────────────────────────────────
// Danh sách tất cả users (Admin only)
async function getAllUsers(_req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
      },
      orderBy: { CreatedAt: "desc" },
    });

    return res.status(200).json({
      ok: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
}

// ─── GET /api/users/:id ──────────────────────────────────────────────────────
// Chi tiết 1 user (Admin only)
async function getUserById(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid User ID" });
    }

    const user = await prisma.user.findUnique({
      where: { UserID: userId },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
        _count: {
          select: { Orders: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    return res.status(200).json({
      ok: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
}

// ─── POST /api/users ─────────────────────────────────────────────────────────
// Tạo user mới (Admin only)
async function createUser(req, res) {
  try {
    const {
      FullName,
      Email = null,
      WalletAddress = null,
      Role = "user",
    } = req.body;

    if (!FullName) {
      return res.status(400).json({
        ok: false,
        message: "FullName is required",
      });
    }

    if (!Email && !WalletAddress) {
      return res.status(400).json({
        ok: false,
        message: "Email or WalletAddress is required",
      });
    }

    if (Role && !ALLOWED_ROLES.includes(Role)) {
      return res.status(400).json({
        ok: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const createdUser = await prisma.user.create({
      data: { FullName, Email, WalletAddress, Role },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
        CreatedAt: true,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Email or WalletAddress already exists",
      });
    }
    return res.status(500).json({
      ok: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
}

// ─── PUT /api/users/:id/role ─────────────────────────────────────────────────
// Thay đổi role của user (Admin only)
async function updateUserRole(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid User ID" });
    }

    const { Role } = req.body;
    if (!Role || !ALLOWED_ROLES.includes(Role)) {
      return res.status(400).json({
        ok: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    // Không cho phép tự đổi role chính mình
    if (req.user && req.user.userId === userId) {
      return res.status(403).json({
        ok: false,
        message: "Cannot change your own role",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { UserID: userId },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { UserID: userId },
      data: { Role },
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: `User role updated to "${Role}" successfully`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
}

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
// Xóa user (Admin only) — chỉ xóa nếu user không có orders/tickets
async function deleteUser(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid User ID" });
    }

    // Không cho phép tự xóa chính mình
    if (req.user && req.user.userId === userId) {
      return res.status(403).json({
        ok: false,
        message: "Cannot delete your own account from admin panel",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { UserID: userId },
      include: { _count: { select: { Orders: true } } },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (existing._count.Orders > 0) {
      return res.status(409).json({
        ok: false,
        message: "Cannot delete user with existing orders. Consider deactivating instead.",
      });
    }

    await prisma.user.delete({ where: { UserID: userId } });

    return res.status(200).json({
      ok: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
}

// ─── PUT /api/users/me ───────────────────────────────────────────────────────
// Cập nhật thông tin cá nhân (User only)
async function updateMe(req, res) {
  try {
    const userId = req.user.userId;
    const { FullName, Email } = req.body;

    if (!FullName && !Email) {
      return res.status(400).json({
        ok: false,
        message: "At least one field (FullName or Email) is required for update",
      });
    }

    const data = {};
    if (FullName) data.FullName = FullName;
    if (Email) data.Email = Email;

    const updated = await prisma.user.update({
      where: { UserID: userId },
      data,
      select: {
        UserID: true,
        FullName: true,
        Email: true,
        WalletAddress: true,
        Role: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Email already exists",
      });
    }
    return res.status(500).json({
      ok: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
}

// ─── PUT /api/users/:id/status ───────────────────────────────────────────────
// Đình chỉ hoặc mở khóa tài khoản (Admin only)
async function updateUserStatus(req, res) {
  try {
    const userId = Number(req.params.id);
    const { IsSuspended } = req.body;

    if (IsSuspended === undefined) {
      return res.status(400).json({ ok: false, message: "IsSuspended field is required" });
    }

    if (req.user.userId === userId) {
      return res.status(403).json({ ok: false, message: "Cannot suspend your own account" });
    }

    const updated = await prisma.user.update({
      where: { UserID: userId },
      data: { IsSuspended: !!IsSuspended },
    });

    // Log the action
    await prisma.systemAuditLog.create({
      data: {
        AdminID: req.user.userId,
        Action: IsSuspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
        TargetType: "User",
        TargetID: String(userId),
        Details: JSON.stringify({ IsSuspended })
      }
    });

    return res.status(200).json({
      ok: true,
      message: `User ${IsSuspended ? 'suspended' : 'activated'} successfully`,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update user status", error: error.message });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  updateMe,
};
