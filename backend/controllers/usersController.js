const userModel = require("../models/userModel");

async function createUser(req, res) {
  try {
    const {
      FullName,
      Email = null,
      WalletAddress,
      Role = "user",
    } = req.body;

    if (!FullName || !WalletAddress) {
      return res.status(400).json({
        ok: false,
        message: "FullName and WalletAddress are required",
      });
    }

    const allowedRoles = ["admin", "organizer", "user"];
    if (Role && !allowedRoles.includes(Role)) {
      return res.status(400).json({
        ok: false,
        message: "Role must be one of: admin, organizer, user",
      });
    }

    const createdUser = await userModel.createUser({
      FullName,
      Email,
      WalletAddress,
      Role,
    });

    return res.status(201).json({
      ok: true,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
}

module.exports = {
  createUser,
};
