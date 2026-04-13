const { sql, poolPromise } = require("../config/db");

async function createTicket(ticketData) {
  const pool = await poolPromise;
  const request = pool.request();

  if (ticketData.TicketTypeID !== undefined && ticketData.TicketTypeID !== null) request.input("TicketTypeID", sql.Int, ticketData.TicketTypeID);
  else request.input("TicketTypeID", sql.Int, null);

  if (ticketData.OrderID !== undefined && ticketData.OrderID !== null) request.input("OrderID", sql.Int, ticketData.OrderID);
  else request.input("OrderID", sql.Int, null);

  request.input("OwnerWallet", sql.NVarChar(42), ticketData.OwnerWallet);

  if (ticketData.SeatID !== undefined && ticketData.SeatID !== null) request.input("SeatID", sql.Int, ticketData.SeatID);
  else request.input("SeatID", sql.Int, null);

  if (ticketData.TokenID !== undefined && ticketData.TokenID !== null) request.input("TokenID", sql.NVarChar(255), ticketData.TokenID);
  else request.input("TokenID", sql.NVarChar(255), null);

  if (ticketData.TransactionHash !== undefined && ticketData.TransactionHash !== null) request.input("TransactionHash", sql.NVarChar(66), ticketData.TransactionHash);
  else request.input("TransactionHash", sql.NVarChar(66), null);

  if (ticketData.QRCode !== undefined && ticketData.QRCode !== null) request.input("QRCode", sql.NVarChar(255), ticketData.QRCode);
  else request.input("QRCode", sql.NVarChar(255), null);

  if (ticketData.IsUsed !== undefined && ticketData.IsUsed !== null) request.input("IsUsed", sql.Bit, ticketData.IsUsed);
  else request.input("IsUsed", sql.Bit, 0);

  // ĐÃ SỬA: Thay OUTPUT bằng SCOPE_IDENTITY()
  const result = await request.query(`
    INSERT INTO [dbo].[Tickets] (
      [TicketTypeID], [OrderID], [OwnerWallet], [SeatID], [TokenID], [TransactionHash], [QRCode], [IsUsed]
    )
    VALUES (
      @TicketTypeID, @OrderID, @OwnerWallet, @SeatID, @TokenID, @TransactionHash, @QRCode, @IsUsed
    );

    SELECT * FROM [dbo].[Tickets] WHERE TicketID = SCOPE_IDENTITY();
  `);

  return result.recordset[0];
}

async function getTickets() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT * FROM [dbo].[Tickets]
  `);
  return result.recordset;
}

async function checkinTicket(tokenId, ownerWallet) {
  const pool = await poolPromise;

  // 1. Tìm vé tương ứng theo TokenID và OwnerWallet
  const checkResult = await pool.request()
    .input("TokenID", sql.NVarChar(255), tokenId)
    .input("OwnerWallet", sql.NVarChar(42), ownerWallet)
    .query(`
      SELECT * FROM [dbo].[Tickets]
      WHERE TokenID = @TokenID AND OwnerWallet = @OwnerWallet
    `);

  if (checkResult.recordset.length === 0) {
    throw new Error("Vé không tồn tại hoặc ví này không sở hữu vé");
  }

  const ticket = checkResult.recordset[0];

  // 2. Kiểm tra vé đã được check-in chưa
  if (ticket.IsUsed === true || ticket.IsUsed === 1) {
    throw new Error("Vé này đã được sử dụng để check-in trước đó");
  }

  // 3. Đánh dấu vé đã sử dụng (IsUsed = 1)
  const updateResult = await pool.request()
    .input("TokenID", sql.NVarChar(255), tokenId)
    .input("OwnerWallet", sql.NVarChar(42), ownerWallet)
    .query(`
      UPDATE [dbo].[Tickets]
      SET IsUsed = 1
      WHERE TokenID = @TokenID AND OwnerWallet = @OwnerWallet;

      SELECT * FROM [dbo].[Tickets] 
      WHERE TokenID = @TokenID AND OwnerWallet = @OwnerWallet;
    `);

  return updateResult.recordset[0];
}

async function getTicketsByWallet(walletAddress) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("OwnerWallet", sql.NVarChar(42), walletAddress)
    .query(`
      SELECT 
        t.*,
        e.EventName,
        e.EventDate
      FROM [dbo].[Tickets] t
      LEFT JOIN [dbo].[Events] e ON t.TicketTypeID = e.EventID
      WHERE t.OwnerWallet = @OwnerWallet
      ORDER BY t.TicketID DESC
    `);

  return result.recordset;
}

async function getMetadata(tokenId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("TokenID", sql.NVarChar(255), tokenId)
    .query(`
      SELECT
        t.*,
        e.EventName
      FROM [dbo].[Tickets] t
      LEFT JOIN [dbo].[Events] e ON t.TicketTypeID = e.EventID
      WHERE t.TokenID = @TokenID
    `);

  if (result.recordset.length === 0) {
    throw new Error("Vé không tồn tại");
  }

  return result.recordset[0];
}

module.exports = {
  createTicket,
  getTickets,
  checkinTicket,
  getTicketsByWallet,
  getMetadata,
};