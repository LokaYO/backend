import { Request, Response } from 'express';
import * as websiteService from '../services/website.service.js';

export async function getPublicSite(req: Request, res: Response): Promise<void> {
  const website = await websiteService.getPublicWebsiteBySlug(req.params.slug);
  res.json({ website });
}

/**
 * Wildcard Host & Subdomain Resolver
 * Mengidentifikasi website client secara otomatis berdasarkan header Host (misal: "kopi-senja.lokalsite.id")
 * Berguna saat DNS registrar menggunakan wildcard CNAME / A Record: *.lokalsite.id
 */
export async function resolvePublicSite(req: Request, res: Response): Promise<void> {
  const hostParam =
    (req.query.host as string) ||
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    req.hostname;

  const rawHost = Array.isArray(hostParam) ? hostParam[0] : hostParam;
  const cleanHost = (rawHost || '').split(':')[0].toLowerCase(); // hapus port

  const parts = cleanHost.split('.');
  let slugCandidate = (req.query.slug as string) || '';

  if (!slugCandidate && parts.length >= 2) {
    const isLocalhostSubdomain = parts.length === 2 && parts[1] === 'localhost';
    const isDomainSubdomain = parts.length >= 3;

    if (isLocalhostSubdomain || isDomainSubdomain) {
      const sub = parts[0];
      // Abaikan subdomain sistem internal
      if (!['www', 'api', 'admin', 'app', 'cdn', 'mail', 'localhost'].includes(sub)) {
        slugCandidate = sub;
      }
    }
  }

  if (!slugCandidate) {
    res.status(400).json({
      error: 'Tidak dapat mengidentifikasi slug atau subdomain website dari Host yang diberikan.',
    });
    return;
  }

  const website = await websiteService.getPublicWebsiteBySlug(slugCandidate);
  res.json({ website, resolvedSlug: slugCandidate, host: cleanHost });
}
