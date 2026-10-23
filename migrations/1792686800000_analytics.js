/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE websites 
    ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS whatsapp_clicks_count INTEGER NOT NULL DEFAULT 0;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE websites 
    DROP COLUMN IF EXISTS views_count,
    DROP COLUMN IF EXISTS whatsapp_clicks_count;
  `);
};
