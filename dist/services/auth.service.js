import crypto from 'node:crypto';
import { execute, hashPassword, queryOne } from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { logActivity } from './audit.service.js';
export async function registerUser(name, email, password, role = 'user') {
    if (!name || !email || !password) {
        throw { status: 400, message: 'Nama, email, dan password wajib diisi' };
    }
    if (password.length < 6) {
        throw { status: 400, message: 'Password minimal 6 karakter' };
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing) {
        throw { status: 400, message: 'Email sudah terdaftar. Silakan login.' };
    }
    const userId = `usr_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    await execute('INSERT INTO users (id, name, email, password_hash, role, last_login_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)', [userId, name.trim(), normalizedEmail, passwordHash, role]);
    // Generate JWT Token
    const token = signToken({
        id: userId,
        email: normalizedEmail,
        role: role,
        name: name.trim(),
    });
    // Catat session untuk pemantauan sesi aktif
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await execute('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expiresAt]);
    await logActivity({
        userId,
        action: 'USER_REGISTER',
        details: { name: name.trim(), email: normalizedEmail, role },
    });
    return {
        token,
        user: {
            id: userId,
            name: name.trim(),
            email: normalizedEmail,
            role,
            plan: 'free',
            subscriptionUntil: null,
        },
    };
}
export async function loginUser(email, password, clientInfo) {
    if (!email || !password) {
        throw { status: 400, message: 'Email dan password wajib diisi' };
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await queryOne('SELECT id, name, email, password_hash, role, plan, subscription_until FROM users WHERE email = $1', [normalizedEmail]);
    if (!user) {
        throw { status: 400, message: 'Email atau password salah' };
    }
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
        throw { status: 400, message: 'Email atau password salah' };
    }
    // Update last_login_at
    await execute('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    // Generate JWT Token
    const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        name: user.name,
    });
    // Catat session perangkat & IP
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await execute('INSERT INTO sessions (token, user_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)', [token, user.id, clientInfo?.ip || null, clientInfo?.userAgent || null, expiresAt]);
    await logActivity({
        userId: user.id,
        action: 'USER_LOGIN',
        details: { email: user.email, role: user.role },
        ipAddress: clientInfo?.ip || null,
        userAgent: clientInfo?.userAgent || null,
    });
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            plan: user.plan || 'free',
            subscriptionUntil: user.subscription_until || null,
        },
    };
}
export async function getUserById(userId) {
    const user = await queryOne('SELECT id, name, email, role, plan, subscription_until, created_at, last_login_at FROM users WHERE id = $1', [userId]);
    if (!user) {
        throw { status: 404, message: 'User tidak ditemukan' };
    }
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan || 'free',
        subscriptionUntil: user.subscription_until,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
    };
}
export async function logoutUser(token) {
    await execute('DELETE FROM sessions WHERE token = $1', [token]);
    return { success: true, message: 'Berhasil logout' };
}
