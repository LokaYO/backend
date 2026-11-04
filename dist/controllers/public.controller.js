import * as websiteService from '../services/website.service.js';
export async function getPublicSite(req, res) {
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
export async function resolvePublicSite(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const hostParam = req.query.host ||
        req.headers['x-forwarded-host'] ||
        req.headers.host ||
        req.hostname;
    const rawHost = Array.isArray(hostParam) ? hostParam[0] : hostParam;
    const cleanHost = (rawHost || '').split(':')[0].toLowerCase(); // hapus port
    const parts = cleanHost.split('.');
    let slugCandidate = req.query.slug || '';
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
export async function trackPublicEvent(req, res) {
    const { slug } = req.params;
    const { type } = req.body;
    if (!type || !['view', 'whatsapp_click'].includes(type)) {
        res.status(400).json({ error: "Tipe event tracking harus 'view' atau 'whatsapp_click'." });
        return;
    }
    const result = await websiteService.trackPublicWebsiteEvent(slug, type);
    res.json(result);
}
export async function submitLead(req, res) {
    const { slug } = req.params;
    const { name, phone, message, serviceInterest } = req.body;
    if (!name || !phone || !message) {
        res.status(400).json({ error: 'Nama, nomor WhatsApp/telepon, dan pesan wajib diisi.' });
        return;
    }
    const result = await websiteService.createLead(slug, { name, phone, message, serviceInterest });
    res.json(result);
}
