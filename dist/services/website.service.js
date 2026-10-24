import crypto, { randomUUID } from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';
import { getUniqueSlug } from '../utils/slugify.js';
import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';
import { logActivity } from './audit.service.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../config/redis.js';
function parseJsonSafe(val, fallback = {}) {
    if (!val)
        return fallback;
    if (typeof val === 'object')
        return val;
    try {
        return JSON.parse(val);
    }
    catch {
        return fallback;
    }
}
export async function getUserWebsites(userId) {
    const websites = await queryAll(`SELECT w.*, 
      (SELECT count(*) FROM sections s WHERE s.website_id = w.id) as section_count 
     FROM websites w 
     WHERE w.user_id = ? 
     ORDER BY w.updated_at DESC`, [userId]);
    return websites.map((w) => ({
        id: w.id,
        userId: w.user_id,
        name: w.name,
        slug: w.slug,
        status: w.status,
        template: w.template,
        businessInfo: parseJsonSafe(w.business_info),
        theme: parseJsonSafe(w.theme),
        sectionCount: parseInt(w.section_count, 10) || 0,
        viewsCount: parseInt(w.views_count, 10) || 0,
        whatsappClicksCount: parseInt(w.whatsapp_clicks_count, 10) || 0,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
    }));
}
export async function getWebsiteById(websiteId, userId) {
    const website = await queryOne('SELECT * FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan atau bukan milik Anda' };
    }
    const sections = await queryAll('SELECT * FROM sections WHERE website_id = ? ORDER BY position ASC', [website.id]);
    const formattedSections = sections.map((s) => ({
        id: s.id,
        websiteId: s.website_id,
        type: s.type,
        position: s.position,
        content: parseJsonSafe(s.content),
        createdAt: s.created_at,
        updatedAt: s.updated_at,
    }));
    return {
        id: website.id,
        userId: website.user_id,
        name: website.name,
        slug: website.slug,
        status: website.status,
        template: website.template,
        businessInfo: parseJsonSafe(website.business_info),
        theme: parseJsonSafe(website.theme),
        viewsCount: parseInt(website.views_count, 10) || 0,
        whatsappClicksCount: parseInt(website.whatsapp_clicks_count, 10) || 0,
        createdAt: website.created_at,
        updatedAt: website.updated_at,
        sections: formattedSections,
    };
}
export async function createWebsite(userId, data) {
    const { name, templateId, businessInfo, theme, sections } = data;
    if (!name) {
        throw { status: 400, message: 'Nama website wajib diisi' };
    }
    const websiteId = `site_${crypto.randomUUID()}`;
    // Check user plan: Jika free, otomatis tambahkan 4 digit angka acak unik di slug
    const user = await queryOne('SELECT plan, role FROM users WHERE id = ?', [userId]);
    const isPro = user?.plan === 'pro' || user?.role === 'admin';
    let rawSlugName = name;
    if (!isPro) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        rawSlugName = `${name}-${randomSuffix}`;
    }
    const slug = await getUniqueSlug(rawSlugName);
    let chosenBusinessInfo = businessInfo || {
        name,
        category: 'Bisnis Lokal',
        description: 'Landing page profesional untuk usaha lokal.',
        location: 'Indonesia',
        whatsapp: '6281234567890',
    };
    let chosenTheme = theme || {
        primaryColor: '#2563eb',
        secondaryColor: '#0f172a',
        font: 'sans',
    };
    let initialSections = [];
    if (templateId) {
        const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
        if (template) {
            if (template.isPro && !isPro) {
                throw {
                    status: 403,
                    message: `Template "${template.name}" merupakan template eksklusif LOKA PRO. Silakan upgrade paket akun Anda untuk menggunakan template ini.`,
                };
            }
            chosenBusinessInfo = template.businessInfo;
            chosenTheme = template.theme;
            initialSections = template.sections;
        }
    }
    else if (sections && Array.isArray(sections)) {
        initialSections = sections;
    }
    await execute(`INSERT INTO websites (id, user_id, name, slug, status, template, business_info, theme) 
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`, [websiteId, userId, name, slug, templateId || null, JSON.stringify(chosenBusinessInfo), JSON.stringify(chosenTheme)]);
    for (let i = 0; i < initialSections.length; i++) {
        const s = initialSections[i];
        const sectionId = `sec_${crypto.randomUUID()}`;
        await execute('INSERT INTO sections (id, website_id, type, content, position) VALUES (?, ?, ?, ?, ?)', [sectionId, websiteId, s.type, JSON.stringify(s.content), i]);
    }
    await logActivity({
        userId,
        action: 'WEBSITE_CREATE',
        details: { websiteId, name, slug },
    });
    return { websiteId, slug };
}
export async function updateWebsite(websiteId, userId, data) {
    const { name, slug, theme, businessInfo } = data;
    const existing = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!existing) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    let finalSlug = slug;
    if (slug) {
        const user = await queryOne('SELECT plan FROM users WHERE id = ?', [userId]);
        const isPro = user?.plan === 'pro';
        let candidateSlug = slug;
        // Jika belum Pro dan slug belum berakhiran 4 digit angka acak, tambahkan suffix
        if (!isPro && !/-\d{4}$/.test(candidateSlug)) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            candidateSlug = `${candidateSlug}-${randomSuffix}`;
        }
        finalSlug = await getUniqueSlug(candidateSlug, websiteId);
    }
    await execute(`UPDATE websites 
     SET name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         theme = COALESCE(?, theme),
         business_info = COALESCE(?, business_info),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`, [
        name || null,
        finalSlug || null,
        theme ? JSON.stringify(theme) : null,
        businessInfo ? JSON.stringify(businessInfo) : null,
        websiteId,
        userId,
    ]);
    // Invalidate Redis Cache
    if (finalSlug) {
        await cacheDel(`site:public:${finalSlug}`);
    }
    await cacheDelPattern(`site:public:*`);
    return { success: true, message: 'Website berhasil diperbarui', slug: finalSlug };
}
export async function deleteWebsite(websiteId, userId) {
    const existing = await queryOne('SELECT id, slug FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!existing) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    await execute('DELETE FROM sections WHERE website_id = ?', [websiteId]);
    await execute('DELETE FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    // Invalidate Redis Cache
    if (existing.slug) {
        await cacheDel(`site:public:${existing.slug}`);
    }
    return { success: true, message: 'Website berhasil dihapus' };
}
export async function publishWebsite(websiteId, userId) {
    const website = await queryOne('SELECT slug, status, name FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    if (website.status === 'suspended') {
        throw {
            status: 403,
            message: 'Website ini telah ditangguhkan oleh Administrator. Silakan hubungi tim support untuk pemulihan.',
        };
    }
    await execute("UPDATE websites SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [websiteId]);
    // Invalidate Redis Cache so latest published version is served
    await cacheDel(`site:public:${website.slug}`);
    await logActivity({
        userId,
        action: 'WEBSITE_PUBLISH',
        details: { websiteId, slug: website.slug, name: website.name },
    });
    return { success: true, status: 'published', slug: website.slug };
}
export async function unpublishWebsite(websiteId, userId) {
    const website = await queryOne('SELECT slug, name FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    await execute("UPDATE websites SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [websiteId]);
    // Invalidate Redis Cache
    await cacheDel(`site:public:${website.slug}`);
    await logActivity({
        userId,
        action: 'WEBSITE_UNPUBLISH',
        details: { websiteId, slug: website.slug, name: website.name },
    });
    return { success: true, status: 'draft' };
}
export async function getPublicWebsiteBySlug(slug) {
    const cacheKey = `site:public:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return cached;
    }
    const website = await queryOne(`SELECT w.*, u.plan as owner_plan 
     FROM websites w 
     LEFT JOIN users u ON u.id = w.user_id 
     WHERE w.slug = ?`, [slug]);
    if (!website) {
        throw { status: 404, message: 'Halaman landing page tidak ditemukan.' };
    }
    if (website.status !== 'published') {
        if (website.status === 'suspended') {
            throw {
                status: 403,
                message: 'Website ini telah ditangguhkan (suspended) oleh Administrator karena melanggar ketentuan layanan.',
                isSuspended: true,
                suspendReason: website.suspend_reason || 'Melanggar ketentuan layanan platform LOKA.',
            };
        }
        throw {
            status: 403,
            message: 'Website ini belum dipublikasikan oleh pemiliknya (Masih berstatus Draft).',
            isDraft: true,
        };
    }
    const sections = await queryAll('SELECT * FROM sections WHERE website_id = ? ORDER BY position ASC', [website.id]);
    const result = {
        id: website.id,
        name: website.name,
        slug: website.slug,
        status: website.status,
        ownerPlan: website.owner_plan || 'free',
        businessInfo: parseJsonSafe(website.business_info),
        theme: parseJsonSafe(website.theme),
        viewsCount: parseInt(website.views_count, 10) || 0,
        whatsappClicksCount: parseInt(website.whatsapp_clicks_count, 10) || 0,
        sections: sections.map((s) => ({
            id: s.id,
            type: s.type,
            position: s.position,
            content: parseJsonSafe(s.content),
        })),
    };
    // Cache for 10 minutes (600 seconds) in Redis
    await cacheSet(cacheKey, result, 600);
    return result;
}
export async function trackPublicWebsiteEvent(slug, type) {
    if (type === 'view') {
        await execute('UPDATE websites SET views_count = views_count + 1 WHERE slug = ?', [slug]);
    }
    else if (type === 'whatsapp_click') {
        await execute('UPDATE websites SET whatsapp_clicks_count = whatsapp_clicks_count + 1 WHERE slug = ?', [slug]);
    }
    return { success: true, slug, tracked: type };
}
export async function duplicateWebsite(websiteId, userId) {
    const original = await queryOne('SELECT * FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!original) {
        throw { status: 404, message: 'Website asli tidak ditemukan' };
    }
    const sections = await queryAll('SELECT type, content, position FROM sections WHERE website_id = ? ORDER BY position ASC', [websiteId]);
    const newWebsiteId = `web_${randomUUID()}`;
    const shortRand = Math.random().toString(36).substring(2, 6);
    let baseSlug = `${original.slug}-copy-${shortRand}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    // Verify slug uniqueness
    const existingSlug = await queryOne('SELECT id FROM websites WHERE slug = ?', [baseSlug]);
    if (existingSlug) {
        baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }
    const newName = `${original.name} (Salinan)`;
    await execute(`INSERT INTO websites (id, user_id, name, slug, status, template, business_info, theme, views_count, whatsapp_clicks_count) 
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, 0, 0)`, [
        newWebsiteId,
        userId,
        newName,
        baseSlug,
        original.template || 'custom',
        typeof original.business_info === 'string' ? original.business_info : JSON.stringify(original.business_info || {}),
        typeof original.theme === 'string' ? original.theme : JSON.stringify(original.theme || {}),
    ]);
    for (const sec of sections) {
        const newSecId = `sec_${randomUUID()}`;
        await execute('INSERT INTO sections (id, website_id, type, content, position) VALUES (?, ?, ?, ?, ?)', [
            newSecId,
            newWebsiteId,
            sec.type,
            typeof sec.content === 'string' ? sec.content : JSON.stringify(sec.content || {}),
            sec.position,
        ]);
    }
    return {
        success: true,
        message: 'Website berhasil diduplikasi',
        websiteId: newWebsiteId,
        slug: baseSlug,
        name: newName,
    };
}
export async function createLead(slug, leadData) {
    const website = await queryOne('SELECT id FROM websites WHERE slug = ?', [slug]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    const leadId = `lead_${randomUUID()}`;
    await execute(`INSERT INTO leads (id, website_id, name, phone, message, service_interest, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'unread')`, [
        leadId,
        website.id,
        leadData.name.trim(),
        leadData.phone.trim(),
        leadData.message.trim(),
        leadData.serviceInterest?.trim() || null,
    ]);
    return { success: true, message: 'Pesan berhasil dikirim', leadId };
}
export async function getWebsiteLeads(websiteId, userId) {
    const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    const leads = await queryAll('SELECT * FROM leads WHERE website_id = ? ORDER BY created_at DESC', [websiteId]);
    return leads.map((l) => ({
        id: l.id,
        websiteId: l.website_id,
        name: l.name,
        phone: l.phone,
        message: l.message,
        serviceInterest: l.service_interest || undefined,
        status: l.status,
        createdAt: l.created_at,
    }));
}
export async function getAllUserLeads(userId) {
    const leads = await queryAll(`SELECT 
      l.id,
      l.website_id,
      w.name AS website_name,
      w.slug AS website_slug,
      l.name,
      l.phone,
      l.message,
      l.service_interest,
      l.status,
      l.created_at
    FROM leads l
    JOIN websites w ON w.id = l.website_id
    WHERE w.user_id = ?
    ORDER BY l.created_at DESC`, [userId]);
    return leads.map((l) => ({
        id: l.id,
        websiteId: l.website_id,
        websiteName: l.website_name,
        websiteSlug: l.website_slug,
        name: l.name,
        phone: l.phone,
        message: l.message,
        serviceInterest: l.service_interest || undefined,
        status: l.status,
        createdAt: l.created_at,
    }));
}
export async function markLeadRead(websiteId, leadId, userId) {
    const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    await execute("UPDATE leads SET status = 'read' WHERE id = ? AND website_id = ?", [leadId, websiteId]);
    return { success: true };
}
export async function deleteLead(websiteId, leadId, userId) {
    const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
    if (!website) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    await execute('DELETE FROM leads WHERE id = ? AND website_id = ?', [leadId, websiteId]);
    return { success: true };
}
