const { promiseDb } = require("./db");

async function runPhase6Migration() {
  console.log("Running Phase 6 database migration...");
  try {
    // 1. Wishlist Table
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY user_product_unique (user_id, product_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ Wishlist table verified / created.");

    // 2. Reviews Table
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          user_id INT NOT NULL,
          order_id INT NULL,
          rating INT NOT NULL,
          review TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY user_product_review_unique (user_id, product_id),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      );
    `);
    console.log("✓ Reviews table verified / created.");

    // 3. Order Prescriptions Table
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS order_prescriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL UNIQUE,
          user_id INT NOT NULL,
          has_prescription BOOLEAN DEFAULT TRUE,
          right_sph VARCHAR(10) NULL,
          right_cyl VARCHAR(10) NULL,
          right_axis VARCHAR(10) NULL,
          left_sph VARCHAR(10) NULL,
          left_cyl VARCHAR(10) NULL,
          left_axis VARCHAR(10) NULL,
          pupillary_distance VARCHAR(10) NULL,
          prescription_file_url VARCHAR(255) NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ Order Prescriptions table verified / created.");

    console.log("Phase 6 migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Phase 6 migration failed:", err.message);
    process.exit(1);
  }
}

runPhase6Migration();
