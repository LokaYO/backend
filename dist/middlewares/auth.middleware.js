import { verifyToken } from '../utils/jwt.js';
import { queryOne } from '../config/database.js';
/**
 * Authentication Middleware (Authen)
 * Memverifikasi JSON Web Token (JWT) dari header Authorization: Bearer <token>
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Unauthorized: Token autentikasi tidak ditemukan. Harap sertakan header Authorization: Bearer <token>',
        });
        return;
    }
    const token = authHeader.substring(7).trim();
    try {
        // 1. Verifikasi tanda tangan JWT
        const decoded = verifyToken(token);
        // 2. Opsional: Verifikasi bahwa user masih aktif di database PostgreSQL
        const dbUser = await queryOne('SELECT id, role, email FROM users WHERE id = $1', [decoded.id]);
        if (!dbUser) {
            res.status(401).json({ error: 'Unauthorized: Akun pengguna sudah tidak terdaftar' });
            return;
        }
        // Pasang data user ke request context
        req.user = {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            name: decoded.name,
        };
        req.userId = dbUser.id;
        req.userRole = dbUser.role;
        req.userEmail = dbUser.email;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Unauthorized: Token JWT sudah kedaluwarsa. Silakan login kembali.' });
            return;
        }
        if (err.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Unauthorized: Token JWT tidak valid atau telah dimodifikasi.' });
            return;
        }
        console.error('JWT Authentication Error:', err);
        res.status(401).json({ error: 'Unauthorized: Gagal memverifikasi identitas pengguna' });
    }
}
/**
 * Authorization Middleware (Authre / RBAC)
 * Membatasi akses rute berdasarkan daftar role yang diizinkan (Role-Based Access Control)
 * Contoh pemakaian: router.delete('/users/:id', requireAuth, authorize('admin'), controller)
 */
export function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.userRole) {
            res.status(401).json({ error: 'Unauthorized: Autentikasi diperlukan sebelum otorisasi' });
            return;
        }
        if (!allowedRoles.includes(req.userRole)) {
            if (req.userRole === 'admin' || req.userRole === 'support') {
                res.status(403).json({
                    error: "Forbidden: Akun Administrator dan Tim Support murni untuk monitoring (read-only), tidak diizinkan membuat atau memodifikasi website.",
                });
                return;
            }
            res.status(403).json({
                error: `Forbidden: Role '${req.userRole}' tidak memiliki izin mengakses endpoint ini. Membutuhkan role: [${allowedRoles.join(', ')}]`,
            });
            return;
        }
        next();
    };
}
// Shortcut Helpers untuk kemudahan rute
export const requireAdminOnly = authorize('admin');
export const requireAdminOrSupport = authorize('admin', 'support');
export const requireClientOnly = authorize('user');
export const authenticate = requireAuth;
