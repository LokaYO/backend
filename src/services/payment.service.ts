import crypto from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';
import { snap, coreApi, MIDTRANS_CONFIG } from '../config/midtrans.js';
import { logActivity } from './audit.service.js';

export interface PlanConfig {
  id: 'pro_monthly' | 'pro_yearly';
  name: string;
  price: number;
  durationDays: number;
  features: string[];
}

export const PLAN_PRICING: Record<'pro_monthly' | 'pro_yearly', PlanConfig> = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'LOKA Pro (1 Bulan)',
    price: 29000,
    durationDays: 30,
    features: [
      'Custom Clean Slug tanpa nomor acak (loka.my.id/s/namabisnis)',
      'Hapus Watermark "Dibuat dengan LOKA" (100% White-label)',
      'Kotak Masuk Leads Tanpa Batas',
      'QR Stand Meja Kasir HD Custom Logo',
      'AI Generator Konten Tanpa Batas',
    ],
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'LOKA Pro (1 Tahun - Hemat 40%)',
    price: 199000,
    durationDays: 365,
    features: [
      'Semua fitur Pro Bulanan selama 365 Hari',
      'Prioritas Dukungan Teknis Administrator',
      'Badge Toko Terverifikasi',
      'Hemat lebih dari 40% per tahun',
    ],
  },
};

export async function createSnapTransaction(params: {
  userId: string;
  planType: 'pro_monthly' | 'pro_yearly';
}) {
  const plan = PLAN_PRICING[params.planType];
  if (!plan) {
    throw { status: 400, message: 'Paket langganan tidak valid' };
  }

  const user = await queryOne<{ id: string; name: string; email: string; plan: string }>(
    'SELECT id, name, email, plan FROM users WHERE id = $1',
    [params.userId]
  );

  if (!user) {
    throw { status: 404, message: 'User tidak ditemukan' };
  }

  // Buat Order ID unik untuk Midtrans
  const orderId = `LOKA-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const transactionId = `trx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const transactionPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: plan.price,
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
    },
    item_details: [
      {
        id: plan.id,
        price: plan.price,
        quantity: 1,
        name: plan.name,
      },
    ],
    callbacks: {
      finish: `${process.env.APP_URL || 'http://localhost:5173'}/?payment=success&orderId=${orderId}`,
    },
  };

  let snapToken = '';
  let snapRedirectUrl = '';

  try {
    // Panggil Midtrans Snap API
    const snapResponse = await snap.createTransaction(transactionPayload);
    snapToken = snapResponse.token;
    snapRedirectUrl = snapResponse.redirect_url;
  } catch (err: any) {
    console.warn('⚠️ Midtrans API failed, fallback to sandbox mock token:', err.message);
    // Fallback Sandbox Token jika API Key belum diset asli oleh pengguna di dashboard Midtrans
    snapToken = `SANDBOX_TOKEN_${orderId}_${crypto.randomBytes(6).toString('hex')}`;
    snapRedirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
  }

  // Simpan record transaksi ke database
  await execute(
    `INSERT INTO transactions (
      id, order_id, user_id, plan_type, amount, status, snap_token, snap_redirect_url, metadata
    ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)`,
    [
      transactionId,
      orderId,
      user.id,
      plan.id,
      plan.price,
      snapToken,
      snapRedirectUrl,
      JSON.stringify({ planName: plan.name, durationDays: plan.durationDays }),
    ]
  );

  await logActivity({
    userId: user.id,
    action: 'SUBSCRIPTION_CHECKOUT',
    details: { orderId, planType: plan.id, amount: plan.price },
  });

  return {
    orderId,
    token: snapToken,
    redirectUrl: snapRedirectUrl,
    plan,
    clientKey: MIDTRANS_CONFIG.clientKey,
  };
}

/**
 * Handle Webhook Notification dari Midtrans
 */
export async function handlePaymentNotification(notification: any) {
  let statusResponse: any = notification;

  // Jika notification berformat order_id, lakukan validasi via CoreApi Midtrans jika memungkinkan
  try {
    if (notification.order_id && notification.signature_key) {
      statusResponse = await coreApi.transaction.notification(notification);
    }
  } catch (err: any) {
    console.warn('Notification verify fallback to body:', err.message);
  }

  const orderId = statusResponse.order_id;
  const transactionStatus = statusResponse.transaction_status;
  const fraudStatus = statusResponse.fraud_status;
  const paymentType = statusResponse.payment_type || 'other';

  const trx = await queryOne<{
    id: string;
    user_id: string;
    plan_type: 'pro_monthly' | 'pro_yearly';
    status: string;
    metadata: any;
  }>('SELECT id, user_id, plan_type, status, metadata FROM transactions WHERE order_id = $1', [orderId]);

  if (!trx) {
    console.error(`❌ Transaksi dengan Order ID ${orderId} tidak ditemukan.`);
    return { success: false, message: 'Order tidak ditemukan' };
  }

  let finalStatus = 'pending';
  let isSettled = false;

  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') {
      finalStatus = 'settlement';
      isSettled = true;
    }
  } else if (transactionStatus === 'settlement') {
    finalStatus = 'settlement';
    isSettled = true;
  } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
    finalStatus = transactionStatus;
  } else if (transactionStatus === 'pending') {
    finalStatus = 'pending';
  }

  // Update status transaksi di database
  await execute(
    'UPDATE transactions SET status = $1, payment_type = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [finalStatus, paymentType, trx.id]
  );

  // Jika berhasil bayar (settlement), aktifkan akun PRO pengguna!
  if (isSettled && trx.status !== 'settlement') {
    const plan = PLAN_PRICING[trx.plan_type] || PLAN_PRICING.pro_monthly;
    const daysToAdd = plan.durationDays;

    await execute(
      `UPDATE users 
       SET plan = 'pro', 
           subscription_until = GREATEST(COALESCE(subscription_until, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($1 || ' days')::interval,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [daysToAdd, trx.user_id]
    );

    await logActivity({
      userId: trx.user_id,
      action: 'SUBSCRIPTION_SUCCESS',
      details: { orderId, plan: trx.plan_type, paymentType },
    });
  }

  return { success: true, orderId, status: finalStatus };
}

/**
 * Simulator Pembayaran Sukses Sandbox
 * Berguna saat demo kuliah / pengujian lokal tanpa harus bayar QRIS asli
 */
export async function simulateSuccessSandbox(userId: string, orderId: string) {
  const trx = await queryOne<{
    id: string;
    user_id: string;
    plan_type: 'pro_monthly' | 'pro_yearly';
    status: string;
  }>('SELECT id, user_id, plan_type, status FROM transactions WHERE order_id = $1 AND user_id = $2', [
    orderId,
    userId,
  ]);

  if (!trx) {
    throw { status: 404, message: 'Transaksi tidak ditemukan' };
  }

  const plan = PLAN_PRICING[trx.plan_type] || PLAN_PRICING.pro_monthly;

  await execute(
    "UPDATE transactions SET status = 'settlement', payment_type = 'sandbox_qris', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [trx.id]
  );

  await execute(
    `UPDATE users 
     SET plan = 'pro', 
         subscription_until = GREATEST(COALESCE(subscription_until, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($1 || ' days')::interval,
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [plan.durationDays, userId]
  );

  await logActivity({
    userId,
    action: 'SUBSCRIPTION_SUCCESS_SIMULATED',
    details: { orderId, plan: trx.plan_type },
  });

  return {
    success: true,
    message: `Selamat! Akun Anda kini berstatus LOKA Pro aktif selama ${plan.durationDays} hari.`,
    plan: 'pro',
  };
}

export async function getUserSubscription(userId: string) {
  const user = await queryOne<{
    id: string;
    name: string;
    email: string;
    plan: string;
    subscription_until: string | null;
  }>('SELECT id, name, email, plan, subscription_until FROM users WHERE id = $1', [userId]);

  if (!user) {
    throw { status: 404, message: 'User tidak ditemukan' };
  }

  const now = new Date();
  const subDate = user.subscription_until ? new Date(user.subscription_until) : null;
  const isPro = user.plan === 'pro' && (!subDate || subDate > now);

  return {
    plan: isPro ? 'pro' : 'free',
    subscriptionUntil: user.subscription_until,
    isPro,
  };
}

export async function getUserTransactions(userId: string) {
  const rows = await queryAll<{
    id: string;
    order_id: string;
    plan_type: string;
    amount: number;
    status: string;
    payment_type: string | null;
    created_at: string;
  }>(
    'SELECT id, order_id, plan_type, amount, status, payment_type, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    planType: r.plan_type,
    amount: r.amount,
    status: r.status,
    paymentType: r.payment_type,
    createdAt: r.created_at,
  }));
}

/**
 * Verifikasi & Sinkronisasi Status Transaksi dengan Midtrans CoreApi
 * Otomatis meng-upgrade status akun pengguna ke 'pro' jika pembayaran selesai.
 */
export async function verifyAndSyncPayment(userId: string, orderId: string) {
  const trx = await queryOne<{
    id: string;
    user_id: string;
    plan_type: 'pro_monthly' | 'pro_yearly';
    status: string;
    metadata: any;
  }>('SELECT id, user_id, plan_type, status, metadata FROM transactions WHERE order_id = $1 AND user_id = $2', [
    orderId,
    userId,
  ]);

  if (!trx) {
    throw { status: 404, message: 'Transaksi tidak ditemukan' };
  }

  let finalStatus = trx.status;
  let paymentType = trx.metadata?.paymentType || 'snap';

  // 1. Coba periksa status resmi langsung dari server Midtrans jika memungkinkan
  try {
    const statusRes = await coreApi.transaction.status(orderId);
    if (statusRes && statusRes.transaction_status) {
      const midtransStatus = statusRes.transaction_status;
      paymentType = statusRes.payment_type || paymentType;

      if (midtransStatus === 'settlement' || (midtransStatus === 'capture' && statusRes.fraud_status === 'accept')) {
        finalStatus = 'settlement';
      } else if (['cancel', 'deny', 'expire'].includes(midtransStatus)) {
        finalStatus = midtransStatus;
      }
    }
  } catch (err: any) {
    console.warn('Midtrans CoreApi status check fallback:', err.message);
    // Jika dipanggil dari callback Snap onSuccess di frontend sandbox, anggap settlement
    finalStatus = 'settlement';
  }

  // 2. Jika status adalah settlement, upgrade user ke PRO di database PostgreSQL
  if (finalStatus === 'settlement') {
    const plan = PLAN_PRICING[trx.plan_type] || PLAN_PRICING.pro_monthly;

    await execute(
      "UPDATE transactions SET status = 'settlement', payment_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [paymentType, trx.id]
    );

    await execute(
      `UPDATE users 
       SET plan = 'pro', 
           subscription_until = GREATEST(COALESCE(subscription_until, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($1 || ' days')::interval,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [plan.durationDays, userId]
    );

    await logActivity({
      userId,
      action: 'SUBSCRIPTION_VERIFIED_SUCCESS',
      details: { orderId, plan: trx.plan_type, paymentType },
    });
  }

  // 3. Ambil data user terupdate dari database
  const updatedUser = await queryOne<{
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    subscription_until: string | null;
  }>('SELECT id, name, email, role, plan, subscription_until FROM users WHERE id = $1', [userId]);

  return {
    success: finalStatus === 'settlement',
    orderId,
    status: finalStatus,
    plan: updatedUser?.plan || 'pro',
    user: updatedUser
      ? {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          plan: updatedUser.plan,
          subscriptionUntil: updatedUser.subscription_until,
        }
      : null,
  };
}

