import crypto, { randomUUID } from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';
import { getUniqueSlug } from '../utils/slugify.js';
import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';
import { logActivity } from './audit.service.js';

function parseJsonSafe(val: any, fallback: any = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function getUserWebsites(userId: string) {
  const websites = await queryAll<{
    id: string;
    user_id: string;
    name: string;
    slug: string;
    status: string;
    template: string;
    business_info: any;
    theme: any;
    created_at: string;
    updated_at: string;
    section_count: number;
  }>(
    `SELECT w.*, 
      (SELECT count(*) FROM sections s WHERE s.website_id = w.id) as section_count 
     FROM websites w 
     WHERE w.user_id = ? 
     ORDER BY w.updated_at DESC`,
    [userId]
  );

  return websites.map((w: any) => ({
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

export async function getWebsiteById(websiteId: string, userId: string) {
  const website = await queryOne<{
    id: string;
    user_id: string;
    name: string;
    slug: string;
    status: string;
    template: string;
    business_info: any;
    theme: any;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);

  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan atau bukan milik Anda' };
  }

  const sections = await queryAll<{
    id: string;
    website_id: string;
    type: string;
    content: any;
    position: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM sections WHERE website_id = ? ORDER BY position ASC', [website.id]);

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
    viewsCount: parseInt((website as any).views_count, 10) || 0,
    whatsappClicksCount: parseInt((website as any).whatsapp_clicks_count, 10) || 0,
    createdAt: website.created_at,
    updatedAt: website.updated_at,
    sections: formattedSections,
  };
}

export async function createWebsite(
  userId: string,
  data: {
    name: string;
    templateId?: string;
    businessInfo?: any;
    theme?: any;
    sections?: any[];
  }
) {
  const { name, templateId, businessInfo, theme, sections } = data;
  if (!name) {
    throw { status: 400, message: 'Nama website wajib diisi' };
  }

  const websiteId = `site_${crypto.randomUUID()}`;
  const slug = await getUniqueSlug(name);

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

  let initialSections: Array<{ type: string; content: any }> = [];

  if (templateId) {
    const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      chosenBusinessInfo = template.businessInfo;
      chosenTheme = template.theme;
      initialSections = template.sections;
    }
  } else if (sections && Array.isArray(sections)) {
    initialSections = sections;
  }

  await execute(
    `INSERT INTO websites (id, user_id, name, slug, status, template, business_info, theme) 
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [websiteId, userId, name, slug, templateId || null, JSON.stringify(chosenBusinessInfo), JSON.stringify(chosenTheme)]
  );

  for (let i = 0; i < initialSections.length; i++) {
    const s = initialSections[i];
    const sectionId = `sec_${crypto.randomUUID()}`;
    await execute(
      'INSERT INTO sections (id, website_id, type, content, position) VALUES (?, ?, ?, ?, ?)',
      [sectionId, websiteId, s.type, JSON.stringify(s.content), i]
    );
  }

  await logActivity({
    userId,
    action: 'WEBSITE_CREATE',
    details: { websiteId, name, slug },
  });

  return { websiteId, slug };
}

export async function updateWebsite(
  websiteId: string,
  userId: string,
  data: { name?: string; slug?: string; theme?: any; businessInfo?: any }
) {
  const { name, slug, theme, businessInfo } = data;

  const existing = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!existing) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  let finalSlug = slug;
  if (slug) {
    finalSlug = await getUniqueSlug(slug, websiteId);
  }

  await execute(
    `UPDATE websites 
     SET name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         theme = COALESCE(?, theme),
         business_info = COALESCE(?, business_info),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [
      name || null,
      finalSlug || null,
      theme ? JSON.stringify(theme) : null,
      businessInfo ? JSON.stringify(businessInfo) : null,
      websiteId,
      userId,
    ]
  );

  return { success: true, message: 'Website berhasil diperbarui', slug: finalSlug };
}

export async function deleteWebsite(websiteId: string, userId: string) {
  const existing = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!existing) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute('DELETE FROM sections WHERE website_id = ?', [websiteId]);
  await execute('DELETE FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);

  return { success: true, message: 'Website berhasil dihapus' };
}

export async function publishWebsite(websiteId: string, userId: string) {
  const website = await queryOne<{ slug: string; status: string; name: string }>(
    'SELECT slug, status, name FROM websites WHERE id = ? AND user_id = ?',
    [websiteId, userId]
  );
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
  
  await logActivity({
    userId,
    action: 'WEBSITE_PUBLISH',
    details: { websiteId, slug: website.slug, name: website.name },
  });

  return { success: true, status: 'published', slug: website.slug };
}

export async function unpublishWebsite(websiteId: string, userId: string) {
  const website = await queryOne<{ slug: string; name: string }>(
    'SELECT slug, name FROM websites WHERE id = ? AND user_id = ?',
    [websiteId, userId]
  );
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute("UPDATE websites SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [websiteId]);

  await logActivity({
    userId,
    action: 'WEBSITE_UNPUBLISH',
    details: { websiteId, slug: website.slug, name: website.name },
  });

  return { success: true, status: 'draft' };
}

export async function getPublicWebsiteBySlug(slug: string) {
  const website = await queryOne<{
    id: string;
    name: string;
    slug: string;
    status: string;
    template: string;
    suspend_reason?: string | null;
    business_info: any;
    theme: any;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM websites WHERE slug = ?', [slug]);

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

  const sections = await queryAll<{
    id: string;
    website_id: string;
    type: string;
    content: any;
    position: number;
  }>('SELECT * FROM sections WHERE website_id = ? ORDER BY position ASC', [website.id]);

  return {
    id: website.id,
    name: website.name,
    slug: website.slug,
    status: website.status,
    businessInfo: parseJsonSafe(website.business_info),
    theme: parseJsonSafe(website.theme),
    viewsCount: parseInt((website as any).views_count, 10) || 0,
    whatsappClicksCount: parseInt((website as any).whatsapp_clicks_count, 10) || 0,
    sections: sections.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      content: parseJsonSafe(s.content),
    })),
  };
}

export async function trackPublicWebsiteEvent(slug: string, type: 'view' | 'whatsapp_click') {
  if (type === 'view') {
    await execute('UPDATE websites SET views_count = views_count + 1 WHERE slug = ?', [slug]);
  } else if (type === 'whatsapp_click') {
    await execute('UPDATE websites SET whatsapp_clicks_count = whatsapp_clicks_count + 1 WHERE slug = ?', [slug]);
  }
  return { success: true, slug, tracked: type };
}

export async function duplicateWebsite(websiteId: string, userId: string) {
  const original = await queryOne<{
    id: string;
    name: string;
    slug: string;
    template: string;
    business_info: any;
    theme: any;
  }>('SELECT * FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);

  if (!original) {
    throw { status: 404, message: 'Website asli tidak ditemukan' };
  }

  const sections = await queryAll<{
    type: string;
    content: any;
    position: number;
  }>('SELECT type, content, position FROM sections WHERE website_id = ? ORDER BY position ASC', [websiteId]);

  const newWebsiteId = `web_${randomUUID()}`;
  const shortRand = Math.random().toString(36).substring(2, 6);
  let baseSlug = `${original.slug}-copy-${shortRand}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Verify slug uniqueness
  const existingSlug = await queryOne('SELECT id FROM websites WHERE slug = ?', [baseSlug]);
  if (existingSlug) {
    baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
  }

  const newName = `${original.name} (Salinan)`;

  await execute(
    `INSERT INTO websites (id, user_id, name, slug, status, template, business_info, theme, views_count, whatsapp_clicks_count) 
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, 0, 0)`,
    [
      newWebsiteId,
      userId,
      newName,
      baseSlug,
      original.template || 'custom',
      typeof original.business_info === 'string' ? original.business_info : JSON.stringify(original.business_info || {}),
      typeof original.theme === 'string' ? original.theme : JSON.stringify(original.theme || {}),
    ]
  );

  for (const sec of sections) {
    const newSecId = `sec_${randomUUID()}`;
    await execute(
      'INSERT INTO sections (id, website_id, type, content, position) VALUES (?, ?, ?, ?, ?)',
      [
        newSecId,
        newWebsiteId,
        sec.type,
        typeof sec.content === 'string' ? sec.content : JSON.stringify(sec.content || {}),
        sec.position,
      ]
    );
  }

  return {
    success: true,
    message: 'Website berhasil diduplikasi',
    websiteId: newWebsiteId,
    slug: baseSlug,
    name: newName,
  };
}

export async function createLead(slug: string, leadData: { name: string; phone: string; message: string; serviceInterest?: string }) {
  const website = await queryOne<{ id: string }>('SELECT id FROM websites WHERE slug = ?', [slug]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  const leadId = `lead_${randomUUID()}`;
  await execute(
    `INSERT INTO leads (id, website_id, name, phone, message, service_interest, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'unread')`,
    [
      leadId,
      website.id,
      leadData.name.trim(),
      leadData.phone.trim(),
      leadData.message.trim(),
      leadData.serviceInterest?.trim() || null,
    ]
  );

  return { success: true, message: 'Pesan berhasil dikirim', leadId };
}

export async function getWebsiteLeads(websiteId: string, userId: string) {
  const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  const leads = await queryAll<{
    id: string;
    website_id: string;
    name: string;
    phone: string;
    message: string;
    service_interest: string | null;
    status: 'unread' | 'read';
    created_at: string;
  }>('SELECT * FROM leads WHERE website_id = ? ORDER BY created_at DESC', [websiteId]);

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

export async function markLeadRead(websiteId: string, leadId: string, userId: string) {
  const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute("UPDATE leads SET status = 'read' WHERE id = ? AND website_id = ?", [leadId, websiteId]);
  return { success: true };
}

export async function deleteLead(websiteId: string, leadId: string, userId: string) {
  const website = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute('DELETE FROM leads WHERE id = ? AND website_id = ?', [leadId, websiteId]);
  return { success: true };
}
