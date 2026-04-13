require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "EventTicketDB",
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || "SQLEXPRESS",
    encrypt: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    throw error;
  });

async function query(queryText) {
  const pool = await poolPromise;
  const result = await pool.request().query(queryText);
  return result.recordset;
}

module.exports = {
  sql,
  config,
  poolPromise,
  query,
};
