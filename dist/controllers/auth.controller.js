import * as authService from '../services/auth.service.js';
export async function register(req, res) {
    const { name, email, password } = req.body;
    const result = await authService.registerUser(name, email, password);
    res.json(result);
}
export async function login(req, res) {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.loginUser(email, password, { ip, userAgent });
    res.json(result);
}
export async function getMe(req, res) {
    const user = await authService.getUserById(req.userId);
    res.json({ user });
}
export async function logout(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await authService.logoutUser(token);
    }
    res.json({ success: true, message: 'Berhasil logout' });
}
