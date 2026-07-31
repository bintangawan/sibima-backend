const pool = require('../config/database');

/**
 * Get all surat & SK records
 * GET /api/v1/surat
 */
const getSurat = async (req, res, next) => {
  try {
    const user = req.user;
    const { jenis, status, search } = req.query;

    let query = `
      SELECT s.*, 
             u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar,
             pr.nama as prodi_nama
      FROM manajemen_surat s
      JOIN users u ON s.mahasiswa_id = u.id
      LEFT JOIN prodi pr ON u.prodi_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'mahasiswa') {
      query += ' AND s.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      query += ' AND u.prodi_id = ?';
      params.push(user.prodi_id);
    }

    if (jenis) {
      query += ' AND s.jenis = ?';
      params.push(jenis);
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (s.no_surat LIKE ? OR s.perihal LIKE ? OR u.name LIKE ? OR u.nim LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY s.created_at DESC';

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
 * Create new surat / SK record (by Admin Prodi / Superadmin)
 * POST /api/v1/surat
 */
const createSurat = async (req, res, next) => {
  try {
    const { no_surat, mahasiswa_id, jenis, perihal, status } = req.body;
    if (!no_surat || !mahasiswa_id || !perihal) {
      return res.status(400).json({ success: false, message: 'Nomor surat, mahasiswa, dan perihal wajib diisi!' });
    }

    const [existing] = await pool.query('SELECT id FROM manajemen_surat WHERE no_surat = ?', [no_surat]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Nomor surat sudah digunakan di dalam sistem!' });
    }

    const id = (jenis === 'sk_pembimbing' ? 'SK-' : 'SR-') + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
    const tanggal = new Date().toISOString().split('T')[0];
    const fileUrl = req.file ? `/storage/surat/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO manajemen_surat (id, no_surat, mahasiswa_id, jenis, perihal, tanggal, status, file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        no_surat,
        mahasiswa_id,
        jenis || 'sk_pembimbing',
        perihal,
        tanggal,
        status || 'terbit',
        fileUrl
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
        'GENERATE_SK',
        req.ip || '127.0.0.1',
        `Menerbitkan surat ${no_surat} untuk mahasiswa ID ${mahasiswa_id}.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Surat resmi / SK berhasil diterbitkan!',
      data: { id, no_surat, mahasiswa_id, status: status || 'terbit', tanggal }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update status surat
 * PUT /api/v1/surat/:id
 */
const updateSuratStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'draf' | 'menunggu_ttd' | 'terbit' | 'arsip'

    await pool.query('UPDATE manajemen_surat SET status = ? WHERE id = ?', [status, id]);
    return res.status(200).json({ success: true, message: 'Status surat berhasil diperbarui!' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSurat,
  createSurat,
  updateSuratStatus
};
