import { queryOne } from '../config/database.js';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function getUniqueSlug(baseName: string, excludeWebsiteId?: string): Promise<string> {
  let baseSlug = slugify(baseName);
  if (!baseSlug) baseSlug = 'website';

  let currentSlug = baseSlug;
  let counter = 1;

  while (true) {
    let sql = 'SELECT id FROM websites WHERE slug = ?';
    const params: any[] = [currentSlug];
    if (excludeWebsiteId) {
      sql += ' AND id != ?';
      params.push(excludeWebsiteId);
    }
    const existing = await queryOne(sql, params);
    if (!existing) {
      return currentSlug;
    }
    counter++;
    currentSlug = `${baseSlug}-${counter}`;
  }
}

