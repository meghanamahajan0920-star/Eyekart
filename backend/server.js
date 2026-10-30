const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const Razorpay = require("razorpay");
const { promiseDb } = require("./db");
const { authMiddleware, requireAdmin } = require("./middleware/auth");

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

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration (strictly front-end URL, supporting comma-separated production origins)
const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(url => url.trim()).filter(Boolean)
    : ["http://localhost:5174"];

const allowedOrigins = [
    ...configuredOrigins,
    "http://localhost:5173", // allow standard vite dev port
    "http://localhost:3000"
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    message: { success: false, message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { success: false, message: "Too many authentication attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Too many order requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Home
app.get("/", (req, res) => {
    res.send("EyeKart Backend is running!");
});

// Test API
app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "EyeKart Backend is working!" });
});

// ==========================================
// AUTHENTICATION APIs
// ==========================================

// POST /api/auth/register
app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { name, email, mobile, password } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim().toLowerCase())) {
        return res.status(400).json({ success: false, message: "A valid email address is required" });
    }
    const mobileRegex = /^\d{10}$/;
    if (!mobile || typeof mobile !== "string" || !mobileRegex.test(mobile.trim())) {
        return res.status(400).json({ success: false, message: "Valid mobile number is required (exactly 10 digits)" });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanName = name.trim();

    try {
        // Check duplicate email
        const [existingEmail] = await promiseDb.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ success: false, message: "Email is already registered" });
        }

        // Check duplicate mobile
        const [existingMobile] = await promiseDb.query("SELECT id FROM users WHERE mobile = ?", [cleanMobile]);
        if (existingMobile.length > 0) {
            return res.status(400).json({ success: false, message: "Mobile number is already registered" });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Store user with default role 'user'
        const [result] = await promiseDb.query(
            "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, 'user')",
            [cleanName, cleanEmail, cleanMobile, hashedPassword]
        );

        const newUserId = result.insertId;

        // Auto-generate JWT for seamless onboarding
        const token = jwt.sign(
            { id: newUserId, email: cleanEmail, role: "user" },
            getJwtSecret(),
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: newUserId,
                name: cleanName,
                email: cleanEmail,
                mobile: cleanMobile,
                role: "user"
            }
        });
    } catch (err) {
        console.error("[POST /api/auth/register] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error during registration" });
    }
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    try {
        const [users] = await promiseDb.query(
            "SELECT id, name, email, mobile, password, role FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const userRole = user.role || "user";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: userRole },
            getJwtSecret(),
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: userRole
            }
        });
    } catch (err) {
        console.error("[POST /api/auth/login] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error during login" });
    }
});

// GET /api/auth/me (Protected)
app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
        const [users] = await promiseDb.query(
            "SELECT id, name, email, mobile, role, created_at FROM users WHERE id = ?",
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user: users[0] });
    } catch (err) {
        console.error("[GET /api/auth/me] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching user profile" });
    }
});

// ==========================================
// CATEGORIES & BRANDS APIs (Public)
// ==========================================
app.get("/api/categories", async (req, res) => {
    try {
        const [categories] = await promiseDb.query("SELECT id, name, description FROM categories ORDER BY name ASC");
        res.json({ success: true, categories });
    } catch (err) {
        console.error("[GET /api/categories] Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch categories" });
    }
});

app.get("/api/brands", async (req, res) => {
    try {
        const [brands] = await promiseDb.query("SELECT id, name FROM brands ORDER BY name ASC");
        res.json({ success: true, brands });
    } catch (err) {
        console.error("[GET /api/brands] Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch brands" });
    }
});

// ==========================================
// PRODUCT APIs (Public)
// ==========================================

// Get all products (with optional search, category, brand, gender, frame_type, price, and stock filtering)
app.get("/api/products", async (req, res) => {
    try {
        const { search, category, brand, gender, min_price, max_price, frame_type, in_stock, include_test } = req.query;
        let query = `
            SELECT p.*, c.name AS category_name, b.name AS brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE 1=1
        `;
        const params = [];

        // Exclude test fixtures from public storefront unless explicitly requested by test suites
        if (include_test !== "true" && include_test !== "1") {
            query += ` AND p.name NOT LIKE '%Test Frame%'`;
        }

        if (search && typeof search === "string" && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ` AND (p.name LIKE ? OR p.description LIKE ? OR b.name LIKE ? OR c.name LIKE ?)`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category && typeof category === "string" && category.trim() && category.trim().toLowerCase() !== "all") {
            const catVal = category.trim();
            const catLower = catVal.toLowerCase();
            if (/^\d+$/.test(catVal)) {
                query += ` AND p.category_id = ?`;
                params.push(Number(catVal));
            } else if (catLower === "frames" || catLower === "all-frames" || catLower === "frame") {
                query += ` AND (p.category_id IN (1, 2, 3) OR (c.name NOT LIKE '%Lens%' AND (p.category_id IS NULL OR p.category_id NOT IN (4, 11))))`;
            } else if (catLower === "lenses" || catLower === "lens") {
                query += ` AND (p.category_id IN (4, 11) OR c.name LIKE '%Lens%')`;
            } else {
                const normalized = catVal.toLowerCase().replace(/[-_]/g, ' ');
                query += ` AND (
                    LOWER(c.name) = LOWER(?) 
                    OR LOWER(c.name) = ? 
                    OR LOWER(c.name) LIKE ?
                    OR (? = 'computer' AND LOWER(c.name) LIKE '%computer%')
                    OR (? = 'eyeglasses' AND LOWER(c.name) LIKE '%eyeglasses%')
                    OR (? = 'sunglasses' AND LOWER(c.name) LIKE '%sunglasses%')
                )`;
                params.push(catVal, normalized, `%${normalized}%`, normalized, normalized, normalized);
            }
        }

        if (brand && typeof brand === "string" && brand.trim() && brand.trim().toLowerCase() !== "all") {
            if (/^\d+$/.test(brand.trim())) {
                query += ` AND p.brand_id = ?`;
                params.push(Number(brand.trim()));
            } else {
                query += ` AND LOWER(b.name) = LOWER(?)`;
                params.push(brand.trim());
            }
        }

        if (gender && typeof gender === "string" && gender.trim() && gender.trim().toLowerCase() !== "all") {
            const g = gender.trim().toLowerCase();
            if (g === "kids" || g === "kid") {
                query += ` AND (LOWER(p.gender) = 'kids' OR LOWER(p.gender) = 'kid')`;
            } else if (g === "men" || g === "man") {
                query += ` AND (LOWER(p.gender) = 'men' OR LOWER(p.gender) = 'unisex')`;
            } else if (g === "women" || g === "woman") {
                query += ` AND (LOWER(p.gender) = 'women' OR LOWER(p.gender) = 'unisex')`;
            } else if (g === "unisex") {
                query += ` AND LOWER(p.gender) = 'unisex'`;
            } else {
                query += ` AND (LOWER(p.gender) = LOWER(?) OR LOWER(p.gender) = 'unisex')`;
                params.push(gender.trim());
            }

            // Exclude contact lenses and optical lenses from frame selections unless explicitly requested
            const reqCat = (category || "").toString().toLowerCase().trim();
            const isExplicitLensReq = reqCat === "4" || reqCat === "11" || reqCat.includes("lens");
            if (!isExplicitLensReq) {
                query += ` AND (p.category_id IS NULL OR p.category_id NOT IN (4, 11)) AND (c.name IS NULL OR c.name NOT LIKE '%Lens%')`;
            }
        }

        if (frame_type && typeof frame_type === "string" && frame_type.trim() && frame_type.trim().toLowerCase() !== "all") {
            query += ` AND LOWER(p.frame_type) = LOWER(?)`;
            params.push(frame_type.trim());
        }

        if (min_price !== undefined && min_price !== "") {
            const min = parseFloat(min_price);
            if (!isNaN(min) && min >= 0) {
                query += ` AND p.price >= ?`;
                params.push(min);
            }
        }

        if (max_price !== undefined && max_price !== "") {
            const max = parseFloat(max_price);
            if (!isNaN(max) && max >= 0) {
                query += ` AND p.price <= ?`;
                params.push(max);
            }
        }

        if (in_stock === "true" || in_stock === "1") {
            query += ` AND p.stock > 0`;
        }

        query += ` ORDER BY p.id ASC`;

        const [results] = await promiseDb.query(query, params);

        if (results.length > 0) {
            const productIds = results.map(p => p.id);
            const [variants] = await promiseDb.query(
                `SELECT * FROM product_variants WHERE product_id IN (?) ORDER BY is_default DESC, id ASC`,
                [productIds]
            );
            const variantMap = {};
            for (const v of variants) {
                if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
                variantMap[v.product_id].push(v);
            }
            for (const p of results) {
                p.variants = variantMap[p.id] || [];
            }
        }

        res.json({ success: true, products: results });
    } catch (err) {
        console.error("[GET /api/products] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error while fetching products" });
    }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
    const rawId = req.params.id;
    const productId = parseInt(rawId, 10);
    if (isNaN(productId) || productId <= 0 || String(productId) !== String(rawId).trim()) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }
    try {
        const [results] = await promiseDb.query(`
            SELECT p.*, c.name AS category_name, b.name AS brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.id = ?
        `, [productId]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const product = results[0];
        const [variants] = await promiseDb.query(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC",
            [productId]
        );
        product.variants = variants;

        res.json({ success: true, product });
    } catch (err) {
        console.error(`[GET /api/products/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error while fetching product" });
    }
});

// ==========================================
// ORDER APIs (Protected by JWT)
// ==========================================

const ALLOWED_PAYMENT_METHODS = ["Cash on Delivery", "COD", "Credit Card", "Cards / Netbanking", "UPI", "Online Payment"];

// Create Order (Requires Authentication - Cash on Delivery)
app.post("/api/orders", authMiddleware, orderLimiter, async (req, res) => {
    const { customer_name, mobile, address, payment_method, items, prescription } = req.body;
    const userId = req.user.id;

    // 1. Basic Validation
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Valid customer name is required (min 2 characters)" });
    }
    if (!mobile || typeof mobile !== "string" || !/^\d{10,15}$/.test(mobile.trim())) {
        return res.status(400).json({ success: false, message: "Valid mobile number is required (10-15 digits)" });
    }
    if (!address || typeof address !== "string" || address.trim().length < 5) {
        return res.status(400).json({ success: false, message: "Valid delivery address is required" });
    }
    if (!payment_method || !ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ success: false, message: "Invalid payment method" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Order must contain at least one item" });
    }

    // For online payments directly called via /api/orders, require Razorpay keys check
    const isCodOrder = payment_method === "Cash on Delivery" || payment_method === "COD";
    if (!isCodOrder) {
        const rzpConfig = getRazorpayConfig();
        if (!rzpConfig.configured) {
            return res.status(400).json({
                success: false,
                message: rzpConfig.message || "Online payment is currently unavailable. Please choose Cash on Delivery."
            });
        }
    }

    // Aggregate items by product ID and variant/color
    const itemMap = new Map();
    for (const item of items) {
        if (!item.product_id || !Number.isInteger(Number(item.product_id))) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        if (!item.quantity || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
            return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
        }
        const pId = Number(item.product_id);
        const qty = Number(item.quantity);
        const selectedColor = item.selected_color && typeof item.selected_color === 'string' ? item.selected_color.trim() : null;
        const selectedImage = item.selected_image && typeof item.selected_image === 'string' ? item.selected_image.trim() : null;
        const variantId = item.variant_id && Number.isInteger(Number(item.variant_id)) ? Number(item.variant_id) : null;
        const key = `${pId}_${variantId || ''}_${selectedColor || ''}`;

        if (itemMap.has(key)) {
            itemMap.get(key).quantity += qty;
        } else {
            itemMap.set(key, {
                product_id: pId,
                quantity: qty,
                selected_color: selectedColor,
                selected_image: selectedImage,
                variant_id: variantId
            });
        }
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        let total = 0;
        const validItems = [];

        // Check overall required stock per product_id
        const productTotalQuantities = new Map();
        for (const itemData of itemMap.values()) {
            productTotalQuantities.set(
                itemData.product_id,
                (productTotalQuantities.get(itemData.product_id) || 0) + itemData.quantity
            );
        }

        for (const [productId, reqQty] of productTotalQuantities.entries()) {
            const [products] = await connection.query(
                "SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE",
                [productId]
            );
            if (products.length === 0) {
                throw new Error(`VALIDATION:Product ID ${productId} not found`);
            }
            const product = products[0];
            if (product.stock < reqQty) {
                throw new Error(`VALIDATION:Insufficient stock for product ${product.name}`);
            }
            await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [reqQty, product.id]);
        }

        // Build validItems and calculate total using DB price
        for (const itemData of itemMap.values()) {
            const [products] = await connection.query(
                "SELECT id, name, price, image, color FROM products WHERE id = ?",
                [itemData.product_id]
            );
            const product = products[0];
            const price = parseFloat(product.price);
            total += price * itemData.quantity;

            let finalImage = itemData.selected_image || product.image;
            let finalColor = itemData.selected_color || product.color;

            if (itemData.variant_id) {
                const [vars] = await connection.query(
                    "SELECT * FROM product_variants WHERE id = ? AND product_id = ?",
                    [itemData.variant_id, itemData.product_id]
                );
                if (vars.length > 0) {
                    finalColor = vars[0].color_name;
                    finalImage = vars[0].image;
                }
            }

            validItems.push({
                product_id: product.id,
                product_name: product.name,
                price: price,
                quantity: itemData.quantity,
                selected_color: finalColor,
                selected_image: finalImage,
                variant_id: itemData.variant_id
            });
        }

        const finalSavedMethod = (payment_method === "Cash on Delivery" || payment_method === "COD") ? "COD" : payment_method;
        const paymentStatus = "Pending";

        // Insert Order with authenticated user_id
        const [orderResult] = await connection.query(
            `INSERT INTO orders 
            (user_id, customer_name, mobile, address, payment_method, total, status, payment_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)`,
            [userId, customer_name.trim(), mobile.trim(), address.trim(), finalSavedMethod, total, paymentStatus]
        );
        const orderId = orderResult.insertId;

        // Insert Order Items with color variant tracking
        for (const vItem of validItems) {
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, selected_color, selected_image, variant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [orderId, vItem.product_id, vItem.product_name, vItem.price, vItem.quantity, vItem.selected_color, vItem.selected_image, vItem.variant_id]
            );
        }

        // Optional Prescription attachment
        if (prescription && (prescription.has_prescription || prescription.prescription_file_url || prescription.right_sph)) {
            await connection.query(
                `INSERT INTO order_prescriptions 
                (order_id, user_id, has_prescription, right_sph, right_cyl, right_axis, left_sph, left_cyl, left_axis, pupillary_distance, prescription_file_url, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    userId,
                    true,
                    prescription.right_sph || null,
                    prescription.right_cyl || null,
                    prescription.right_axis || null,
                    prescription.left_sph || null,
                    prescription.left_cyl || null,
                    prescription.left_axis || null,
                    prescription.pupillary_distance || null,
                    prescription.prescription_file_url || null,
                    prescription.notes || null
                ]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, message: "Order placed successfully", order_id: orderId });
    } catch (err) {
        await connection.rollback();
        console.error("[POST /api/orders] Error:", err.message);

        if (err.message && err.message.startsWith("VALIDATION:")) {
            res.status(400).json({ success: false, message: err.message.split("VALIDATION:")[1] });
        } else {
            res.status(500).json({ success: false, message: "Internal server error while placing order" });
        }
    } finally {
        connection.release();
    }
});

// GET all orders for the authenticated user
app.get("/api/orders", authMiddleware, async (req, res) => {
    try {
        const [orders] = await promiseDb.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json({ success: true, orders });
    } catch (err) {
        console.error("[GET /api/orders] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error while fetching orders" });
    }
});

// GET single order (Ownership verified via JWT)
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
    const orderId = req.params.id;

    try {
        const [orders] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Check ownership (or allow if admin)
        if (orders[0].user_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "You are not authorized to view this order" });
        }

        const [items] = await promiseDb.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        const [prescriptions] = await promiseDb.query("SELECT * FROM order_prescriptions WHERE order_id = ?", [orderId]);
        res.json({ success: true, order: orders[0], items, prescription: prescriptions[0] || null });
    } catch (err) {
        console.error(`[GET /api/orders/${orderId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error while fetching order" });
    }
});

// Cancel Order (Ownership verified via JWT)
app.patch("/api/orders/:id/cancel", authMiddleware, async (req, res) => {
    const orderId = req.params.id;
    const connection = await promiseDb.getConnection();

    try {
        await connection.beginTransaction();
        const [orders] = await connection.query(
            "SELECT id, user_id, status FROM orders WHERE id = ? FOR UPDATE",
            [orderId]
        );

        if (orders.length === 0) {
            throw new Error("VALIDATION:Order not found");
        }
        if (orders[0].user_id !== req.user.id && req.user.role !== "admin") {
            throw new Error("FORBIDDEN:You are not authorized to cancel this order");
        }
        const isCancelledStatus = (s) => {
            const st = (s || "").trim().toLowerCase();
            return st === "cancelled" || st === "canceled";
        };
        const isShippedOrDelivered = (s) => {
            const st = (s || "").trim().toLowerCase();
            return ["shipped", "dispatched", "dispatch", "delivered", "complete", "completed"].includes(st);
        };

        if (isCancelledStatus(orders[0].status)) {
            throw new Error("VALIDATION:Order is already cancelled");
        }
        if (isShippedOrDelivered(orders[0].status)) {
            throw new Error("VALIDATION:Cannot cancel an order that has already been shipped or delivered");
        }

        await connection.query("UPDATE orders SET status = 'Cancelled' WHERE id = ?", [orderId]);

        // Restore stock
        const [items] = await connection.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
            [orderId]
        );
        for (const item of items) {
            await connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }

        await connection.commit();
        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (err) {
        await connection.rollback();
        console.error(`[PATCH /api/orders/${orderId}/cancel] Error:`, err.message);

        if (err.message && err.message.startsWith("FORBIDDEN:")) {
            res.status(403).json({ success: false, message: err.message.split("FORBIDDEN:")[1] });
        } else if (err.message && err.message.startsWith("VALIDATION:")) {
            res.status(400).json({ success: false, message: err.message.split("VALIDATION:")[1] });
        } else {
            res.status(500).json({ success: false, message: "Internal server error while cancelling order" });
        }
    } finally {
        connection.release();
    }
});

// ==========================================
// RAZORPAY TEST MODE PAYMENT APIs & HELPERS
// ==========================================

function getRazorpayConfig() {
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
        return {
            configured: false,
            keyId: null,
            keySecret: null,
            mode: "unconfigured",
            message: "Razorpay credentials are not configured in backend/.env. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable online checkout, or select Cash on Delivery."
        };
    }

    if (keyId.includes("your_key_id") || keySecret.includes("your_razorpay")) {
        return {
            configured: false,
            keyId: null,
            keySecret: null,
            mode: "unconfigured",
            message: "Placeholder Razorpay credentials detected in backend/.env. Replace them with valid test credentials from your Razorpay Dashboard."
        };
    }

    if (keyId.startsWith("rzp_live_")) {
        return {
            configured: false,
            keyId: null,
            keySecret: null,
            mode: "live_rejected",
            message: "Live mode credentials detected. EyeKart is strictly configured for Razorpay Test Mode. Please use test keys starting with 'rzp_test_'."
        };
    }

    if (!keyId.startsWith("rzp_test_")) {
        return {
            configured: false,
            keyId: null,
            keySecret: null,
            mode: "invalid_format",
            message: "Invalid Razorpay Test Key ID format. Test Mode keys must start with 'rzp_test_'."
        };
    }

    return {
        configured: true,
        keyId,
        keySecret,
        mode: "test",
        message: "Razorpay Test Mode is configured and active."
    };
}

// Check Payment Gateway Configuration (GET /api/payments/config)
app.get("/api/payments/config", (req, res) => {
    const config = getRazorpayConfig();

    res.json({
        success: true,
        configured: config.configured,
        keyId: config.configured ? config.keyId : null,
        mode: config.mode,
        message: config.message
    });
});

// Create Payment Order (POST /api/payments/create-order)
app.post("/api/payments/create-order", authMiddleware, orderLimiter, async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Order must contain at least one item" });
    }

    const config = getRazorpayConfig();

    // If credentials are missing or invalid, return safe fallback message
    if (!config.configured) {
        console.warn(`[POST /api/payments/create-order] Online payment blocked: ${config.message}`);
        return res.status(400).json({
            success: false,
            configured: false,
            message: config.message || "Online payment is currently unavailable. Please choose Cash on Delivery."
        });
    }

    try {
        // Calculate exact total from database prices (never trust frontend price)
        let total = 0;
        for (const item of items) {
            const pId = Number(item.product_id);
            const qty = Number(item.quantity);

            if (!pId || !qty || qty <= 0) {
                return res.status(400).json({ success: false, message: "Invalid product ID or quantity" });
            }

            const [products] = await promiseDb.query("SELECT price, stock FROM products WHERE id = ?", [pId]);
            if (products.length === 0) {
                return res.status(400).json({ success: false, message: `Product ID ${pId} not found` });
            }
            if (products[0].stock < qty) {
                return res.status(400).json({ success: false, message: "Insufficient stock for product" });
            }
            total += parseFloat(products[0].price) * qty;
        }

        // Amount in paise for INR (1 INR = 100 paise)
        const amountInPaise = Math.round(total * 100);

        try {
            const razorpay = new Razorpay({
                key_id: config.keyId,
                key_secret: config.keySecret
            });

            const razorpayOrder = await razorpay.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: `eyekart_rcpt_${Date.now()}`
            });

            return res.json({
                success: true,
                configured: true,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: config.keyId
            });
        } catch (gatewayErr) {
            const gatewayDesc = (gatewayErr && (gatewayErr.error?.description || gatewayErr.description || gatewayErr.message)) || "Gateway communication error";
            console.error("[POST /api/payments/create-order] Razorpay Gateway Error:", gatewayDesc);
            return res.status(502).json({
                success: false,
                configured: true,
                message: "Online payment gateway error: " + gatewayDesc
            });
        }
    } catch (err) {
        console.error("[POST /api/payments/create-order] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error while initializing payment order" });
    }
});

// Verify Payment Signature (POST /api/payments/verify)
app.post("/api/payments/verify", authMiddleware, orderLimiter, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data } = req.body;
    const config = getRazorpayConfig();

    if (!config.configured || !config.keySecret) {
        return res.status(400).json({
            success: false,
            message: config.message || "Online payment is currently unavailable. Please choose Cash on Delivery."
        });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_data) {
        return res.status(400).json({ success: false, message: "Missing required payment verification data" });
    }

    // Verify HMAC SHA-256 signature
    const expectedSignature = crypto
        .createHmac("sha256", config.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature verification failed" });
    }

    const { customer_name, mobile, address, items } = order_data;
    const userId = req.user.id;

    if (!customer_name || !mobile || !address || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid order data provided with payment" });
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // Step 15: Check for duplicate order / payment verification
        const [existingOrders] = await connection.query(
            "SELECT id FROM orders WHERE payment_id = ? OR payment_order_id = ?",
            [razorpay_payment_id, razorpay_order_id]
        );
        if (existingOrders.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Payment already verified and order previously processed",
                order_id: existingOrders[0].id
            });
        }

        let total = 0;
        const validItems = [];

        // Check overall required stock per product_id
        const productTotalQuantities = new Map();
        for (const item of items) {
            const pId = Number(item.product_id);
            const qty = Number(item.quantity);
            productTotalQuantities.set(pId, (productTotalQuantities.get(pId) || 0) + qty);
        }

        for (const [pId, reqQty] of productTotalQuantities.entries()) {
            const [products] = await connection.query(
                "SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE",
                [pId]
            );
            if (products.length === 0 || products[0].stock < reqQty) {
                throw new Error("VALIDATION:Stock error during payment finalization");
            }
            await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [reqQty, pId]);
        }

        for (const item of items) {
            const pId = Number(item.product_id);
            const qty = Number(item.quantity);
            const [products] = await connection.query("SELECT id, name, price, image, color FROM products WHERE id = ?", [pId]);
            const product = products[0];
            const price = parseFloat(product.price);
            total += price * qty;

            let finalImage = item.selected_image || product.image;
            let finalColor = item.selected_color || product.color;

            if (item.variant_id) {
                const [vars] = await connection.query(
                    "SELECT * FROM product_variants WHERE id = ? AND product_id = ?",
                    [item.variant_id, pId]
                );
                if (vars.length > 0) {
                    finalColor = vars[0].color_name;
                    finalImage = vars[0].image;
                }
            }

            validItems.push({
                product_id: product.id,
                product_name: product.name,
                price: price,
                quantity: qty,
                selected_color: finalColor,
                selected_image: finalImage,
                variant_id: item.variant_id || null
            });
        }

        const chosenPaymentMethod = (order_data.payment_method && ALLOWED_PAYMENT_METHODS.includes(order_data.payment_method))
            ? order_data.payment_method
            : 'Online Payment';

        const [orderResult] = await connection.query(
            `INSERT INTO orders 
            (user_id, customer_name, mobile, address, payment_method, total, status, payment_status, payment_order_id, payment_id, payment_signature) 
            VALUES (?, ?, ?, ?, ?, ?, 'Processing', 'Paid', ?, ?, ?)`,
            [userId, customer_name.trim(), mobile.trim(), address.trim(), chosenPaymentMethod, total, razorpay_order_id, razorpay_payment_id, razorpay_signature]
        );
        const orderId = orderResult.insertId;

        for (const vItem of validItems) {
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, selected_color, selected_image, variant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [orderId, vItem.product_id, vItem.product_name, vItem.price, vItem.quantity, vItem.selected_color, vItem.selected_image, vItem.variant_id]
            );
        }

        // Optional Prescription attachment
        if (order_data.prescription && (order_data.prescription.has_prescription || order_data.prescription.prescription_file_url || order_data.prescription.right_sph)) {
            await connection.query(
                `INSERT INTO order_prescriptions 
                (order_id, user_id, has_prescription, right_sph, right_cyl, right_axis, left_sph, left_cyl, left_axis, pupillary_distance, prescription_file_url, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    userId,
                    true,
                    order_data.prescription.right_sph || null,
                    order_data.prescription.right_cyl || null,
                    order_data.prescription.right_axis || null,
                    order_data.prescription.left_sph || null,
                    order_data.prescription.left_cyl || null,
                    order_data.prescription.left_axis || null,
                    order_data.prescription.pupillary_distance || null,
                    order_data.prescription.prescription_file_url || null,
                    order_data.prescription.notes || null
                ]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, message: "Payment verified and order placed successfully", order_id: orderId });
    } catch (err) {
        await connection.rollback();
        console.error("[POST /api/payments/verify] Error:", err.message);

        if (err.message && err.message.startsWith("VALIDATION:")) {
            res.status(400).json({ success: false, message: err.message.split("VALIDATION:")[1] });
        } else {
            res.status(500).json({ success: false, message: "Internal server error during payment verification" });
        }
    } finally {
        connection.release();
    }
});

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT APIs (Protected by requireAdmin)
// ==========================================

// GET /api/admin/stats
app.get("/api/admin/stats", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [[usersCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM users WHERE role = 'user'");
        const [[productsCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM products");
        const [[ordersCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM orders");
        const [[revenueResult]] = await promiseDb.query(
            "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'Paid' OR (payment_method IN ('Cash on Delivery', 'COD') AND (status = 'Delivered' OR status = 'Complete' OR status = 'Completed'))"
        );
        const [[pendingCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM orders WHERE LOWER(status) = 'pending'");
        const [[paidCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'Paid'");
        const [[cancelledCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM orders WHERE LOWER(status) IN ('cancelled', 'canceled')");
        const [lowStockProducts] = await promiseDb.query(
            "SELECT id, name, price, stock FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 15"
        );
        const [[reviewsCount]] = await promiseDb.query("SELECT COUNT(*) AS total FROM reviews");

        res.json({
            success: true,
            stats: {
                totalUsers: Number(usersCount.total),
                totalProducts: Number(productsCount.total),
                totalOrders: Number(ordersCount.total),
                totalRevenue: Number(revenueResult.total),
                pendingOrders: Number(pendingCount.total),
                paidOrders: Number(paidCount.total),
                cancelledOrders: Number(cancelledCount.total),
                lowStockCount: lowStockProducts.length,
                lowStockProducts,
                totalReviews: Number(reviewsCount.total)
            }
        });
    } catch (err) {
        console.error("[GET /api/admin/stats] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching admin statistics" });
    }
});

// GET /api/admin/orders
app.get("/api/admin/orders", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const rawStatus = req.query.status ? String(req.query.status).trim().toLowerCase() : "";
        let query = `
            SELECT o.*, u.email AS user_email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id
        `;
        const params = [];

        if (rawStatus && rawStatus !== "all") {
            if (rawStatus === "shipped") {
                query += " WHERE LOWER(o.status) IN ('shipped', 'dispatched', 'dispatch')";
            } else if (rawStatus === "delivered") {
                query += " WHERE LOWER(o.status) = 'delivered'";
            } else if (rawStatus === "complete") {
                query += " WHERE LOWER(o.status) IN ('complete', 'completed')";
            } else if (rawStatus === "cancelled" || rawStatus === "canceled") {
                query += " WHERE LOWER(o.status) IN ('cancelled', 'canceled')";
            } else {
                query += " WHERE LOWER(o.status) = ?";
                params.push(rawStatus);
            }
        }

        query += " ORDER BY o.created_at DESC";

        const [orders] = await promiseDb.query(query, params);
        res.json({ success: true, orders });
    } catch (err) {
        console.error("[GET /api/admin/orders] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching admin orders" });
    }
});

// GET /api/admin/orders/:id
app.get("/api/admin/orders/:id", authMiddleware, requireAdmin, async (req, res) => {
    const orderId = req.params.id;
    try {
        const [orders] = await promiseDb.query(`
            SELECT o.*, u.email AS user_email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const [items] = await promiseDb.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        const [prescriptions] = await promiseDb.query("SELECT * FROM order_prescriptions WHERE order_id = ?", [orderId]);
        res.json({ success: true, order: orders[0], items, prescription: prescriptions[0] || null });
    } catch (err) {
        console.error(`[GET /api/admin/orders/${orderId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching order" });
    }
});

// PATCH /api/admin/orders/:id/status
app.patch("/api/admin/orders/:id/status", authMiddleware, requireAdmin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    const STATUS_MAP = {
        pending: "Pending",
        confirmed: "Confirmed",
        processing: "Processing",
        shipped: "Shipped",
        dispatched: "Shipped",
        dispatch: "Shipped",
        delivered: "Delivered",
        complete: "Complete",
        completed: "Complete",
        cancelled: "Cancelled",
        canceled: "Cancelled"
    };

    const trimmedStatus = (status || "").trim().toLowerCase();
    const canonicalStatus = STATUS_MAP[trimmedStatus];

    const ALLOWED_STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Complete", "Cancelled"];
    if (!canonicalStatus || !ALLOWED_STATUSES.includes(canonicalStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid order status. Allowed options: ${ALLOWED_STATUSES.join(", ")}`
        });
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query("SELECT id, status, payment_method, payment_status FROM orders WHERE id = ? FOR UPDATE", [orderId]);
        if (orders.length === 0) {
            throw new Error("VALIDATION:Order not found");
        }

        const currentOrder = orders[0];
        const oldStatus = currentOrder.status;

        const isCancelled = (s) => {
            const st = (s || "").trim().toLowerCase();
            return st === "cancelled" || st === "canceled";
        };
        const isDeliveredOrComplete = (s) => {
            const st = (s || "").trim().toLowerCase();
            return st === "delivered" || st === "complete" || st === "completed";
        };

        // If moving to Cancelled from another status, restore stock
        if (!isCancelled(oldStatus) && isCancelled(canonicalStatus)) {
            const [items] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
            for (const item of items) {
                await connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
            }
        }

        // If moving from Cancelled to an active status, verify and deduct stock
        if (isCancelled(oldStatus) && !isCancelled(canonicalStatus)) {
            const [items] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
            for (const item of items) {
                const [prods] = await connection.query("SELECT stock, name FROM products WHERE id = ? FOR UPDATE", [item.product_id]);
                if (prods.length === 0 || prods[0].stock < item.quantity) {
                    throw new Error(`VALIDATION:Insufficient stock to re-activate order for product ${prods[0]?.name || item.product_id}`);
                }
                await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
            }
        }

        // If delivered or completed and payment method is COD, mark payment as Paid automatically
        let newPaymentStatus = currentOrder.payment_status;
        if (isDeliveredOrComplete(canonicalStatus) && (currentOrder.payment_method === "Cash on Delivery" || currentOrder.payment_method === "COD")) {
            newPaymentStatus = "Paid";
        }

        await connection.query(
            "UPDATE orders SET status = ?, payment_status = ? WHERE id = ?",
            [canonicalStatus, newPaymentStatus, orderId]
        );

        await connection.commit();
        res.json({
            success: true,
            message: `Order #${orderId} status successfully updated to ${canonicalStatus}`,
            order: { id: orderId, status: canonicalStatus, payment_status: newPaymentStatus }
        });
    } catch (err) {
        await connection.rollback();
        console.error(`[PATCH /api/admin/orders/${orderId}/status] Error:`, err.message);

        if (err.message && err.message.startsWith("VALIDATION:")) {
            res.status(400).json({ success: false, message: err.message.split("VALIDATION:")[1] });
        } else {
            res.status(500).json({ success: false, message: "Internal server error while updating order status" });
        }
    } finally {
        connection.release();
    }
});

// GET /api/admin/products
app.get("/api/admin/products", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [products] = await promiseDb.query(`
            SELECT p.*, c.name AS category_name, b.name AS brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            ORDER BY p.id DESC
        `);
        res.json({ success: true, products });
    } catch (err) {
        console.error("[GET /api/admin/products] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching admin products" });
    }
});

// POST /api/admin/products
app.post("/api/admin/products", authMiddleware, requireAdmin, async (req, res) => {
    const {
        name,
        description,
        category_id,
        brand_id,
        price,
        discount = 0,
        stock = 0,
        gender = "Unisex",
        frame_type = "Full Rim",
        frame_material = "Acetate",
        lens_type = "Clear",
        color = "Black",
        image = "👓"
    } = req.body;

    // Strict Validations
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Product name must be at least 2 characters long" });
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ success: false, message: "Valid positive price is required" });
    }
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: "Stock must be a non-negative integer" });
    }
    const parsedDiscount = parseFloat(discount) || 0;
    if (parsedDiscount < 0 || parsedDiscount > 100) {
        return res.status(400).json({ success: false, message: "Discount must be between 0 and 100%" });
    }

    try {
        const [result] = await promiseDb.query(
            `INSERT INTO products 
            (name, description, category_id, brand_id, price, discount, stock, gender, frame_type, frame_material, lens_type, color, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                description ? description.trim() : null,
                category_id ? parseInt(category_id, 10) : null,
                brand_id ? parseInt(brand_id, 10) : null,
                parsedPrice,
                parsedDiscount,
                parsedStock,
                gender ? gender.trim() : "Unisex",
                frame_type ? frame_type.trim() : "Full Rim",
                frame_material ? frame_material.trim() : "Acetate",
                lens_type ? lens_type.trim() : "Clear",
                color ? color.trim() : "Black",
                image ? image.trim() : "👓"
            ]
        );

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product_id: result.insertId
        });
    } catch (err) {
        console.error("[POST /api/admin/products] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error while creating product" });
    }
});

// PUT /api/admin/products/:id
app.put("/api/admin/products/:id", authMiddleware, requireAdmin, async (req, res) => {
    const productId = req.params.id;
    const {
        name,
        description,
        category_id,
        brand_id,
        price,
        discount,
        stock,
        gender,
        frame_type,
        frame_material,
        lens_type,
        color,
        image
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Product name must be at least 2 characters long" });
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ success: false, message: "Valid positive price is required" });
    }
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: "Stock must be a non-negative integer" });
    }
    const parsedDiscount = parseFloat(discount) || 0;
    if (parsedDiscount < 0 || parsedDiscount > 100) {
        return res.status(400).json({ success: false, message: "Discount must be between 0 and 100%" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT id FROM products WHERE id = ?", [productId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        await promiseDb.query(
            `UPDATE products SET 
            name = ?, description = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, 
            stock = ?, gender = ?, frame_type = ?, frame_material = ?, lens_type = ?, color = ?, image = ? 
            WHERE id = ?`,
            [
                name.trim(),
                description ? description.trim() : null,
                category_id ? parseInt(category_id, 10) : null,
                brand_id ? parseInt(brand_id, 10) : null,
                parsedPrice,
                parsedDiscount,
                parsedStock,
                gender ? gender.trim() : "Unisex",
                frame_type ? frame_type.trim() : "Full Rim",
                frame_material ? frame_material.trim() : "Acetate",
                lens_type ? lens_type.trim() : "Clear",
                color ? color.trim() : "Black",
                image ? image.trim() : "👓",
                productId
            ]
        );

        res.json({ success: true, message: "Product updated successfully" });
    } catch (err) {
        console.error(`[PUT /api/admin/products/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error while updating product" });
    }
});

// PATCH /api/admin/products/:id/stock
app.patch("/api/admin/products/:id/stock", authMiddleware, requireAdmin, async (req, res) => {
    const productId = req.params.id;
    const { stock } = req.body;

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: "Stock must be a non-negative integer" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT id FROM products WHERE id = ?", [productId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        await promiseDb.query("UPDATE products SET stock = ? WHERE id = ?", [parsedStock, productId]);
        res.json({ success: true, message: "Stock updated successfully", stock: parsedStock });
    } catch (err) {
        console.error(`[PATCH /api/admin/products/${productId}/stock] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error while updating stock" });
    }
});

// DELETE /api/admin/products/:id
app.delete("/api/admin/products/:id", authMiddleware, requireAdmin, async (req, res) => {
    const productId = req.params.id;

    try {
        const [existing] = await promiseDb.query("SELECT id FROM products WHERE id = ?", [productId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check if referenced in order_items
        const [orderItems] = await promiseDb.query("SELECT id FROM order_items WHERE product_id = ? LIMIT 1", [productId]);
        if (orderItems.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete product because it is referenced in past customer orders. You may set its stock to 0 instead."
            });
        }

        await promiseDb.query("DELETE FROM products WHERE id = ?", [productId]);
        res.json({ success: true, message: "Product deleted successfully" });
    } catch (err) {
        console.error(`[DELETE /api/admin/products/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error while deleting product" });
    }
});

// ==========================================
// ADMIN PRODUCT COLOR VARIANTS APIs
// ==========================================

// GET /api/admin/products/:id/variants
app.get("/api/admin/products/:id/variants", authMiddleware, requireAdmin, async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }
    try {
        const [variants] = await promiseDb.query(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC",
            [productId]
        );
        res.json({ success: true, variants });
    } catch (err) {
        console.error(`[GET /api/admin/products/${productId}/variants] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching product variants" });
    }
});

// POST /api/admin/products/:id/variants
app.post("/api/admin/products/:id/variants", authMiddleware, requireAdmin, async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    const { color_name, color_code, image, stock = 20, price_adjustment = 0, is_default = false } = req.body;

    if (!color_name || typeof color_name !== "string" || !color_name.trim()) {
        return res.status(400).json({ success: false, message: "Variant color name is required" });
    }
    if (!image || typeof image !== "string" || !image.trim()) {
        return res.status(400).json({ success: false, message: "Variant image URL or path is required" });
    }

    try {
        const [prod] = await promiseDb.query("SELECT id FROM products WHERE id = ?", [productId]);
        if (prod.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (is_default) {
            await promiseDb.query("UPDATE product_variants SET is_default = 0 WHERE product_id = ?", [productId]);
            await promiseDb.query("UPDATE products SET image = ?, color = ? WHERE id = ?", [image.trim(), color_name.trim(), productId]);
        }

        const [result] = await promiseDb.query(
            `INSERT INTO product_variants 
            (product_id, color_name, color_code, image, stock, price_adjustment, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [productId, color_name.trim(), color_code ? color_code.trim() : '#000000', image.trim(), parseInt(stock, 10) || 0, parseFloat(price_adjustment) || 0, is_default ? 1 : 0]
        );

        res.status(201).json({
            success: true,
            message: "Color variant added successfully",
            variant_id: result.insertId
        });
    } catch (err) {
        console.error(`[POST /api/admin/products/${productId}/variants] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error adding color variant" });
    }
});

// PUT /api/admin/variants/:variantId
app.put("/api/admin/variants/:variantId", authMiddleware, requireAdmin, async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId) || variantId <= 0) {
        return res.status(400).json({ success: false, message: "Valid variant ID is required" });
    }

    const { color_name, color_code, image, stock, price_adjustment, is_default } = req.body;

    try {
        const [existing] = await promiseDb.query("SELECT * FROM product_variants WHERE id = ?", [variantId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        const current = existing[0];
        const newColor = color_name !== undefined ? String(color_name).trim() : current.color_name;
        const newCode = color_code !== undefined ? String(color_code).trim() : current.color_code;
        const newImage = image !== undefined ? String(image).trim() : current.image;
        const newStock = stock !== undefined ? parseInt(stock, 10) : current.stock;
        const newAdj = price_adjustment !== undefined ? parseFloat(price_adjustment) : current.price_adjustment;
        const newDefault = is_default !== undefined ? (is_default ? 1 : 0) : current.is_default;

        if (newDefault) {
            await promiseDb.query("UPDATE product_variants SET is_default = 0 WHERE product_id = ?", [current.product_id]);
            await promiseDb.query("UPDATE products SET image = ?, color = ? WHERE id = ?", [newImage, newColor, current.product_id]);
        }

        await promiseDb.query(
            `UPDATE product_variants SET 
            color_name = ?, color_code = ?, image = ?, stock = ?, price_adjustment = ?, is_default = ? 
            WHERE id = ?`,
            [newColor, newCode, newImage, newStock, newAdj, newDefault, variantId]
        );

        res.json({ success: true, message: "Variant updated successfully" });
    } catch (err) {
        console.error(`[PUT /api/admin/variants/${variantId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error updating variant" });
    }
});

// DELETE /api/admin/variants/:variantId
app.delete("/api/admin/variants/:variantId", authMiddleware, requireAdmin, async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId) || variantId <= 0) {
        return res.status(400).json({ success: false, message: "Valid variant ID is required" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT * FROM product_variants WHERE id = ?", [variantId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        await promiseDb.query("DELETE FROM product_variants WHERE id = ?", [variantId]);
        res.json({ success: true, message: "Variant deleted successfully" });
    } catch (err) {
        console.error(`[DELETE /api/admin/variants/${variantId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error deleting variant" });
    }
});

// ==========================================
// ADMIN CATEGORY, BRAND & CUSTOMER MANAGEMENT
// ==========================================

// POST /api/admin/categories
app.post("/api/admin/categories", authMiddleware, requireAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Valid category name is required (min 2 characters)" });
    }
    const cleanName = name.trim();
    const cleanDesc = description && typeof description === "string" ? description.trim() : null;

    try {
        const [existing] = await promiseDb.query("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", [cleanName]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "Category with this name already exists" });
        }

        const [result] = await promiseDb.query(
            "INSERT INTO categories (name, description) VALUES (?, ?)",
            [cleanName, cleanDesc]
        );
        res.status(201).json({
            success: true,
            message: "Category created successfully",
            category: { id: result.insertId, name: cleanName, description: cleanDesc }
        });
    } catch (err) {
        console.error("[POST /api/admin/categories] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error creating category" });
    }
});

// PUT /api/admin/categories/:id
app.put("/api/admin/categories/:id", authMiddleware, requireAdmin, async (req, res) => {
    const catId = parseInt(req.params.id, 10);
    if (isNaN(catId) || catId <= 0) {
        return res.status(400).json({ success: false, message: "Valid category ID is required" });
    }
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Valid category name is required" });
    }
    const cleanName = name.trim();
    const cleanDesc = description && typeof description === "string" ? description.trim() : null;

    try {
        const [existing] = await promiseDb.query("SELECT id FROM categories WHERE id = ?", [catId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        const [duplicate] = await promiseDb.query(
            "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?",
            [cleanName, catId]
        );
        if (duplicate.length > 0) {
            return res.status(400).json({ success: false, message: "Another category with this name already exists" });
        }

        await promiseDb.query(
            "UPDATE categories SET name = ?, description = ? WHERE id = ?",
            [cleanName, cleanDesc, catId]
        );
        res.json({ success: true, message: "Category updated successfully" });
    } catch (err) {
        console.error(`[PUT /api/admin/categories/${catId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error updating category" });
    }
});

// DELETE /api/admin/categories/:id
app.delete("/api/admin/categories/:id", authMiddleware, requireAdmin, async (req, res) => {
    const catId = parseInt(req.params.id, 10);
    if (isNaN(catId) || catId <= 0) {
        return res.status(400).json({ success: false, message: "Valid category ID is required" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT id FROM categories WHERE id = ?", [catId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Set category_id = NULL for associated products to maintain product catalog integrity
        await promiseDb.query("UPDATE products SET category_id = NULL WHERE category_id = ?", [catId]);
        await promiseDb.query("DELETE FROM categories WHERE id = ?", [catId]);
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (err) {
        console.error(`[DELETE /api/admin/categories/${catId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error deleting category" });
    }
});

// POST /api/admin/brands
app.post("/api/admin/brands", authMiddleware, requireAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Valid brand name is required (min 2 characters)" });
    }
    const cleanName = name.trim();

    try {
        const [existing] = await promiseDb.query("SELECT id FROM brands WHERE LOWER(name) = LOWER(?)", [cleanName]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "Brand with this name already exists" });
        }

        const [result] = await promiseDb.query("INSERT INTO brands (name) VALUES (?)", [cleanName]);
        res.status(201).json({
            success: true,
            message: "Brand created successfully",
            brand: { id: result.insertId, name: cleanName }
        });
    } catch (err) {
        console.error("[POST /api/admin/brands] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error creating brand" });
    }
});

// PUT /api/admin/brands/:id
app.put("/api/admin/brands/:id", authMiddleware, requireAdmin, async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    if (isNaN(brandId) || brandId <= 0) {
        return res.status(400).json({ success: false, message: "Valid brand ID is required" });
    }
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Valid brand name is required" });
    }
    const cleanName = name.trim();

    try {
        const [existing] = await promiseDb.query("SELECT id FROM brands WHERE id = ?", [brandId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        const [duplicate] = await promiseDb.query(
            "SELECT id FROM brands WHERE LOWER(name) = LOWER(?) AND id != ?",
            [cleanName, brandId]
        );
        if (duplicate.length > 0) {
            return res.status(400).json({ success: false, message: "Another brand with this name already exists" });
        }

        await promiseDb.query("UPDATE brands SET name = ? WHERE id = ?", [cleanName, brandId]);
        res.json({ success: true, message: "Brand updated successfully" });
    } catch (err) {
        console.error(`[PUT /api/admin/brands/${brandId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error updating brand" });
    }
});

// DELETE /api/admin/brands/:id
app.delete("/api/admin/brands/:id", authMiddleware, requireAdmin, async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    if (isNaN(brandId) || brandId <= 0) {
        return res.status(400).json({ success: false, message: "Valid brand ID is required" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT id FROM brands WHERE id = ?", [brandId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        await promiseDb.query("UPDATE products SET brand_id = NULL WHERE brand_id = ?", [brandId]);
        await promiseDb.query("DELETE FROM brands WHERE id = ?", [brandId]);
        res.json({ success: true, message: "Brand deleted successfully" });
    } catch (err) {
        console.error(`[DELETE /api/admin/brands/${brandId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error deleting brand" });
    }
});

// GET /api/admin/customers
app.get("/api/admin/customers", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [customers] = await promiseDb.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.mobile, 
                u.role, 
                u.created_at, 
                COUNT(o.id) AS total_orders, 
                COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total ELSE 0 END), 0) AS total_spent 
            FROM users u 
            LEFT JOIN orders o ON u.id = o.user_id 
            GROUP BY u.id, u.name, u.email, u.mobile, u.role, u.created_at 
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, customers });
    } catch (err) {
        console.error("[GET /api/admin/customers] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching customers list" });
    }
});


// ==========================================
// PHASE 6: WISHLIST / FAVORITES APIs
// ==========================================

// GET /api/wishlist (User Wishlist)
app.get("/api/wishlist", authMiddleware, async (req, res) => {
    try {
        const [wishlist] = await promiseDb.query(`
            SELECT p.*, c.name AS category_name, b.name AS brand_name, w.created_at AS wishlisted_at 
            FROM wishlist w 
            JOIN products p ON w.product_id = p.id 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            WHERE w.user_id = ? 
            ORDER BY w.created_at DESC
        `, [req.user.id]);
        res.json({ success: true, wishlist });
    } catch (err) {
        console.error("[GET /api/wishlist] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching wishlist" });
    }
});

// POST /api/wishlist/:productId (Add to Wishlist)
app.post("/api/wishlist/:productId", authMiddleware, async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    try {
        const [product] = await promiseDb.query("SELECT id FROM products WHERE id = ?", [productId]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        await promiseDb.query("INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)", [req.user.id, productId]);
        res.json({ success: true, message: "Added to wishlist", inWishlist: true });
    } catch (err) {
        console.error(`[POST /api/wishlist/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error adding to wishlist" });
    }
});

// DELETE /api/wishlist/:productId (Remove from Wishlist)
app.delete("/api/wishlist/:productId", authMiddleware, async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    try {
        await promiseDb.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user.id, productId]);
        res.json({ success: true, message: "Removed from wishlist", inWishlist: false });
    } catch (err) {
        console.error(`[DELETE /api/wishlist/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error removing from wishlist" });
    }
});

// GET /api/wishlist/check/:productId (Check if product is wishlisted)
app.get("/api/wishlist/check/:productId", authMiddleware, async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    try {
        const [rows] = await promiseDb.query("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user.id, productId]);
        res.json({ success: true, inWishlist: rows.length > 0 });
    } catch (err) {
        console.error(`[GET /api/wishlist/check/${productId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error checking wishlist" });
    }
});

// ==========================================
// PHASE 6: PRODUCT REVIEWS & RATINGS APIs
// ==========================================

// GET /api/products/:id/reviews (Public reviews list with rating breakdown)
app.get("/api/products/:id/reviews", async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    try {
        const [reviews] = await promiseDb.query(`
            SELECT r.id, r.product_id, r.user_id, r.rating, r.review, r.created_at, r.updated_at, u.name AS user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `, [productId]);

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
            : 0;

        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++;
        });

        res.json({
            success: true,
            reviews,
            stats: {
                averageRating,
                totalReviews,
                ratingCounts
            }
        });
    } catch (err) {
        console.error(`[GET /api/products/${productId}/reviews] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching reviews" });
    }
});

// GET /api/products/:id/review-eligibility (Check purchase verification & past review)
app.get("/api/products/:id/review-eligibility", authMiddleware, async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    try {
        const [purchases] = await promiseDb.query(`
            SELECT o.id AS order_id 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? AND oi.product_id = ? AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
            ORDER BY o.created_at DESC LIMIT 1
        `, [req.user.id, productId]);

        const hasPurchased = purchases.length > 0;
        const orderId = hasPurchased ? purchases[0].order_id : null;

        const [existingReview] = await promiseDb.query(
            "SELECT * FROM reviews WHERE user_id = ? AND product_id = ?",
            [req.user.id, productId]
        );

        res.json({
            success: true,
            canReview: hasPurchased && existingReview.length === 0,
            hasPurchased,
            alreadyReviewed: existingReview.length > 0,
            existingReview: existingReview[0] || null,
            orderId
        });
    } catch (err) {
        console.error(`[GET /api/products/${productId}/review-eligibility] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error checking review eligibility" });
    }
});

// POST /api/products/:id/reviews (Submit review - Verified purchasers only)
app.post("/api/products/:id/reviews", authMiddleware, async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { rating, review } = req.body;

    if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    if (!review || typeof review !== "string" || review.trim().length < 3 || review.trim().length > 1000) {
        return res.status(400).json({ success: false, message: "Review text must be between 3 and 1000 characters" });
    }

    try {
        // Verify customer purchased this product
        const [purchases] = await promiseDb.query(`
            SELECT o.id AS order_id 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'Cancelled'
            ORDER BY o.created_at DESC LIMIT 1
        `, [req.user.id, productId]);

        if (purchases.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You can only review eyewear you have purchased"
            });
        }

        const orderId = purchases[0].order_id;

        // Check if already reviewed
        const [existing] = await promiseDb.query(
            "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
            [req.user.id, productId]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this product. You can update your existing review."
            });
        }

        const [result] = await promiseDb.query(
            "INSERT INTO reviews (product_id, user_id, order_id, rating, review) VALUES (?, ?, ?, ?, ?)",
            [productId, req.user.id, orderId, parsedRating, review.trim()]
        );

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review_id: result.insertId
        });
    } catch (err) {
        console.error(`[POST /api/products/${productId}/reviews] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error submitting review" });
    }
});

// PUT /api/reviews/:id (Edit Review - Owner only)
app.put("/api/reviews/:id", authMiddleware, async (req, res) => {
    const reviewId = parseInt(req.params.id, 10);
    const { rating, review } = req.body;

    if (isNaN(reviewId) || reviewId <= 0) {
        return res.status(400).json({ success: false, message: "Valid review ID is required" });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    if (!review || typeof review !== "string" || review.trim().length < 3 || review.trim().length > 1000) {
        return res.status(400).json({ success: false, message: "Review text must be between 3 and 1000 characters" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT * FROM reviews WHERE id = ?", [reviewId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "You are not authorized to edit this review" });
        }

        await promiseDb.query("UPDATE reviews SET rating = ?, review = ? WHERE id = ?", [parsedRating, review.trim(), reviewId]);
        res.json({ success: true, message: "Review updated successfully" });
    } catch (err) {
        console.error(`[PUT /api/reviews/${reviewId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error updating review" });
    }
});

// DELETE /api/reviews/:id (Delete Review - Owner or Admin)
app.delete("/api/reviews/:id", authMiddleware, async (req, res) => {
    const reviewId = parseInt(req.params.id, 10);
    if (isNaN(reviewId) || reviewId <= 0) {
        return res.status(400).json({ success: false, message: "Valid review ID is required" });
    }

    try {
        const [existing] = await promiseDb.query("SELECT * FROM reviews WHERE id = ?", [reviewId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this review" });
        }

        await promiseDb.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
        res.json({ success: true, message: "Review deleted successfully" });
    } catch (err) {
        console.error(`[DELETE /api/reviews/${reviewId}] Error:`, err.message);
        res.status(500).json({ success: false, message: "Internal server error deleting review" });
    }
});

// GET /api/admin/reviews (Admin view all reviews)
app.get("/api/admin/reviews", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [reviews] = await promiseDb.query(`
            SELECT r.id, r.product_id, p.name AS product_name, r.user_id, u.name AS user_name, u.email AS user_email,
                   r.rating, r.review, r.created_at, r.updated_at
            FROM reviews r
            JOIN products p ON r.product_id = p.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json({ success: true, reviews });
    } catch (err) {
        console.error("[GET /api/admin/reviews] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error fetching admin reviews" });
    }
});

// ==========================================
// PHASE 6: PRESCRIPTION UPLOAD & RETRIEVAL APIs
// ==========================================

// POST /api/prescriptions/upload (Secure Base64 File Upload)
app.post("/api/prescriptions/upload", authMiddleware, async (req, res) => {
    const file_data = req.body.file_data || req.body.data;
    const file_name = req.body.file_name || req.body.filename;
    if (!file_data || typeof file_data !== "string" || !file_name) {
        return res.status(400).json({ success: false, message: "Valid file data and file name are required" });
    }

    const matches = file_data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
        return res.status(400).json({ success: false, message: "Invalid file format. Upload must be a valid base64 document or image." });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Content = matches[2];

    const ALLOWED_MIMES = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "application/pdf": "pdf"
    };

    if (!ALLOWED_MIMES[mimeType]) {
        return res.status(400).json({
            success: false,
            message: "Invalid file type. Only PDF, JPG, JPEG, and PNG files are accepted."
        });
    }

    const buffer = Buffer.from(base64Content, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: "File exceeds maximum permitted size of 5MB" });
    }

    const ext = ALLOWED_MIMES[mimeType];
    const safeFilename = `rx_${req.user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const uploadDir = process.env.PRESCRIPTION_UPLOAD_DIR || path.join(__dirname, "uploads", "prescriptions");

    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, safeFilename);
        fs.writeFileSync(filePath, buffer);

        res.status(201).json({
            success: true,
            message: "Prescription document uploaded successfully",
            file_url: `/api/prescriptions/file/${safeFilename}`,
            filePath: `/api/prescriptions/file/${safeFilename}`,
            file_name: safeFilename,
            originalName: file_name,
            mimeType
        });
    } catch (err) {
        console.error("[POST /api/prescriptions/upload] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error saving prescription document" });
    }
});

// GET /api/prescriptions/file/:filename (Secure Authorized File Access)
app.get("/api/prescriptions/file/:filename", authMiddleware, async (req, res) => {
    const filename = path.basename(req.params.filename);
    const uploadDir = process.env.PRESCRIPTION_UPLOAD_DIR || path.join(__dirname, "uploads", "prescriptions");
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Prescription document not found" });
    }

    if (req.user.role !== "admin") {
        const fileUrl = `/api/prescriptions/file/${filename}`;
        const [owned] = await promiseDb.query(
            "SELECT id FROM order_prescriptions WHERE user_id = ? AND prescription_file_url = ?",
            [req.user.id, fileUrl]
        );
        const isOwnerByPrefix = filename.startsWith(`rx_${req.user.id}_`);
        if (owned.length === 0 && !isOwnerByPrefix) {
            return res.status(403).json({ success: false, message: "You are not authorized to access this prescription document" });
        }
    }

    res.sendFile(filePath);
});

// Central 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found" });
});

// Central Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;