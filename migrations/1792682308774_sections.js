/**
 * Migration: Create sections table
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS sections (
      id VARCHAR(64) PRIMARY KEY,
      website_id VARCHAR(64) NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sections_website_id ON sections(website_id);
    CREATE INDEX IF NOT EXISTS idx_sections_website_pos ON sections(website_id, position);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS sections CASCADE;`);
};
