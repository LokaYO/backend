import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as publicController from '../controllers/public.controller.js';

const router = Router();

// 1. Resolve melalui path slug: /api/public/sites/:slug
router.get('/sites/:slug', asyncHandler(publicController.getPublicSite));

// 2. Resolve melalui Wildcard Subdomain Host (misal: kopi-senja.lokalsite.id -> slug "kopi-senja")
router.get('/resolve', asyncHandler(publicController.resolvePublicSite));

export default router;
