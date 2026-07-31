const pool = require('../config/database');
const { comparePassword, hashPassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

/**
 * Handle user login (Manual Email & Password)
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi!'
      });
    }

    // Query user by email
    const [rows] = await pool.query(
      `SELECT u.*, p.nama as prodi_nama 
       FROM users u 
       LEFT JOIN prodi p ON u.prodi_id = p.id 
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password yang Anda masukkan salah.'
      });
    }

    const user = rows[0];

    // Check account status
    if (user.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: `Akun Anda saat ini berstatus '${user.status}'. Tidak dapat melakukan login.`
      });
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password yang Anda masukkan salah.'
      });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate JWT Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = generateToken(payload);

    // Remove password from response
    delete user.password;

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get currently authenticated user profile
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.prodi_id, u.nim, u.nip, 
              u.angkatan, u.phone, u.alamat, u.avatar, u.kuota_max, u.keahlian, 
              u.last_login, u.created_at, p.nama as prodi_nama 
       FROM users u 
       LEFT JOIN prodi p ON u.prodi_id = p.id 
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pengguna tidak ditemukan.'
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
 * Change user password
 * PUT /api/v1/auth/password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini dan password baru wajib diisi!'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal harus terdiri dari 6 karakter.'
      });
    }

    // Fetch user current hashed password
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password lama tidak cocok.'
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diperbarui!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile info
 * PUT /api/v1/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, alamat, keahlian } = req.body;
    let avatarUrl = req.user.avatar;

    if (req.file) {
      avatarUrl = `/storage/avatar/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE users 
       SET name = COALESCE(?, name), 
           phone = COALESCE(?, phone), 
           alamat = COALESCE(?, alamat), 
           keahlian = COALESCE(?, keahlian), 
           avatar = COALESCE(?, avatar) 
       WHERE id = ?`,
      [name || null, phone || null, alamat || null, keahlian || null, avatarUrl || null, userId]
    );

    // Get updated profile
    const [updated] = await pool.query(
      `SELECT id, name, email, role, status, prodi_id, nim, nip, angkatan, phone, alamat, avatar, keahlian 
       FROM users WHERE id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui!',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  updateProfile
};
