import { rateLimit, MemoryStore, Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient, isRedisReady } from '../config/redis.js';
import { ENV } from '../config/env.js';

/**
 * Smart Adaptive Store
 * - Gunakan RedisStore jika Redis terhubung dan siap (mode Production / Docker).
 * - Otomatis fallback ke in-memory store jika Redis offline / tidak aktif (mode Local Dev / Windows).
 * - Tidak akan pernah melempar 'Stream isn't writeable' atau crash ke route handler.
 */
class AdaptiveRateLimitStore implements Store {
  private memoryStore: MemoryStore;
  private redisStore?: RedisStore;
  public prefix: string;
  private options?: any;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
  }

  init(options: any) {
    this.options = options;
    this.memoryStore.init(options);
  }

  private getRedisStore(): RedisStore | null {
    if (!isRedisReady()) {
      return null;
    }

    if (!this.redisStore) {
      try {
        this.redisStore = new RedisStore({
          // @ts-ignore ioredis call signature compatibility
          sendCommand: async (...args: string[]) => {
            if (!isRedisReady()) {
              throw new Error('Redis is not ready');
            }
            return await (redisClient as any).call(...args);
          },
          prefix: `loka:rl:${this.prefix}:`,
        });

        if (this.options && typeof this.redisStore.init === 'function') {
          this.redisStore.init(this.options);
        }
      } catch {
        this.redisStore = undefined;
        return null;
      }
    }

    return this.redisStore;
  }

  async increment(key: string) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.increment(key);
      } catch {
        return await this.memoryStore.increment(key);
      }
    }
    return await this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.decrement(key);
      } catch {
        return await this.memoryStore.decrement(key);
      }
    }
    return await this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.resetKey(key);
      } catch {
        return await this.memoryStore.resetKey(key);
      }
    }
    return await this.memoryStore.resetKey(key);
  }

  async get(key: string) {
    const rStore = this.getRedisStore();
    if (rStore && typeof rStore.get === 'function') {
      try {
        return await rStore.get(key);
      } catch {
        return await this.memoryStore.get(key);
      }
    }
    return await this.memoryStore.get(key);
  }
}

/**
 * 1. Global API Rate Limiter
 * Melindungi API dari flooding/DDoS.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: ENV.NODE_ENV === 'production' ? 500 : 5000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('global'),
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari perangkat Anda. Silakan coba kembali dalam 15 menit.',
  },
});

/**
 * 2. Auth & Login Rate Limiter (Brute-Force Protection)
 * - Hanya menghitung request yang GAGAL (skipSuccessfulRequests: true).
 * - Di mode development, batas diberikan 100x percobaan agar leluasa testing.
 */
export const authLimiter = rateLimit({
  windowMs: ENV.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1 * 60 * 1000,
  limit: ENV.NODE_ENV === 'production' ? 15 : 100,
  skipSuccessfulRequests: true, // Login berhasil TIDAK dihitung sebagai limit
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('auth'),
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login/registrasi gagal. Demi keamanan akun, coba lagi setelah beberapa saat.',
  },
});

/**
 * 3. AI Generation Rate Limiter (Gemini Quota Protection)
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: ENV.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('ai'),
  message: {
    success: false,
    message: 'Batas pembuatan website dengan AI tercapai. Silakan istirahat sejenak.',
  },
});

/**
 * 4. Leads / Guestbook Submission Rate Limiter
 * Mencegah bot spam pesan WhatsApp/Buku Tamu ke pemilik toko (maksimal 10 pesan per 5 menit).
 */
export const leadSubmissionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('leads'),
  message: {
    success: false,
    message: 'Pesan Anda sudah kami terima sebelumnya. Mohon tunggu beberapa menit sebelum mengirim pesan baru.',
  },
});
