import pg from 'pg';
import crypto from 'node:crypto';
import { ENV } from './env.js';
import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';
const { Pool } = pg;
// Initialize PostgreSQL Connection Pool using discrete parameters (Tanpa URL)
export const pool = new Pool({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    ssl: ENV.DB_SSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error on idle client:', err);
});
export function hashPassword(password) {
    const salt = 'lokalsite_salt_2026';
    return crypto.scryptSync(password, salt, 32).toString('hex');
}
export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Translates ? placeholders to PostgreSQL $1, $2, $3 positional params.
 */
function formatSql(sql) {
    if (sql.includes('?')) {
        let index = 1;
        return sql.replace(/\?/g, () => `$${index++}`);
    }
    return sql;
}
export async function initSchema(client) {
    // Create tables if not exists
    await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      plan VARCHAR(20) NOT NULL DEFAULT 'free',
      subscription_until TIMESTAMPTZ NULL,
      last_login_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure columns exist if table was created in older schema
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ NULL;

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS websites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      template VARCHAR(100) NULL,
      business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
      theme JSONB NOT NULL DEFAULT '{}'::jsonb,
      views_count INTEGER NOT NULL DEFAULT 0,
      whatsapp_clicks_count INTEGER NOT NULL DEFAULT 0,
      suspend_reason TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE websites ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE websites ADD COLUMN IF NOT EXISTS whatsapp_clicks_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE websites ADD COLUMN IF NOT EXISTS suspend_reason TEXT NULL;

    CREATE TABLE IF NOT EXISTS sections (
      id VARCHAR(64) PRIMARY KEY,
      website_id VARCHAR(64) NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS system_announcements (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'info',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address VARCHAR(100) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
  `);
    // Safely seed or update default demo, admin, and support users
    const defaultHash = hashPassword('password123');
    try {
        // 1. Update old @lokalsite.id seed emails to @loka.id if present
        await client.query(`
      UPDATE users SET email = 'admin@loka.id' WHERE id = 'usr_admin_master' AND email = 'admin@lokalsite.id';
      UPDATE users SET email = 'support@loka.id' WHERE id = 'usr_support_01' AND email = 'support@lokalsite.id';
      UPDATE users SET email = 'demo@loka.id' WHERE id = 'usr_demo_12345' AND email = 'demo@lokalsite.id';
    `);
        // 2. Insert or update default users matching PRIMARY KEY (id)
        const seedUsers = [
            { id: 'usr_admin_master', name: 'Administrator LOKA', email: 'admin@loka.id', role: 'admin' },
            { id: 'usr_support_01', name: 'Support Team LOKA', email: 'support@loka.id', role: 'support' },
            { id: 'usr_demo_12345', name: 'Blackiee - Pemilik Usaha', email: 'demo@loka.id', role: 'user' },
        ];
        for (const u of seedUsers) {
            await client.query(`INSERT INTO users (id, name, email, password_hash, role, last_login_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role = EXCLUDED.role;`, [u.id, u.name, u.email, defaultHash, u.role]);
        }
    }
    catch (seedErr) {
        console.warn('⚠️ [Database Seed Notice]:', seedErr.message);
    }
    // Seed initial starter website if empty
    const siteRes = await client.query('SELECT count(*) as count FROM websites');
    if (parseInt(siteRes.rows[0].count, 10) === 0) {
        const starterTpl = PRESET_TEMPLATES[0]; // Kopi Senja
        const websiteId = 'site_kopi_senja_demo';
        const demoUserId = 'usr_demo_12345';
        await client.query(`INSERT INTO websites (id, user_id, name, slug, status, template, business_info, theme)
       VALUES ($1, $2, $3, $4, 'published', $5, $6, $7)`, [
            websiteId,
            demoUserId,
            starterTpl.name,
            'kopi-senja',
            starterTpl.id,
            JSON.stringify(starterTpl.businessInfo),
            JSON.stringify(starterTpl.theme),
        ]);
        for (let i = 0; i < starterTpl.sections.length; i++) {
            const s = starterTpl.sections[i];
            const sectionId = `sec_kopi_${i + 1}`;
            await client.query(`INSERT INTO sections (id, website_id, type, content, position) VALUES ($1, $2, $3, $4, $5)`, [sectionId, websiteId, s.type, JSON.stringify(s.content), i]);
        }
    }
}
export async function getDb() {
    try {
        const client = await pool.connect();
        try {
            await initSchema(client);
        }
        finally {
            client.release();
        }
        console.log(`🐘 PostgreSQL connected (No URL - Host: ${ENV.DB_HOST}:${ENV.DB_PORT}, Database: ${ENV.DB_NAME})`);
        return pool;
    }
    catch (err) {
        console.error('❌ Failed to connect to PostgreSQL database:', err.message);
        throw err;
    }
}
export async function queryAll(sql, params = []) {
    const formattedSql = formatSql(sql);
    const result = await pool.query(formattedSql, params);
    return result.rows;
}
export async function queryOne(sql, params = []) {
    const rows = await queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}
export async function execute(sql, params = []) {
    const formattedSql = formatSql(sql);
    return pool.query(formattedSql, params);
}
