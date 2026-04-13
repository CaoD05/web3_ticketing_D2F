const { sql, poolPromise } = require("../config/db");

async function createUser(userData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("FullName", sql.NVarChar(100), userData.FullName)
    .input("Email", sql.NVarChar(100), userData.Email)
    .input("WalletAddress", sql.NVarChar(42), userData.WalletAddress)
    .input("Role", sql.NVarChar(20), userData.Role)
    .query(`
      INSERT INTO [dbo].[Users] ([FullName], [Email], [WalletAddress], [Role])
      OUTPUT
        INSERTED.[UserID],
        INSERTED.[FullName],
        INSERTED.[Email],
        INSERTED.[WalletAddress],
        INSERTED.[Role],
        INSERTED.[CreatedAt]
      VALUES (@FullName, @Email, @WalletAddress, @Role)
    `);

  return result.recordset[0];
}

module.exports = {
  createUser,
};
