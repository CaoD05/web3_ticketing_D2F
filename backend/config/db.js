require("dotenv").config();
const sql = require("mssql");

const server = process.env.DB_SERVER || process.env.DB_HOST || "localhost";
const instanceName = process.env.DB_INSTANCE;
const hasExplicitPort = Boolean(process.env.DB_PORT);

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  server,
  database: process.env.DB_NAME || "EventTicketDB",
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    trustServerCertificate: true,
    encrypt: false,
    // Docker SQL Server normally uses host+port and no named instance.
    ...(!hasExplicitPort && instanceName ? { instanceName } : {}),
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
