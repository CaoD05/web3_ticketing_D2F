const { sql, poolPromise } = require("../config/db");

async function findAllEvents() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      [EventID],
      [EventName],
      [Description],
      [EventDate],
      [Location],
      [ContractAddress],
      [TotalTickets],
      [TicketsSold],
      [CreatedBy],
      [CreatedAt]
    FROM [dbo].[Events]
    ORDER BY [CreatedAt] DESC, [EventID] DESC
  `);

  return result.recordset;
}

async function createEvent(eventData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("EventName", sql.NVarChar(200), eventData.EventName)
    .input("Description", sql.NVarChar(sql.MAX), eventData.Description)
    .input("EventDate", sql.DateTime, eventData.EventDate)
    .input("Location", sql.NVarChar(200), eventData.Location)
    .input("ContractAddress", sql.NVarChar(42), eventData.ContractAddress)
    .input("TotalTickets", sql.Int, eventData.TotalTickets)
    .input("TicketsSold", sql.Int, eventData.TicketsSold)
    .input("CreatedBy", sql.Int, eventData.CreatedBy)
    .query(`
      INSERT INTO [dbo].[Events]
        ([EventName], [Description], [EventDate], [Location], [ContractAddress], [TotalTickets], [TicketsSold], [CreatedBy])
      OUTPUT
        INSERTED.[EventID],
        INSERTED.[EventName],
        INSERTED.[Description],
        INSERTED.[EventDate],
        INSERTED.[Location],
        INSERTED.[ContractAddress],
        INSERTED.[TotalTickets],
        INSERTED.[TicketsSold],
        INSERTED.[CreatedBy],
        INSERTED.[CreatedAt]
      VALUES
        (@EventName, @Description, @EventDate, @Location, @ContractAddress, @TotalTickets, @TicketsSold, @CreatedBy)
    `);

  return result.recordset[0];
}

async function findEventById(eventId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("EventID", sql.Int, eventId)
    .query(`
      SELECT
        [EventID],
        [EventName],
        [Description],
        [EventDate],
        [Location],
        [ContractAddress],
        [TotalTickets],
        [TicketsSold],
        [CreatedBy],
        [CreatedAt]
      FROM [dbo].[Events]
      WHERE [EventID] = @EventID
    `);

  return result.recordset[0];
}

module.exports = {
  findAllEvents,
  createEvent,
  findEventById,
};
