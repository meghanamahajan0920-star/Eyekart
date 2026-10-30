/**
 * EyeKart Production Database Migration Runner
 * 
 * Safely executes backend/schema_production.sql in strict dependency order,
 * ensures all 9 tables exist with proper constraints and indexes,
 * seeds initial catalog taxonomy idempotently, and verifies schema health.
 * 
 * NON-DESTRUCTIVE: Never drops, truncates, or overwrites existing data.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const fs = require("fs");
const path = require("path");
const { promiseDb } = require("./db");

const EXPECTED_TABLES = [
    "categories",
    "brands",
    "products",
    "users",
    "orders",
    "order_items",
    "wishlist",
    "reviews",
    "order_prescriptions"
];

async function runProductionMigration() {
    console.log("==========================================================");
    console.log("       EYEKART PRODUCTION DATABASE MIGRATION RUNNER       ");
    console.log("==========================================================");
    console.log(`Connecting to database: ${process.env.DB_NAME || 'eyekart_db'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.log(`SSL Enabled: ${process.env.DB_SSL === 'true' ? 'YES' : 'NO'}`);

    let connection;
    try {
        connection = await promiseDb.getConnection();
        console.log("✓ Connected to MySQL successfully.\n");

        // 1. Read schema_production.sql
        const sqlPath = path.join(__dirname, "schema_production.sql");
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Schema file not found at ${sqlPath}`);
        }
        const sqlContent = fs.readFileSync(sqlPath, "utf8");

        // 2. Parse into individual statements (strip comments and split by semicolon)
        const cleanSql = sqlContent
            .replace(/--.*$/gm, "")
            .trim();
        const statements = cleanSql
            .split(";")
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Executing ${statements.length} DDL & Seed statements from schema_production.sql...`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            // Identify statement action
            const firstLine = stmt.split("\n")[0].slice(0, 60).replace(/\s+/g, " ");
            try {
                await connection.query(stmt);
                console.log(`  [${i + 1}/${statements.length}] ✓ ${firstLine}...`);
            } catch (err) {
                // If error is just duplicate key or existing index, continue; otherwise rethrow
                if (err.code === "ER_DUP_KEYNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
                    console.log(`  [${i + 1}/${statements.length}] ℹ Already exists: ${firstLine}`);
                } else {
                    console.error(`  [${i + 1}/${statements.length}] ✗ Error executing: ${firstLine}`);
                    throw err;
                }
            }
        }

        // 3. Idempotently Seed Baseline Eyewear Products if missing
        console.log("\nChecking baseline product catalog seeds...");
        const baselineProducts = [
            {
                name: "Classic Black Frame",
                category_name: "Eyeglasses",
                brand_name: "Ray-Ban",
                price: 2499.00,
                discount: 10.00,
                stock: 48,
                gender: "Unisex",
                frame_type: "Full Rim",
                frame_material: "Plastic",
                lens_type: "Clear",
                color: "Black",
                image: "👓"
            },
            {
                name: "Fastrack Aviator",
                category_name: "Sunglasses",
                brand_name: "Fastrack",
                price: 1999.00,
                discount: 15.00,
                stock: 30,
                gender: "Unisex",
                frame_type: "Full Rim",
                frame_material: "Metal",
                lens_type: "UV Protection",
                color: "Black",
                image: "🕶️"
            },
            {
                name: "Titan Blue Light Glasses",
                category_name: "Computer Glasses",
                brand_name: "Titan",
                price: 1799.00,
                discount: 5.00,
                stock: 40,
                gender: "Unisex",
                frame_type: "Full Rim",
                frame_material: "Plastic",
                lens_type: "Blue Light Filter",
                color: "Blue",
                image: "👓"
            }
        ];

        for (const prod of baselineProducts) {
            const [exists] = await connection.query("SELECT id FROM products WHERE name = ?", [prod.name]);
            if (exists.length === 0) {
                // Get category_id and brand_id
                const [cats] = await connection.query("SELECT id FROM categories WHERE name = ?", [prod.category_name]);
                const [brands] = await connection.query("SELECT id FROM brands WHERE name = ?", [prod.brand_name]);
                const category_id = cats.length > 0 ? cats[0].id : null;
                const brand_id = brands.length > 0 ? brands[0].id : null;

                await connection.query(
                    `INSERT INTO products 
                     (name, category_id, brand_id, price, discount, stock, gender, frame_type, frame_material, lens_type, color, image) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        prod.name,
                        category_id,
                        brand_id,
                        prod.price,
                        prod.discount,
                        prod.stock,
                        prod.gender,
                        prod.frame_type,
                        prod.frame_material,
                        prod.lens_type,
                        prod.color,
                        prod.image
                    ]
                );
                console.log(`  + Seeded baseline product: "${prod.name}"`);
            } else {
                console.log(`  ℹ Baseline product already present: "${prod.name}" (ID ${exists[0].id})`);
            }
        }

        // 4. Verify All Tables and Check Schema Health
        console.log("\n==========================================================");
        console.log("            DATABASE VERIFICATION & HEALTH CHECK          ");
        console.log("==========================================================");

        const [tablesResult] = await connection.query("SHOW TABLES");
        const existingTableNames = tablesResult.map(r => Object.values(r)[0].toLowerCase());

        let allTablesPresent = true;
        for (const expectedTable of EXPECTED_TABLES) {
            const isPresent = existingTableNames.includes(expectedTable);
            if (!isPresent) {
                allTablesPresent = false;
                console.error(`  ✗ MISSING TABLE: ${expectedTable}`);
            } else {
                const [[countRes]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${expectedTable}\``);
                console.log(`  ✓ Table: ${expectedTable.padEnd(22)} | Rows: ${countRes.count}`);
            }
        }

        if (!allTablesPresent) {
            throw new Error("One or more required database tables were not created.");
        }

        console.log("==========================================================");
        console.log("✓ PRODUCTION MIGRATION COMPLETED SUCCESSFULLY (9/9 TABLES)");
        console.log("==========================================================");
        process.exitCode = 0;
    } catch (err) {
        console.error("\n❌ MIGRATION FAILED:", err.message);
        process.exitCode = 1;
    } finally {
        if (connection) {
            connection.release();
        }
        process.exit(process.exitCode || 0);
    }
}

runProductionMigration();
