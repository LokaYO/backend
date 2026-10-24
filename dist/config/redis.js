import Redis from 'ioredis';
import { ENV } from './env.js';
let redisClient = null;
let isRedisConnected = false;
if (ENV.REDIS_ENABLED) {
    try {
        const options = {
            host: ENV.REDIS_HOST,
            port: ENV.REDIS_PORT,
            password: ENV.REDIS_PASSWORD,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                // Retry up to 3 times, then back off without spamming
                if (times > 3) {
                    return null; // Stop retrying automatically to avoid blocking
                }
                return Math.min(times * 1000, 3000);
            },
            enableOfflineQueue: false,
        };
        redisClient = ENV.REDIS_URL ? new Redis(ENV.REDIS_URL, options) : new Redis(options);
        redisClient.on('connect', () => {
            isRedisConnected = true;
            console.log('⚡ [Redis] Terhubung ke Redis Cache Server');
        });
        redisClient.on('ready', () => {
            isRedisConnected = true;
        });
        redisClient.on('error', (err) => {
            isRedisConnected = false;
            // Log informative warning only once or concisely without spamming
            if (err.code === 'ECONNREFUSED') {
                // Connection refused - Redis server is not running locally
            }
            else {
                console.warn('⚠️ [Redis Error]:', err.message);
            }
        });
        redisClient.on('close', () => {
            isRedisConnected = false;
        });
        // Attempt non-blocking connection
        redisClient.connect().catch(() => {
            console.log('ℹ️ [Redis] Server Redis tidak terdeteksi di localhost:6379. Mode fallback aktif (Database Langsung).');
        });
    }
    catch (err) {
        console.warn('⚠️ [Redis Init Warning]:', err.message);
        redisClient = null;
    }
}
/**
 * Mendapatkan nilai dari cache Redis
 */
export async function cacheGet(key) {
    if (!redisClient || !isRedisConnected)
        return null;
    try {
        const data = await redisClient.get(key);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
/**
 * Menyimpan nilai ke cache Redis dengan durasi TTL (detik)
 * Default TTL: 300 detik (5 menit)
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
    if (!redisClient || !isRedisConnected)
        return;
    try {
        const serialized = JSON.stringify(value);
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
    }
    catch {
        // Fail silently so database operations proceed smoothly
    }
}
/**
 * Menghapus cache berdasarkan key spesifik
 */
export async function cacheDel(key) {
    if (!redisClient || !isRedisConnected)
        return;
    try {
        await redisClient.del(key);
    }
    catch {
        // Fail silently
    }
}
/**
 * Menghapus kumpulan cache berdasarkan pattern (misal: 'site:*')
 */
export async function cacheDelPattern(pattern) {
    if (!redisClient || !isRedisConnected)
        return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
            await redisClient.del(...keys);
        }
    }
    catch {
        // Fail silently
    }
}
/**
 * Atomic Increment (Sangat cepat untuk views & clicks counter)
 */
export async function cacheIncr(key) {
    if (!redisClient || !isRedisConnected)
        return null;
    try {
        return await redisClient.incr(key);
    }
    catch {
        return null;
    }
}
export { redisClient, isRedisConnected };
