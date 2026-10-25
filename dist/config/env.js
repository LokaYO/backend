import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ENV = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    // PostgreSQL Connection Parameters (Tanpa URL)
    DB_HOST: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432),
    DB_USER: process.env.DB_USER || process.env.PGUSER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
    DB_NAME: process.env.DB_NAME || process.env.PGDATABASE || 'loka',
    DB_SSL: process.env.DB_SSL === 'true',
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'lokalsite_secret_jwt_key_2026_secure',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    // App & Public URLs
    APP_URL: process.env.APP_URL || '',
    // Redis Configuration
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    REDIS_URL: process.env.REDIS_URL || undefined,
    REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false',
};
