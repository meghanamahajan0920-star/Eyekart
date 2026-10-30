const { promiseDb } = require("./db");

async function runMigration() {
  console.log("Running Phase 4 database migration...");
  try {
    // 1. Check current role column definition
    await promiseDb.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'");
    console.log("✓ Modified users.role to VARCHAR(50) DEFAULT 'user'");

    // 2. Update existing rows where role was 'customer' or NULL
    const [result] = await promiseDb.query("UPDATE users SET role = 'user' WHERE role = 'customer' OR role IS NULL");
    console.log(`✓ Updated ${result.affectedRows} users with role='customer' to role='user'`);

    // 3. Ensure orders columns
    await promiseDb.query("ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending'");
    await promiseDb.query("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'Pending'");
    console.log("✓ Verified orders status and payment_status columns");

    // 4. Verify users table
    const [users] = await promiseDb.query("SELECT id, name, email, role FROM users LIMIT 5");
    console.log("Current sample users:", users);

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
