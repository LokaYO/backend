import { execute, queryAll, queryOne } from '../config/database.js';
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
