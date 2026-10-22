/**
 * Migration: Create websites table
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS websites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      template VARCHAR(100) NULL,
      business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
      theme JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
    CREATE INDEX IF NOT EXISTS idx_websites_slug ON websites(slug);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS websites CASCADE;`);
};
