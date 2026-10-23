import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as adminService from '../services/admin.service.js';
import * as announcementService from '../services/announcement.service.js';
import * as auditService from '../services/audit.service.js';

export async function getMonitoringUsers(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const users = await adminService.getAllUsersForMonitoring();
  res.json({ users });
}

export async function getUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = await adminService.getUserDetailsWithWebsites(req.params.userId);
  res.json(data);
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { role } = req.body;
  const result = await adminService.updateUserRole(req.params.userId, role);
  res.json(result);
}

export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await adminService.deleteUser(req.params.userId);
  res.json(result);
}

export async function getStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const stats = await adminService.getPlatformStats();
  res.json({ stats });
}

// ─── Moderasi Konten & Suspend Website ────────────────────────────────────────

export async function getModerationWebsites(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const websites = await adminService.getAllWebsitesForModeration();
  res.json({ websites });
}

export async function suspendWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { reason } = req.body;
  const result = await adminService.suspendWebsite(req.params.websiteId, reason, req.userId!);
  res.json(result);
}

export async function unsuspendWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await adminService.unsuspendWebsite(req.params.websiteId, req.userId!);
  res.json(result);
}

// ─── Broadcast Pengumuman Sistem ─────────────────────────────────────────────

export async function getAnnouncements(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const announcements = await announcementService.getAllAnnouncements();
  res.json({ announcements });
}

export async function createAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { title, message, type } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi' });
    return;
  }
  const created = await announcementService.createAnnouncement({
    title,
    message,
    type,
    userId: req.userId!,
  });
  res.status(201).json({ announcement: created });
}

export async function toggleAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  const isActive = await announcementService.toggleAnnouncement(req.params.id, req.userId!);
  res.json({ success: true, isActive });
}

export async function deleteAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  await announcementService.deleteAnnouncement(req.params.id, req.userId!);
  res.json({ success: true, message: 'Pengumuman berhasil dihapus' });
}

// ─── Log Aktivitas Sistem (Audit Trail) ───────────────────────────────────────

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const action = req.query.action as string | undefined;

  const result = await auditService.getAuditLogs(limit, offset, action);
  res.json(result);
}

// ─── Ekspor Data Laporan (Excel / CSV) ────────────────────────────────────────

export async function exportUsersCsv(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const csv = await adminService.generateUsersCsv();
  const filename = `laporan-pengguna-loka-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export async function exportWebsitesCsv(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const csv = await adminService.generateWebsitesCsv();
  const filename = `laporan-website-loka-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export async function exportAnalyticsCsv(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const csv = await adminService.generateAnalyticsCsv();
  const filename = `laporan-analitik-loka-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}


