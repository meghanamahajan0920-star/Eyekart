const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const fs = require("fs");
const mysql = require("mysql2");

const poolConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "eyekart_db",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
};

// Managed MySQL SSL/TLS Configuration
// When DB_SSL=true, enables secure TLS connection.
// Supports custom CA certificates via DB_SSL_CA (path to CA bundle file or raw PEM string).
// In production, certificate validation is enforced by default (rejectUnauthorized: true).
if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
    const sslConfig = {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "false" ? false : true
    };

    if (process.env.DB_SSL_CA) {
        try {
            if (fs.existsSync(process.env.DB_SSL_CA)) {
                sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA, "utf8");
            } else {
                sslConfig.ca = process.env.DB_SSL_CA;
            }
        } catch (err) {
            console.warn("[Database SSL] Warning: Failed to read DB_SSL_CA file, falling back to direct string:", err.message);
            sslConfig.ca = process.env.DB_SSL_CA;
        }
    }

    poolConfig.ssl = sslConfig;
}

const db = mysql.createPool(poolConfig);

db.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    console.log("MySQL connected successfully!");
    connection.release();
});

const promiseDb = db.promise();
module.exports = { db, promiseDb };