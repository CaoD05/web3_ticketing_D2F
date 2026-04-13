const { sql, poolPromise } = require("../config/db");

let ensureEventsSchemaPromise = null;

async function ensureEventsSchema() {
  if (!ensureEventsSchemaPromise) {
    ensureEventsSchemaPromise = (async () => {
      const pool = await poolPromise;
      await pool.request().query(`
        IF COL_LENGTH('dbo.Events', 'IsCancelled') IS NULL
        BEGIN
          ALTER TABLE [dbo].[Events]
          ADD [IsCancelled] [bit] NOT NULL
              CONSTRAINT [DF_Events_IsCancelled] DEFAULT (0)
              WITH VALUES;
        END

        UPDATE [dbo].[Events]
        SET [IsCancelled] = 1
        WHERE [IsCancelled] = 0
          AND CHARINDEX('[cancelled:true]', ISNULL([Description], '')) > 0;
      `);
    })().catch((err) => {
      ensureEventsSchemaPromise = null;
      throw err;
    });
  }

  await ensureEventsSchemaPromise;
}

async function findAllEvents({ status = "all" } = {}) {
  await ensureEventsSchema();

  const pool = await poolPromise;
  const request = pool.request();

  let whereClause = "";
  if (status === "active") {
    whereClause = "WHERE ISNULL([IsCancelled], 0) = 0";
  } else if (status === "cancelled") {
    whereClause = "WHERE ISNULL([IsCancelled], 0) = 1";
  }

  const result = await request.query(`
    SELECT
      [EventID],
      [EventName],
      [Description],
      [EventDate],
      [Location],
      [ContractAddress],
      [TotalTickets],
      [TicketsSold],
      [IsCancelled],
      [CreatedBy],
      [CreatedAt]
    FROM [dbo].[Events]
    ${whereClause}
    ORDER BY [CreatedAt] DESC, [EventID] DESC
  `);

  return result.recordset;
}

async function createEvent(eventData) {
  await ensureEventsSchema();

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
    .input("IsCancelled", sql.Bit, eventData.IsCancelled == null ? false : eventData.IsCancelled)
    .input("CreatedBy", sql.Int, eventData.CreatedBy)
    .query(`
      INSERT INTO [dbo].[Events]
        ([EventName], [Description], [EventDate], [Location], [ContractAddress], [TotalTickets], [TicketsSold], [IsCancelled], [CreatedBy])
      OUTPUT
        INSERTED.[EventID],
        INSERTED.[EventName],
        INSERTED.[Description],
        INSERTED.[EventDate],
        INSERTED.[Location],
        INSERTED.[ContractAddress],
        INSERTED.[TotalTickets],
        INSERTED.[TicketsSold],
        INSERTED.[IsCancelled],
        INSERTED.[CreatedBy],
        INSERTED.[CreatedAt]
      VALUES
        (@EventName, @Description, @EventDate, @Location, @ContractAddress, @TotalTickets, @TicketsSold, @IsCancelled, @CreatedBy)
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
