const mysql = require("mysql2");
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

db.getConnection((err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Database Connected");
});

module.exports = db;