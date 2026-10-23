import { execute, queryAll, queryOne } from '../config/database.js';
import { logActivity } from './audit.service.js';
export async function getAllUsersForMonitoring() {
    const users = await queryAll(`SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.role, 
      u.last_login_at, 
      u.created_at,
      COUNT(DISTINCT w.id) AS total_websites,
      COUNT(DISTINCT CASE WHEN w.status = 'published' THEN w.id END) AS published_websites,
      CASE WHEN COUNT(s.token) > 0 THEN true ELSE false END AS is_currently_online,
      MAX(s.user_agent) AS last_device_info,
      MAX(s.ip_address) AS last_ip_address
    FROM users u
    LEFT JOIN websites w ON w.user_id = u.id
    LEFT JOIN sessions s ON s.user_id = u.id AND s.expires_at > CURRENT_TIMESTAMP
    GROUP BY u.id
    ORDER BY u.last_login_at DESC NULLS LAST, u.created_at DESC`);
    return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        totalWebsites: parseInt(u.total_websites, 10) || 0,
        publishedWebsites: parseInt(u.published_websites, 10) || 0,
        isCurrentlyOnline: Boolean(u.is_currently_online),
        lastDeviceInfo: u.last_device_info,
        lastIpAddress: u.last_ip_address,
    }));
}
export async function getUserDetailsWithWebsites(userId) {
    const user = await queryOne('SELECT id, name, email, role, last_login_at, created_at FROM users WHERE id = $1', [userId]);
    if (!user) {
        throw { status: 404, message: 'User tidak ditemukan' };
    }
    const websites = await queryAll(`SELECT w.id, w.name, w.slug, w.status, w.template,
            w.business_info, w.theme,
            w.created_at, w.updated_at,
            (SELECT count(*)::int FROM sections s WHERE s.website_id = w.id) AS section_count
     FROM websites w
     WHERE w.user_id = $1
     ORDER BY w.updated_at DESC`, [userId]);
    // Fetch sections for each website so admin can see content
    const websitesWithSections = await Promise.all(websites.map(async (w) => {
        const sections = await queryAll(`SELECT id, type, content, position, created_at, updated_at
         FROM sections
         WHERE website_id = $1
         ORDER BY position ASC`, [w.id]);
        return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            status: w.status,
            template: w.template,
            businessInfo: w.business_info,
            theme: w.theme,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
            sectionCount: parseInt(w.section_count, 10) || 0,
            sections,
        };
    }));
    const activeSessions = await queryAll('SELECT token, ip_address, user_agent, expires_at, created_at FROM sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP', [
        userId,
    ]);
    return {
        user,
        websites: websitesWithSections,
        activeSessions,
    };
}
export async function updateUserRole(userId, newRole) {
    if (!['admin', 'support', 'user'].includes(newRole)) {
        throw { status: 400, message: "Role harus salah satu dari: 'admin', 'support', 'user'" };
    }
    const existing = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!existing) {
        throw { status: 404, message: 'User tidak ditemukan' };
    }
    await execute('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newRole, userId]);
    return { success: true, message: `Role user berhasil diubah menjadi ${newRole}` };
}
export async function deleteUser(userId) {
    const existing = await queryOne('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (!existing) {
        throw { status: 404, message: 'User tidak ditemukan' };
    }
    await execute('DELETE FROM users WHERE id = $1', [userId]);
    return { success: true, message: `User "${existing.name}" berhasil dihapus beserta seluruh websitenya` };
}
export async function getPlatformStats() {
    const stats = await queryOne(`
    SELECT
      (SELECT count(*) FROM users) as total_users,
      (SELECT count(*) FROM users WHERE role = 'admin') as total_admins,
      (SELECT count(*) FROM users WHERE role = 'support') as total_supports,
      (SELECT count(*) FROM websites) as total_websites,
      (SELECT count(*) FROM websites WHERE status = 'published') as total_published
  `);
    return {
        totalUsers: parseInt(stats?.total_users || '0', 10),
        totalAdmins: parseInt(stats?.total_admins || '0', 10),
        totalSupports: parseInt(stats?.total_supports || '0', 10),
        totalWebsites: parseInt(stats?.total_websites || '0', 10),
        totalPublished: parseInt(stats?.total_published || '0', 10),
    };
}
// ─── Content Moderation & Suspend Website ─────────────────────────────────────
export async function getAllWebsitesForModeration() {
    const websites = await queryAll(`SELECT 
      w.id,
      w.user_id,
      u.name AS owner_name,
      u.email AS owner_email,
      w.name,
      w.slug,
      w.status,
      w.template,
      w.suspend_reason,
      COALESCE(w.views_count, 0) AS views_count,
      COALESCE(w.whatsapp_clicks_count, 0) AS whatsapp_clicks_count,
      w.created_at,
      w.updated_at,
      (SELECT count(*)::int FROM sections s WHERE s.website_id = w.id) AS section_count
    FROM websites w
    JOIN users u ON u.id = w.user_id
    ORDER BY w.updated_at DESC`);
    return websites.map((w) => ({
        id: w.id,
        userId: w.user_id,
        ownerName: w.owner_name,
        ownerEmail: w.owner_email,
        name: w.name,
        slug: w.slug,
        status: w.status,
        template: w.template,
        suspendReason: w.suspend_reason,
        viewsCount: w.views_count,
        whatsappClicksCount: w.whatsapp_clicks_count,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        sectionCount: parseInt(w.section_count, 10) || 0,
    }));
}
export async function suspendWebsite(websiteId, reason, adminId) {
    const existing = await queryOne('SELECT id, name, slug, status FROM websites WHERE id = $1', [websiteId]);
    if (!existing) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    const finalReason = reason && reason.trim() !== ''
        ? reason.trim()
        : 'Melanggar ketentuan layanan platform LOKA (Konten tidak pantas / spam).';
    await execute(`UPDATE websites 
     SET status = 'suspended', suspend_reason = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`, [finalReason, websiteId]);
    await logActivity({
        userId: adminId,
        action: 'WEBSITE_SUSPEND',
        details: {
            websiteId,
            name: existing.name,
            slug: existing.slug,
            reason: finalReason,
        },
    });
    return {
        success: true,
        message: `Website "${existing.name}" berhasil ditangguhkan (suspended).`,
        suspendReason: finalReason,
    };
}
export async function unsuspendWebsite(websiteId, adminId) {
    const existing = await queryOne('SELECT id, name, slug, status FROM websites WHERE id = $1', [websiteId]);
    if (!existing) {
        throw { status: 404, message: 'Website tidak ditemukan' };
    }
    // Restore to draft so owner can review before publishing again
    await execute(`UPDATE websites 
     SET status = 'draft', suspend_reason = NULL, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`, [websiteId]);
    await logActivity({
        userId: adminId,
        action: 'WEBSITE_UNSUSPEND',
        details: {
            websiteId,
            name: existing.name,
            slug: existing.slug,
        },
    });
    return {
        success: true,
        message: `Penangguhan website "${existing.name}" telah dicabut. Status dikembalikan ke Draft.`,
    };
}
// ─── Data Export (CSV Excel-Compatible with UTF-8 BOM) ─────────────────────────
function escapeCsvField(field) {
    if (field === null || field === undefined)
        return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
}
export async function generateUsersCsv() {
    const users = await getAllUsersForMonitoring();
    const headers = [
        'ID Pengguna',
        'Nama Lengkap',
        'Email Akun',
        'Role Akses',
        'Status Online',
        'Total Website Dibuat',
        'Website Berstatus Live',
        'Terakhir Login',
        'Perangkat Terakhir',
        'IP Address Terakhir',
        'Tanggal Registrasi',
    ];
    const rows = users.map((u) => [
        escapeCsvField(u.id),
        escapeCsvField(u.name),
        escapeCsvField(u.email),
        escapeCsvField(u.role),
        escapeCsvField(u.isCurrentlyOnline ? 'Online' : 'Offline'),
        escapeCsvField(u.totalWebsites),
        escapeCsvField(u.publishedWebsites),
        escapeCsvField(u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum Pernah'),
        escapeCsvField(u.lastDeviceInfo || '-'),
        escapeCsvField(u.lastIpAddress || '-'),
        escapeCsvField(new Date(u.createdAt).toLocaleString('id-ID')),
    ]);
    // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters cleanly
    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
export async function generateWebsitesCsv() {
    const websites = await getAllWebsitesForModeration();
    const headers = [
        'ID Website',
        'Nama Website',
        'Slug / URL',
        'Status',
        'Alasan Suspend',
        'Nama Pemilik',
        'Email Pemilik',
        'Template Pilihan',
        'Jumlah Seksi Konten',
        'Total Pengunjung (Views)',
        'Total Klik WhatsApp',
        'Tanggal Dibuat',
        'Terakhir Diperbarui',
    ];
    const rows = websites.map((w) => [
        escapeCsvField(w.id),
        escapeCsvField(w.name),
        escapeCsvField(w.slug),
        escapeCsvField(w.status.toUpperCase()),
        escapeCsvField(w.suspendReason || '-'),
        escapeCsvField(w.ownerName),
        escapeCsvField(w.ownerEmail),
        escapeCsvField(w.template || 'Custom'),
        escapeCsvField(w.sectionCount),
        escapeCsvField(w.viewsCount),
        escapeCsvField(w.whatsappClicksCount),
        escapeCsvField(new Date(w.createdAt).toLocaleString('id-ID')),
        escapeCsvField(new Date(w.updatedAt).toLocaleString('id-ID')),
    ]);
    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
export async function generateAnalyticsCsv() {
    const websites = await getAllWebsitesForModeration();
    const headers = [
        'Nama Bisnis / Website',
        'Pemilik Usaha',
        'URL Publik',
        'Status Website',
        'Total Kunjungan (Pageviews)',
        'Interaksi WhatsApp (Clicks)',
        'Conversion Rate (CTR %)',
        'Keterangan Performa',
    ];
    const rows = websites.map((w) => {
        const ctr = w.viewsCount > 0 ? ((w.whatsappClicksCount / w.viewsCount) * 100).toFixed(1) : '0.0';
        let performance = 'Baru Dibuat';
        if (w.viewsCount > 50) {
            performance = parseFloat(ctr) > 10 ? 'Sangat Tinggi (High Intent)' : 'Aktif';
        }
        return [
            escapeCsvField(w.name),
            escapeCsvField(`${w.ownerName} (${w.ownerEmail})`),
            escapeCsvField(`https://loka.my.id/s/${w.slug}`),
            escapeCsvField(w.status.toUpperCase()),
            escapeCsvField(w.viewsCount),
            escapeCsvField(w.whatsappClicksCount),
            escapeCsvField(`${ctr}%`),
            escapeCsvField(performance),
        ];
    });
    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
