import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as sectionService from '../services/section.service.js';

export async function addSection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { type, content } = req.body;
  const section = await sectionService.addSection(req.params.id, req.userId!, type, content);
  res.json({ success: true, section });
}

export async function updateSection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { content } = req.body;
  const result = await sectionService.updateSection(req.params.id, req.params.sectionId, req.userId!, content);
  res.json(result);
}

export async function deleteSection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await sectionService.deleteSection(req.params.id, req.params.sectionId, req.userId!);
  res.json(result);
}

export async function reorderSections(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { sectionIds } = req.body;
  const result = await sectionService.reorderSections(req.params.id, req.userId!, sectionIds);
  res.json(result);
}

