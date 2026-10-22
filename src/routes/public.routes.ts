import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as publicController from '../controllers/public.controller.js';

const router = Router();

router.get('/sites/:slug', asyncHandler(publicController.getPublicSite));

export default router;

