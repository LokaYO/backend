import { Request, Response } from 'express';
import * as websiteService from '../services/website.service.js';

export async function getPublicSite(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const website = await websiteService.getPublicWebsiteBySlug(req.params.slug);
  res.json({ website });
}

/**
 * Wildcard Host & Subdomain Resolver
 * Mengidentifikasi website client secara otomatis berdasarkan header Host (misal: "kopi-senja.lokalsite.id")
 * Berguna saat DNS registrar menggunakan wildcard CNAME / A Record: *.lokalsite.id
 */
export async function resolvePublicSite(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

export async function trackPublicEvent(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { type } = req.body;
  if (!type || !['view', 'whatsapp_click'].includes(type)) {
    res.status(400).json({ error: "Tipe event tracking harus 'view' atau 'whatsapp_click'." });
    return;
  }
  const result = await websiteService.trackPublicWebsiteEvent(slug, type);
  res.json(result);
}

export async function submitLead(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { name, phone, message, serviceInterest } = req.body;
  if (!name || !phone || !message) {
    res.status(400).json({ error: 'Nama, nomor WhatsApp/telepon, dan pesan wajib diisi.' });
    return;
  }
  const result = await websiteService.createLead(slug, { name, phone, message, serviceInterest });
  res.json(result);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Server-Side OpenGraph HTML Renderer untuk Social Media Crawlers (WhatsApp, Facebook, Twitter, Telegram, dll)
 * Mengembalikan HTML murni dengan meta tags lengkap yang langsung dibaca oleh bot crawler,
 * dan otomatis mengalihkan browser pengguna ke URL landing page frontend publik.
 */
export async function renderSharePage(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const targetSiteUrl = `https://ruuby.my.id/sites/${slug}`;

  try {
    const website = await websiteService.getPublicWebsiteBySlug(slug);
    if (!website) {
      res.redirect(targetSiteUrl);
      return;
    }

    const info = (website.businessInfo || {}) as any;
    const title = info.seoTitle || info.name || website.name || 'Website Resmi';
    const description =
      info.seoDescription ||
      info.tagline ||
      info.description ||
      'Katalog lengkap, galeri, dan pemesanan WhatsApp langsung.';
    const imageUrl = info.ogImageUrl || info.logo || '';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${targetSiteUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(info.name || website.name || 'LOKA')}" />
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ''}
  <meta http-equiv="refresh" content="0;url=${targetSiteUrl}" />
</head>
<body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
  <p>Mengalihkan ke <a href="${targetSiteUrl}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace("${targetSiteUrl}");</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(html);
  } catch (err) {
    res.redirect(targetSiteUrl);
  }
}
