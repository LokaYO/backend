import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'support' | 'user';
  name?: string;
}

/**
 * Sign a new JWT token with user credentials and expiration.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode an incoming JWT token.
 * Throws an error if expired or invalid.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
}

