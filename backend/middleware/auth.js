const jwt = require("jsonwebtoken");
const { promiseDb } = require("../db");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "default_jwt_secret") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET must be configured in production environment");
        }
        return "default_jwt_secret";
    }
    return secret;
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || "user"
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

async function requireAdmin(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    try {
        // Query database to ensure current active role is admin
        const [users] = await promiseDb.query("SELECT role FROM users WHERE id = ?", [req.user.id]);
        if (users.length === 0 || users[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admin privileges required"
            });
        }
        req.user.role = users[0].role;
        next();
    } catch (err) {
        console.error("requireAdmin middleware error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authorization"
        });
    }
}

authMiddleware.authMiddleware = authMiddleware;
authMiddleware.requireAdmin = requireAdmin;

module.exports = authMiddleware;
