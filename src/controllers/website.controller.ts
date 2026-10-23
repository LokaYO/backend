import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as websiteService from '../services/website.service.js';

export async function listWebsites(req: AuthenticatedRequest, res: Response): Promise<void> {
  const websites = await websiteService.getUserWebsites(req.userId!);
  res.json({ websites });
}

export async function getWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const website = await websiteService.getWebsiteById(req.params.id, req.userId!);
  res.json({ website });
}

export async function createWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.createWebsite(req.userId!, req.body);
  res.json({ success: true, ...result });
}

export async function updateWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.updateWebsite(req.params.id, req.userId!, req.body);
  res.json(result);
}

export async function deleteWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.deleteWebsite(req.params.id, req.userId!);
  res.json(result);
}

export async function publishWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.publishWebsite(req.params.id, req.userId!);
  res.json(result);
}

export async function unpublishWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.unpublishWebsite(req.params.id, req.userId!);
  res.json(result);
}

export async function duplicateWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.duplicateWebsite(req.params.id, req.userId!);
  res.json(result);
}

export async function getWebsiteLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
  const leads = await websiteService.getWebsiteLeads(req.params.id, req.userId!);
  res.json({ leads });
}

export async function markLeadRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.markLeadRead(req.params.id, req.params.leadId, req.userId!);
  res.json(result);
}

export async function deleteLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await websiteService.deleteLead(req.params.id, req.params.leadId, req.userId!);
  res.json(result);
}

