import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { leadSubmissionLimiter } from '../middlewares/rateLimit.middleware.js';
import * as publicController from '../controllers/public.controller.js';
const router = Router();
// 1. Resolve melalui path slug: /api/public/sites/:slug
router.get('/sites/:slug', asyncHandler(publicController.getPublicSite));
// 1b. Server-Side OpenGraph Share HTML Renderer untuk Crawlers & Social Share: /api/public/sites/:slug/share
router.get('/sites/:slug/share', asyncHandler(publicController.renderSharePage));
// 2. Track event analitik publik (view & whatsapp_click)
router.post('/sites/:slug/track', asyncHandler(publicController.trackPublicEvent));
// 3. Form kontak / Buku Tamu Publik (Dilindungi Rate Limit Anti-Spam)
router.post('/sites/:slug/leads', leadSubmissionLimiter, asyncHandler(publicController.submitLead));
// 4. Resolve melalui Wildcard Subdomain Host (misal: kopi-senja.lokalsite.id -> slug "kopi-senja")
router.get('/resolve', asyncHandler(publicController.resolvePublicSite));
export default router;
