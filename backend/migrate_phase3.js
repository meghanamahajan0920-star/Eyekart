require("dotenv").config();
const { promiseDb } = require("./db");

async function migrate() {
  console.log("Starting Phase 3 database migration...");
  const connection = await promiseDb.getConnection();

  try {
    // 1. Check & Add mobile to users
    const [userMobileCol] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mobile'
    `);
    if (userMobileCol.length === 0) {
      console.log("Adding mobile column to users table...");
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN mobile VARCHAR(20) NULL AFTER email,
        ADD UNIQUE INDEX uq_users_mobile (mobile)
      `);
      console.log("Added mobile column with unique index to users.");
    } else {
      console.log("mobile column already exists in users.");
    }

    // 2. Check & Add columns to orders table
    const [orderCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    `);
    const existingCols = orderCols.map(c => c.COLUMN_NAME.toLowerCase());

    if (!existingCols.includes('user_id')) {
      console.log("Adding user_id column to orders table...");
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN user_id INT NULL AFTER id,
        ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("Added user_id column with foreign key to orders.");
    } else {
      console.log("user_id column already exists in orders.");
    }

    if (!existingCols.includes('payment_status')) {
      console.log("Adding payment_status column to orders table...");
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_status VARCHAR(50) DEFAULT 'Pending' AFTER status
      `);
      console.log("Added payment_status column to orders.");
    } else {
      console.log("payment_status column already exists in orders.");
    }

    if (!existingCols.includes('payment_order_id')) {
      console.log("Adding payment_order_id column to orders table...");
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_order_id VARCHAR(100) NULL AFTER payment_status
      `);
      console.log("Added payment_order_id column to orders.");
    }

    if (!existingCols.includes('payment_id')) {
      console.log("Adding payment_id column to orders table...");
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_id VARCHAR(100) NULL AFTER payment_order_id
      `);
      console.log("Added payment_id column to orders.");
    }

    if (!existingCols.includes('payment_signature')) {
      console.log("Adding payment_signature column to orders table...");
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_signature VARCHAR(255) NULL AFTER payment_id
      `);
      console.log("Added payment_signature column to orders.");
    }

    console.log("Phase 3 migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
