import crypto from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';

async function verifyWebsiteOwnership(websiteId: string, userId: string) {
  const owner = await queryOne('SELECT id FROM websites WHERE id = ? AND user_id = ?', [websiteId, userId]);
  if (!owner) {
    throw { status: 403, message: 'Akses ditolak: Website bukan milik Anda' };
  }
}

export async function addSection(websiteId: string, userId: string, type: string, content: any) {
  await verifyWebsiteOwnership(websiteId, userId);

  const countRow = await queryOne<{ count: number }>(
    'SELECT count(*) as count FROM sections WHERE website_id = ?',
    [websiteId]
  );
  const newPosition = countRow?.count ?? 0;
  const sectionId = `sec_${crypto.randomUUID()}`;

  await execute(
    'INSERT INTO sections (id, website_id, type, content, position) VALUES (?, ?, ?, ?, ?)',
    [sectionId, websiteId, type, JSON.stringify(content || {}), newPosition]
  );

  await execute('UPDATE websites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [websiteId]);

  return {
    id: sectionId,
    websiteId,
    type,
    content,
    position: newPosition,
  };
}

export async function updateSection(websiteId: string, sectionId: string, userId: string, content: any) {
  await verifyWebsiteOwnership(websiteId, userId);

  await execute(
    'UPDATE sections SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND website_id = ?',
    [JSON.stringify(content), sectionId, websiteId]
  );

  await execute('UPDATE websites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [websiteId]);

  return { success: true, message: 'Section berhasil diperbarui' };
}

export async function deleteSection(websiteId: string, sectionId: string, userId: string) {
  await verifyWebsiteOwnership(websiteId, userId);

  await execute('DELETE FROM sections WHERE id = ? AND website_id = ?', [sectionId, websiteId]);

  const remaining = await queryAll<{ id: string }>(
    'SELECT id FROM sections WHERE website_id = ? ORDER BY position ASC',
    [websiteId]
  );
  for (let i = 0; i < remaining.length; i++) {
    await execute('UPDATE sections SET position = ? WHERE id = ?', [i, remaining[i].id]);
  }

  await execute('UPDATE websites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [websiteId]);

  return { success: true, message: 'Section berhasil dihapus' };
}

export async function reorderSections(websiteId: string, userId: string, sectionIds: string[]) {
  if (!Array.isArray(sectionIds)) {
    throw { status: 400, message: 'sectionIds harus berupa array string ID' };
  }

  await verifyWebsiteOwnership(websiteId, userId);

  for (let i = 0; i < sectionIds.length; i++) {
    await execute('UPDATE sections SET position = ? WHERE id = ? AND website_id = ?', [i, sectionIds[i], websiteId]);
  }

  await execute('UPDATE websites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [websiteId]);

  return { success: true, message: 'Urutan section berhasil disimpan' };
}

