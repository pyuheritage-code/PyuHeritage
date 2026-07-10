const mysql = require("mysql2");
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.getConnection((err) => {
    if (err) throw err;
    console.log("Database Connected");
});

module.exports = db;