import { queryOne } from '../config/database.js';
export function slugify(text) {
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
export async function getUniqueSlug(baseName, excludeWebsiteId) {
    let baseSlug = slugify(baseName);
    if (!baseSlug)
        baseSlug = 'website';
    let currentSlug = baseSlug;
    let counter = 1;
    while (true) {
        let sql = 'SELECT id FROM websites WHERE slug = ?';
        const params = [currentSlug];
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
