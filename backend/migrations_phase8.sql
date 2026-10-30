-- Phase 8 Migrations: Product Color Variants & Order Line Items Enhancement
-- Execution is idempotent

-- 1. Create product_variants table
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

-- 2. Add selected_color, selected_image, variant_id to order_items if they do not exist
-- (Handled safely in JavaScript migration script via column checks)
