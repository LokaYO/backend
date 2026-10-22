import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;
  const result = await authService.registerUser(name, email, password);
  res.json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const result = await authService.loginUser(email, password, { ip, userAgent });
  res.json(result);
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await authService.getUserById(req.userId!);
  res.json({ user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await authService.logoutUser(token);
  }
  res.json({ success: true, message: 'Berhasil logout' });
}

