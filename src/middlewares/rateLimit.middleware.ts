import { rateLimit, MemoryStore, Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient, isRedisReady } from '../config/redis.js';

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
 * Membatasi maksimal 300 request per 15 menit per IP untuk melindungi seluruh API dari flooding/DDoS.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 300,
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
 * Maksimal 10 percobaan login / register per 15 menit per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('auth'),
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login/registrasi gagal. Demi keamanan akun, coba lagi setelah 15 menit.',
  },
});

/**
 * 3. AI Generation Rate Limiter (Gemini Quota Protection)
 * Maksimal 6 generasi website dengan Gemini AI per 10 menit per IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new AdaptiveRateLimitStore('ai'),
  message: {
    success: false,
    message: 'Batas pembuatan website dengan AI tercapai (maksimal 6x per 10 menit). Silakan istirahat sejenak.',
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
