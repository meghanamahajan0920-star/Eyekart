/**
 * Phase 8 Database Migration Runner
 * Safe, idempotent migration for product_variants and order_items enhancements
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { promiseDb } = require('./db');

async function runPhase8Migration() {
    console.log('--- STARTING PHASE 8 MIGRATIONS (Product Color Variants & Orders) ---');

    // 1. Create product_variants table
    console.log('[Step 1] Ensuring product_variants table exists...');
    await promiseDb.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            color_name VARCHAR(100) NOT NULL,
            color_code VARCHAR(50) NOT NULL DEFAULT '#000000',
            image VARCHAR(500) NOT NULL,
            thumbnail VARCHAR(500) NULL,
            stock INT DEFAULT 25,
            price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_product_variants_product (product_id),
            CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ product_variants table verified.');

    // 2. Safely add columns to order_items if not present
    console.log('[Step 2] Checking order_items columns for color variants...');
    const [columns] = await promiseDb.query("SHOW COLUMNS FROM order_items");
    const colNames = columns.map(c => c.Field.toLowerCase());

    if (!colNames.includes('selected_color')) {
        await promiseDb.query("ALTER TABLE order_items ADD COLUMN selected_color VARCHAR(100) NULL AFTER quantity");
        console.log('✓ Added selected_color to order_items.');
    } else {
        console.log('✓ selected_color already exists in order_items.');
    }

    if (!colNames.includes('selected_image')) {
        await promiseDb.query("ALTER TABLE order_items ADD COLUMN selected_image VARCHAR(500) NULL AFTER selected_color");
        console.log('✓ Added selected_image to order_items.');
    } else {
        console.log('✓ selected_image already exists in order_items.');
    }

    if (!colNames.includes('variant_id')) {
        await promiseDb.query("ALTER TABLE order_items ADD COLUMN variant_id INT NULL AFTER selected_image");
        console.log('✓ Added variant_id to order_items.');
    } else {
        console.log('✓ variant_id already exists in order_items.');
    }

    console.log('--- PHASE 8 MIGRATIONS COMPLETED SUCCESSFULLY ---');
    process.exit(0);
}

runPhase8Migration().catch(err => {
    console.error('Phase 8 Migration Error:', err);
    process.exit(1);
});
