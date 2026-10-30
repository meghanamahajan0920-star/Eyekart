-- ============================================================
-- Phase 7 Database Migrations & Performance Hardening
-- ============================================================

-- Safe index optimizations on high-traffic order queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
