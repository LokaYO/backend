/**
 * Migration: Create leads table for customer inquiries / guestbook
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR(64) PRIMARY KEY,
      website_id VARCHAR(64) NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      service_interest VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'unread',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_website_id ON leads(website_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS leads CASCADE;`);
};
