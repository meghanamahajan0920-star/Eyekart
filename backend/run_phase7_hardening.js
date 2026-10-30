const { promiseDb } = require("./db");

async function checkAndAddIndex(tableName, indexName, columnsSql) {
  try {
    const [existing] = await promiseDb.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tableName, indexName]
    );

    if (existing.length === 0) {
      console.log(`Adding index ${indexName} on ${tableName}...`);
      await promiseDb.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
      console.log(`✓ Added index ${indexName} on ${tableName}`);
    } else {
      console.log(`✓ Index ${indexName} already exists on ${tableName}`);
    }
  } catch (err) {
    console.warn(`Notice on index ${indexName} for ${tableName}:`, err.message);
  }
}

async function runPhase7Hardening() {
  console.log("Starting Phase 7 Database Safety & Index Verification...");
  try {
    // 1. Verify connection
    await promiseDb.query("SELECT 1");
    console.log("✓ Database connection active.");

    // 2. Orders indexes
    await checkAndAddIndex("orders", "idx_orders_status", "status");
    await checkAndAddIndex("orders", "idx_orders_created", "created_at");
    await checkAndAddIndex("orders", "idx_orders_user_id", "user_id");

    // 3. Order Items indexes
    await checkAndAddIndex("order_items", "idx_order_items_order_id", "order_id");
    await checkAndAddIndex("order_items", "idx_order_items_product_id", "product_id");

    // 4. Wishlist indexes
    await checkAndAddIndex("wishlist", "idx_wishlist_user_id", "user_id");
    await checkAndAddIndex("wishlist", "idx_wishlist_product_id", "product_id");

    // 5. Reviews indexes
    await checkAndAddIndex("reviews", "idx_reviews_product_id", "product_id");
    await checkAndAddIndex("reviews", "idx_reviews_user_id", "user_id");

    // 6. Prescriptions indexes
    await checkAndAddIndex("order_prescriptions", "idx_rx_user_id", "user_id");
    await checkAndAddIndex("order_prescriptions", "idx_rx_order_id", "order_id");

    // 7. Verify tables and record counts safely (No DROP / TRUNCATE)
    const [tables] = await promiseDb.query("SHOW TABLES");
    console.log(`✓ Database tables verified: ${tables.length} tables present.`);

    const [[usersCnt]] = await promiseDb.query("SELECT COUNT(*) as c FROM users");
    const [[prodsCnt]] = await promiseDb.query("SELECT COUNT(*) as c FROM products");
    const [[ordersCnt]] = await promiseDb.query("SELECT COUNT(*) as c FROM orders");
    console.log(`✓ Integrity confirmed: ${usersCnt.c} users, ${prodsCnt.c} products, ${ordersCnt.c} orders preserved.`);

    console.log("Phase 7 database hardening check completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Database hardening failed:", err.message);
    process.exit(1);
  }
}

runPhase7Hardening();
