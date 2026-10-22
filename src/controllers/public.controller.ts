import { Request, Response } from 'express';
import * as websiteService from '../services/website.service.js';

export async function getPublicSite(req: Request, res: Response): Promise<void> {
  const website = await websiteService.getPublicWebsiteBySlug(req.params.slug);
  res.json({ website });
}

