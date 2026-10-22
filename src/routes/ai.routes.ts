import { Router } from 'express';
import { requireAuth, requireClientOnly } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

// AI Website Generator hanya untuk akun client 'user'
router.post('/generate-website', requireAuth, requireClientOnly, asyncHandler(aiController.generateWebsite));

export default router;
