/**
 * Migration: Add plan & subscription to users, and create transactions table
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    -- 1. Tambah plan & subscription_until pada tabel users
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ NULL;

    -- 2. Buat tabel transactions untuk mencatat transaksi Midtrans
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(100) UNIQUE NOT NULL,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_type VARCHAR(50) NULL,
      snap_token TEXT NULL,
      snap_redirect_url TEXT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS transactions CASCADE;
    ALTER TABLE users
      DROP COLUMN IF EXISTS subscription_until,
      DROP COLUMN IF EXISTS plan;
  `);
};
