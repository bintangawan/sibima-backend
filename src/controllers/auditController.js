const pool = require('../config/database');

/**
 * Get audit logs with optional search and role filter
 * GET /api/v1/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { role, action, search, limit = 50 } = req.query;

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (user_name LIKE ? OR details LIKE ? OR action LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
