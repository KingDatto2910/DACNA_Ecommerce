import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Nạp từ file .env
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DB || "dacna_test",
  waitForConnections: true,
  connectionLimit: 10,
});
