const mysql = require("mysql2");
require('dotenv').config();

const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 60000,
    ...(ssl ? { ssl } : {})
});

db.getConnection((err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Database Connected");
});

module.exports = db;