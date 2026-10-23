import crypto from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';
import { logActivity } from './audit.service.js';
export async function getActiveAnnouncements() {
    const rows = await queryAll(`SELECT a.id, a.title, a.message, a.type, a.is_active, a.created_by,
            u.name as author_name, a.created_at, a.updated_at
     FROM system_announcements a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.is_active = true
     ORDER BY a.created_at DESC`);
    return rows.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type,
        isActive: r.is_active,
        createdBy: r.created_by,
        authorName: r.author_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
}
export async function getAllAnnouncements() {
    const rows = await queryAll(`SELECT a.id, a.title, a.message, a.type, a.is_active, a.created_by,
            u.name as author_name, a.created_at, a.updated_at
     FROM system_announcements a
     LEFT JOIN users u ON u.id = a.created_by
     ORDER BY a.created_at DESC`);
    return rows.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type,
        isActive: r.is_active,
        createdBy: r.created_by,
        authorName: r.author_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
}
export async function createAnnouncement(params) {
    const id = `ann_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const type = params.type || 'info';
    await execute(`INSERT INTO system_announcements (id, title, message, type, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [id, params.title, params.message, type, params.userId]);
    await logActivity({
        userId: params.userId,
        action: 'BROADCAST_CREATE',
        details: { announcementId: id, title: params.title, type },
    });
    const created = await queryOne('SELECT * FROM system_announcements WHERE id = $1', [id]);
    return {
        id: created.id,
        title: created.title,
        message: created.message,
        type: created.type,
        isActive: created.is_active,
        createdBy: created.created_by,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
    };
}
export async function toggleAnnouncement(id, userId) {
    const existing = await queryOne('SELECT id, is_active, title FROM system_announcements WHERE id = $1', [id]);
    if (!existing) {
        throw { status: 404, message: 'Pengumuman tidak ditemukan' };
    }
    const newState = !existing.is_active;
    await execute('UPDATE system_announcements SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        newState,
        id,
    ]);
    await logActivity({
        userId,
        action: newState ? 'BROADCAST_ACTIVATE' : 'BROADCAST_DEACTIVATE',
        details: { announcementId: id, title: existing.title },
    });
    return newState;
}
export async function deleteAnnouncement(id, userId) {
    const existing = await queryOne('SELECT id, title FROM system_announcements WHERE id = $1', [id]);
    if (!existing) {
        throw { status: 404, message: 'Pengumuman tidak ditemukan' };
    }
    await execute('DELETE FROM system_announcements WHERE id = $1', [id]);
    await logActivity({
        userId,
        action: 'BROADCAST_DELETE',
        details: { announcementId: id, title: existing.title },
    });
}
