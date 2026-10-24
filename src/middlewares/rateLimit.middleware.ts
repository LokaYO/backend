import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

/**
 * Helper to generate RedisStore if Redis is connected,
 * otherwise falls back to Express Rate Limit's default In-Memory store.
 */
function getRateLimitStore(prefix: string) {
  if (redisClient) {
    try {
      return new RedisStore({
        // @ts-ignore ioredis call signature compatibility
        sendCommand: (...args: string[]) => redisClient!.call(...args),
        prefix: `loka:rl:${prefix}:`,
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
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
  store: getRateLimitStore('global'),
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
  store: getRateLimitStore('auth'),
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
  store: getRateLimitStore('ai'),
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
  store: getRateLimitStore('leads'),
  message: {
    success: false,
    message: 'Pesan Anda sudah kami terima sebelumnya. Mohon tunggu beberapa menit sebelum mengirim pesan baru.',
  },
});

