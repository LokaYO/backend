import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// 1. Webhook Notification dari Midtrans (Publik tanpa Auth token karena dipanggil server-to-server oleh Midtrans)
router.post('/notification', asyncHandler(paymentController.handleNotification));

// 2. Transaksi & Status Akun (Wajib Login)
router.post('/snap-token', requireAuth, asyncHandler(paymentController.createSnapToken));
router.get('/subscription', requireAuth, asyncHandler(paymentController.getSubscriptionStatus));
router.get('/transactions', requireAuth, asyncHandler(paymentController.getTransactionHistory));
router.post('/verify/:orderId', requireAuth, asyncHandler(paymentController.verifyPayment));
router.get('/verify/:orderId', requireAuth, asyncHandler(paymentController.verifyPayment));

// 3. Simulator Pembayaran Sukses Sandbox (Untuk Demo Praktis & Testing Kuliah)
router.post('/simulate-sandbox', requireAuth, asyncHandler(paymentController.simulateSuccess));

export default router;

