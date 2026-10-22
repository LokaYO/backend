import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as adminService from '../services/admin.service.js';

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

