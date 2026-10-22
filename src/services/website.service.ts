import crypto from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';
import { getUniqueSlug } from '../utils/slugify.js';
import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';

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
  const website = await queryOne<{ slug: string }>('SELECT slug FROM websites WHERE id = ? AND user_id = ?', [
    websiteId,
    userId,
  ]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute("UPDATE websites SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [websiteId]);
  return { success: true, status: 'published', slug: website.slug };
}

export async function unpublishWebsite(websiteId: string, userId: string) {
  const website = await queryOne<{ slug: string }>('SELECT slug FROM websites WHERE id = ? AND user_id = ?', [
    websiteId,
    userId,
  ]);
  if (!website) {
    throw { status: 404, message: 'Website tidak ditemukan' };
  }

  await execute("UPDATE websites SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [websiteId]);
  return { success: true, status: 'draft' };
}

export async function getPublicWebsiteBySlug(slug: string) {
  const website = await queryOne<{
    id: string;
    name: string;
    slug: string;
    status: string;
    template: string;
    business_info: any;
    theme: any;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM websites WHERE slug = ?', [slug]);

  if (!website) {
    throw { status: 404, message: 'Halaman landing page tidak ditemukan.' };
  }

  if (website.status !== 'published') {
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
    sections: sections.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      content: parseJsonSafe(s.content),
    })),
  };
}
