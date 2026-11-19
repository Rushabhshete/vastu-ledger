import "./loadEnv.js";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbConfig = {
  host:               process.env.DB_HOST     || "localhost",
  port:        Number(process.env.DB_PORT)    || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "vastuledger",
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
  namedPlaceholders:  true,
};

const pool = mysql.createPool(dbConfig);

/**
 * Health check & auto-initialization on startup.
 * If database does not exist, automatically creates it and applies schema.sql & seed.sql.
 */
export async function checkConnection() {
  const dbName = dbConfig.database;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      console.log(`[DB] MySQL pool connected ✓ (Database: ${dbName})`);
      return true;
    } finally {
      conn.release();
    }
  } catch (err) {
    // If database doesn't exist yet, auto-create and run schema & seed
    if (err.code === "ER_BAD_DB_ERROR") {
      console.log(`[DB] Database '${dbName}' not found. Auto-creating database and initializing tables...`);
      try {
        const rootConn = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          multipleStatements: true,
        });

        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.changeUser({ database: dbName });

        const schemaPath = path.resolve(__dirname, "../models/schema.sql");
        const seedPath = path.resolve(__dirname, "../models/seed.sql");

        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, "utf-8");
          await rootConn.query(schemaSql);
          console.log("[DB] schema.sql executed successfully ✓");
        }

        if (fs.existsSync(seedPath)) {
          const seedSql = fs.readFileSync(seedPath, "utf-8");
          await rootConn.query(seedSql);
          console.log("[DB] seed.sql imported with 25+ realistic RWA records ✓");
        }

        await rootConn.end();
        console.log(`[DB] Database '${dbName}' initialized and ready ✓`);
        return true;
      } catch (initErr) {
        console.error(`[DB] Failed to auto-initialize '${dbName}':`, initErr.message);
        throw initErr;
      }
    }

    console.error("\n=======================================================");
    console.error("[DB ERROR] Failed to connect to MySQL database:");
    console.error(`Host:     ${dbConfig.host}:${dbConfig.port}`);
    console.error(`User:     ${dbConfig.user}`);
    console.error(`Database: ${dbConfig.database}`);
    console.error(`Using Password: ${Boolean(dbConfig.password)}`);
    console.error(`Reason:   ${err.message}`);
    console.error("=======================================================\n");
    throw err;
  }
}

export default pool;
