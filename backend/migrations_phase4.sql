-- Phase 4 Migrations
-- 1. Safely update users role to VARCHAR(50) DEFAULT 'user'
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user';

-- 2. Migrate existing 'customer' roles to 'user'
UPDATE users SET role = 'user' WHERE role = 'customer' OR role IS NULL;

-- 3. Ensure orders table has proper status indexes and payment fields
ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'Pending';
