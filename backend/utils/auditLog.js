const pool = require('../config/database');

// Create audit log entry
const createAuditLog = async (userId, action, entityType, entityId, oldValues, newValues, req) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break main operations
  }
};

// Get audit logs with pagination
const getAuditLogs = async (filters = {}, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (filters.userId) {
      whereClause += ' AND al.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      whereClause += ' AND al.action = ?';
      params.push(filters.action);
    }

    if (filters.entityType) {
      whereClause += ' AND al.entity_type = ?';
      params.push(filters.entityType);
    }

    if (filters.startDate) {
      whereClause += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    const [logs] = await pool.query(
      `SELECT al.*, u.full_name as user_name, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereClause}`,
      params
    );

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

module.exports = { createAuditLog, getAuditLogs };
