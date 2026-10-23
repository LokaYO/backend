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
// Moderasi Konten & Suspend Website
router.get('/websites', asyncHandler(adminController.getModerationWebsites));
router.post('/websites/:websiteId/suspend', requireAdminOnly, asyncHandler(adminController.suspendWebsite));
router.post('/websites/:websiteId/unsuspend', requireAdminOnly, asyncHandler(adminController.unsuspendWebsite));
// Broadcast Pengumuman Sistem
router.get('/announcements', asyncHandler(adminController.getAnnouncements));
router.post('/announcements', requireAdminOnly, asyncHandler(adminController.createAnnouncement));
router.patch('/announcements/:id/toggle', requireAdminOnly, asyncHandler(adminController.toggleAnnouncement));
router.delete('/announcements/:id', requireAdminOnly, asyncHandler(adminController.deleteAnnouncement));
// Log Aktivitas Sistem (Audit Trail)
router.get('/audit-logs', asyncHandler(adminController.getAuditLogs));
// Ekspor Data Laporan (Excel / CSV)
router.get('/export/users', asyncHandler(adminController.exportUsersCsv));
router.get('/export/websites', asyncHandler(adminController.exportWebsitesCsv));
router.get('/export/analytics', asyncHandler(adminController.exportAnalyticsCsv));
export default router;
