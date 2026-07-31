const { verifyToken } = require('../utils/jwt');
const pool = require('../config/database');

/**
 * Middleware to authenticate user via JWT Bearer Token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi (Bearer Token) tidak ditemukan.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak valid atau telah kedaluwarsa.'
      });
    }

    // Verify user still exists in DB and is active
    const [rows] = await pool.query(
      'SELECT id, name, email, role, status, prodi_id, nim, nip, avatar, kuota_max FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun pengguna untuk token ini tidak lagi ditemukan di dalam sistem.'
      });
    }

    const user = rows[0];
    if (user.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: `Akun Anda berstatus '${user.status}'. Silakan hubungi admin prodi/superadmin.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal pada proses verifikasi autentikasi.'
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param  {...string} allowedRoles - e.g. 'superadmin', 'admin'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role '${req.user?.role || 'unknown'}' tidak memiliki hak akses ke endpoint ini.`
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
