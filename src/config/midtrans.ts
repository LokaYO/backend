import midtransClient from 'midtrans-client';
import { ENV } from './env.js';

// Midtrans Sandbox Environment Config
export const MIDTRANS_CONFIG = {
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-DemoKeyLoka2026Secure',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-DemoKeyLoka2026Public',
};

/**
 * Snap API Client instance for creating transactions and tokens
 */
export const snap = new midtransClient.Snap({
  isProduction: MIDTRANS_CONFIG.isProduction,
  serverKey: MIDTRANS_CONFIG.serverKey,
  clientKey: MIDTRANS_CONFIG.clientKey,
});

/**
 * Core API Client instance for checking status and refund
 */
export const coreApi = new midtransClient.CoreApi({
  isProduction: MIDTRANS_CONFIG.isProduction,
  serverKey: MIDTRANS_CONFIG.serverKey,
  clientKey: MIDTRANS_CONFIG.clientKey,
});

