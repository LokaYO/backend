import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
/**
 * Sign a new JWT token with user credentials and expiration.
 */
export function signToken(payload) {
    return jwt.sign(payload, ENV.JWT_SECRET, {
        expiresIn: ENV.JWT_EXPIRES_IN,
    });
}
/**
 * Verify and decode an incoming JWT token.
 * Throws an error if expired or invalid.
 */
export function verifyToken(token) {
    return jwt.verify(token, ENV.JWT_SECRET);
}
