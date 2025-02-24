// src/database.js
const { Pool } = require("pg");

// 檢查數據庫配置
console.log("=== 數據庫配置檢查 ===");
console.log("DB Host:", process.env.PGHOST);
console.log("DB User:", process.env.PGUSER);
console.log("DB Name:", process.env.PGDATABASE);
console.log("DB Port:", process.env.PGPORT);
console.log("=====================");

// Read database configuration from environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test the database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});

// Export query function and pool for use in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
