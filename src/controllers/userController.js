const pool = require('../config/database');
const { hashPassword } = require('../utils/hash');

/**
 * Get all users with filtering and search
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, status, prodi_id, search } = req.query;
    
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.prodi_id, u.nim, u.nip, 
             u.angkatan, u.phone, u.alamat, u.avatar, u.kuota_max, u.keahlian, 
             u.last_login, u.created_at, p.nama as prodi_nama,
             (SELECT COUNT(*) FROM bimbingan b WHERE b.dosen_pembimbing1_id = u.id OR b.dosen_pembimbing2_id = u.id) as current_bimbingan_count
      FROM users u 
      LEFT JOIN prodi p ON u.prodi_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND u.status = ?';
      params.push(status);
    }
    if (prodi_id) {
      query += ' AND u.prodi_id = ?';
      params.push(prodi_id);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.nim LIKE ? OR u.nip LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY u.created_at DESC';

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

/**
 * Get single user by ID
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.prodi_id, u.nim, u.nip, 
              u.angkatan, u.phone, u.alamat, u.avatar, u.kuota_max, u.keahlian, 
              u.last_login, u.created_at, p.nama as prodi_nama 
       FROM users u 
       LEFT JOIN prodi p ON u.prodi_id = p.id 
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 * POST /api/v1/users
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status, prodi_id, nim, nip, angkatan, phone, alamat, kuota_max, keahlian } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan role wajib diisi!'
      });
    }

    // Check existing email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar di sistem!'
      });
    }

    // Generate unique ID (e.g. u168...)
    const id = 'u' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const passToHash = password || 'password'; // default password if not provided
    const hashedPassword = await hashPassword(passToHash);

    await pool.query(
      `INSERT INTO users (id, name, email, password, role, status, prodi_id, nim, nip, angkatan, phone, alamat, kuota_max, keahlian)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        email,
        hashedPassword,
        role,
        status || 'aktif',
        prodi_id || null,
        nim || null,
        nip || null,
        angkatan || null,
        phone || null,
        alamat || null,
        kuota_max || 10,
        keahlian || null
      ]
    );

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'CREATE_USER',
        req.ip || '127.0.0.1',
        `Membuat akun pengguna baru: ${name} (${email}) dengan role ${role}.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Akun pengguna berhasil dibuat!',
      data: { id, name, email, role, status: status || 'aktif' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, prodi_id, nim, nip, angkatan, phone, alamat, kuota_max, keahlian } = req.body;

    const [existing] = await pool.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    await pool.query(
      `UPDATE users 
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           role = COALESCE(?, role),
           status = COALESCE(?, status),
           prodi_id = ?,
           nim = ?,
           nip = ?,
           angkatan = COALESCE(?, angkatan),
           phone = COALESCE(?, phone),
           alamat = COALESCE(?, alamat),
           kuota_max = COALESCE(?, kuota_max),
           keahlian = COALESCE(?, keahlian)
       WHERE id = ?`,
      [
        name,
        email,
        role,
        status,
        prodi_id || null,
        nim || null,
        nip || null,
        angkatan,
        phone,
        alamat,
        kuota_max,
        keahlian,
        id
      ]
    );

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'UPDATE_USER',
        req.ip || '127.0.0.1',
        `Memperbarui data akun pengguna: ${name || existing[0].name} (ID: ${id}).`
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Data pengguna berhasil diperbarui!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'DELETE_USER',
        req.ip || '127.0.0.1',
        `Menghapus akun pengguna: ${existing[0].name} (${existing[0].email}).`
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Akun pengguna berhasil dihapus!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password to default ('password')
 * POST /api/v1/users/:id/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const [existing] = await pool.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    const passToSet = newPassword || 'password';
    const hashedPassword = await hashPassword(passToSet);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'RESET_PASSWORD',
        req.ip || '127.0.0.1',
        `Mereset password pengguna: ${existing[0].name} (ID: ${id}).`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Password berhasil direset menjadi '${passToSet}'`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword
};
