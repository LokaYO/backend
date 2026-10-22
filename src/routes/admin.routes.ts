import { Router } from 'express';
import { requireAuth, requireAdminOrSupport, requireAdminOnly } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Semua rute admin wajib lolos autentikasi dan ber-role admin atau support
router.use(requireAuth);
router.use(requireAdminOrSupport);

// Monitoring Users & Statistics (Bisa diakses Admin & Support)
router.get('/stats', asyncHandler(adminController.getStats));
router.get('/users', asyncHandler(adminController.getMonitoringUsers));
router.get('/users/:userId', asyncHandler(adminController.getUserDetails));

// Operasi Sensitif (Khusus Admin saja)
router.put('/users/:userId/role', requireAdminOnly, asyncHandler(adminController.updateUserRole));
router.delete('/users/:userId', requireAdminOnly, asyncHandler(adminController.deleteUser));

export default router;

