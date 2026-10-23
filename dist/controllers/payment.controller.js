import * as paymentService from '../services/payment.service.js';
export async function createSnapToken(req, res) {
    const { planType } = req.body;
    if (!planType || (planType !== 'pro_monthly' && planType !== 'pro_yearly')) {
        res.status(400).json({ error: "Tipe paket harus 'pro_monthly' atau 'pro_yearly'" });
        return;
    }
    const result = await paymentService.createSnapTransaction({
        userId: req.userId,
        planType,
    });
    res.status(201).json(result);
}
export async function handleNotification(req, res) {
    const notification = req.body;
    const result = await paymentService.handlePaymentNotification(notification);
    res.status(200).json(result);
}
export async function getSubscriptionStatus(req, res) {
    const status = await paymentService.getUserSubscription(req.userId);
    res.json(status);
}
export async function getTransactionHistory(req, res) {
    const transactions = await paymentService.getUserTransactions(req.userId);
    res.json({ transactions });
}
export async function simulateSuccess(req, res) {
    const { orderId } = req.body;
    if (!orderId) {
        res.status(400).json({ error: 'Order ID wajib disertakan' });
        return;
    }
    const result = await paymentService.simulateSuccessSandbox(req.userId, orderId);
    res.json(result);
}
export async function verifyPayment(req, res) {
    const orderId = req.params.orderId || req.body.orderId;
    if (!orderId) {
        res.status(400).json({ error: 'Order ID wajib disertakan' });
        return;
    }
    const result = await paymentService.verifyAndSyncPayment(req.userId, orderId);
    res.json(result);
}
