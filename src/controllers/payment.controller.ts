import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as paymentService from '../services/payment.service.js';

export async function createSnapToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { planType } = req.body;
  if (!planType || (planType !== 'pro_monthly' && planType !== 'pro_yearly')) {
    res.status(400).json({ error: "Tipe paket harus 'pro_monthly' atau 'pro_yearly'" });
    return;
  }

  const result = await paymentService.createSnapTransaction({
    userId: req.userId!,
    planType,
  });

  res.status(201).json(result);
}

export async function handleNotification(req: Request, res: Response): Promise<void> {
  const notification = req.body;
  const result = await paymentService.handlePaymentNotification(notification);
  res.status(200).json(result);
}

export async function getSubscriptionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const status = await paymentService.getUserSubscription(req.userId!);
  res.json(status);
}

export async function getTransactionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const transactions = await paymentService.getUserTransactions(req.userId!);
  res.json({ transactions });
}

export async function simulateSuccess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ error: 'Order ID wajib disertakan' });
    return;
  }

  const result = await paymentService.simulateSuccessSandbox(req.userId!, orderId);
  res.json(result);
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const orderId = req.params.orderId || req.body.orderId;
  if (!orderId) {
    res.status(400).json({ error: 'Order ID wajib disertakan' });
    return;
  }

  const result = await paymentService.verifyAndSyncPayment(req.userId!, orderId);
  res.json(result);
}

