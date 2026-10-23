import crypto from 'node:crypto';
import { execute, queryAll, queryOne } from '../config/database.js';

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  details: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export async function logActivity(params: {
  userId?: string | null;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const id = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await execute(
      `INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        id,
        params.userId || null,
        params.action,
        JSON.stringify(params.details || {}),
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  } catch (err: any) {
    // Non-blocking log failure
    console.error('⚠️ Failed to write audit log:', err.message);
  }
}

export async function getAuditLogs(limit = 50, offset = 0, actionFilter?: string): Promise<{ logs: AuditLogItem[]; total: number }> {
  let countQuery = 'SELECT count(*) as total FROM audit_logs';
  let dataQuery = `
    SELECT 
      l.id,
      l.user_id,
      u.name as user_name,
      u.email as user_email,
      l.action,
      l.details,
      l.ip_address,
      l.user_agent,
      l.created_at
    FROM audit_logs l
    LEFT JOIN users u ON u.id = l.user_id
  `;
  const params: any[] = [];

  if (actionFilter && actionFilter.trim() !== '') {
    countQuery += ' WHERE action = $1';
    dataQuery += ' WHERE l.action = $1';
    params.push(actionFilter.trim());
  }

  dataQuery += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const countRes = await queryOne<{ total: string }>(countQuery, actionFilter ? [actionFilter.trim()] : []);
  const rows = await queryAll<{
    id: string;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    action: string;
    details: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }>(dataQuery, [...params, limit, offset]);

  return {
    total: parseInt(countRes?.total || '0', 10),
    logs: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      action: r.action,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {}),
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    })),
  };
}
