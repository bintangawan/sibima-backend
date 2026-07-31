const pool = require('../config/database');

/**
 * Get all logbook sesi with filtering
 * GET /api/v1/logbook
 */
const getLogbooks = async (req, res, next) => {
  try {
    const user = req.user;
    const { bimbingan_id, mahasiswa_id, dosen_id, status } = req.query;

    let query = `
      SELECT l.*, 
             u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar,
             d.name as dosen_nama, d.nip as dosen_nip,
             b.no_sk, b.status_bimbingan
      FROM logbook_sesi l
      JOIN users u ON l.mahasiswa_id = u.id
      JOIN users d ON l.dosen_id = d.id
      JOIN bimbingan b ON l.bimbingan_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering
    if (user.role === 'mahasiswa') {
      query += ' AND l.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'dosen') {
      query += ' AND l.dosen_id = ?';
      params.push(user.id);
    }

    if (bimbingan_id) {
      query += ' AND l.bimbingan_id = ?';
      params.push(bimbingan_id);
    }
    if (mahasiswa_id) {
      query += ' AND l.mahasiswa_id = ?';
      params.push(mahasiswa_id);
    }
    if (dosen_id) {
      query += ' AND l.dosen_id = ?';
      params.push(dosen_id);
    }
    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.pertemuan DESC, l.tanggal DESC';

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
 * Get single logbook sesi by ID
 * GET /api/v1/logbook/:id
 */
const getLogbookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT l.*, 
              u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar,
              d.name as dosen_nama, d.nip as dosen_nip
       FROM logbook_sesi l
       JOIN users u ON l.mahasiswa_id = u.id
       JOIN users d ON l.dosen_id = d.id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sesi logbook tidak ditemukan.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Create logbook sesi (by Mahasiswa)
 * POST /api/v1/logbook
 */
const createLogbook = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Hanya mahasiswa yang dapat mencatat sesi bimbingan.' });
    }

    const { topik, bab, catatan_mahasiswa, dosen_id } = req.body;
    if (!topik || !bab) {
      return res.status(400).json({ success: false, message: 'Topik pembahasan dan bab wajib diisi!' });
    }

    // Get user active bimbingan
    const [bimRows] = await pool.query('SELECT id, dosen_pembimbing1_id, dosen_pembimbing2_id FROM bimbingan WHERE mahasiswa_id = ?', [user.id]);
    if (bimRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Anda belum memiliki penetapan resmi (plotting) Dosen Pembimbing.' });
    }

    const bimbingan = bimRows[0];
    const targetDosenId = dosen_id || bimbingan.dosen_pembimbing1_id;

    // Calculate next pertemuan number
    const [maxRows] = await pool.query(
      'SELECT COALESCE(MAX(pertemuan), 0) + 1 as next_pertemuan FROM logbook_sesi WHERE bimbingan_id = ?',
      [bimbingan.id]
    );
    const pertemuan = maxRows[0].next_pertemuan;

    const id = 'sesi-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
    const tanggal = new Date().toISOString().split('T')[0];
    const dokumenUrl = req.file ? `/storage/logbook/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO logbook_sesi (id, bimbingan_id, mahasiswa_id, dosen_id, pertemuan, tanggal, topik, bab, status, dokumen, catatan_mahasiswa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bimbingan.id,
        user.id,
        targetDosenId,
        pertemuan,
        tanggal,
        topik,
        bab,
        'menunggu_review',
        dokumenUrl,
        catatan_mahasiswa || null
      ]
    );

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        user.id,
        user.name,
        user.role,
        'CREATE_SESI',
        req.ip || '127.0.0.1',
        `Mahasiswa ${user.name} mencatat sesi logbook Pertemuan #${pertemuan}: ${bab}.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Sesi bimbingan berhasil dicatat!',
      data: { id, pertemuan, tanggal, topik, bab, status: 'menunggu_review' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review logbook sesi (by Dosen Pembimbing)
 * PUT /api/v1/logbook/:id/review
 */
const reviewLogbook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, catatan_dosen } = req.body; // status: 'disetujui' | 'revisi'

    if (!['disetujui', 'revisi'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status review tidak valid. Gunakan "disetujui" atau "revisi".' });
    }

    const [rows] = await pool.query('SELECT * FROM logbook_sesi WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sesi logbook tidak ditemukan.' });
    }

    const sesi = rows[0];
    if (req.user.role === 'dosen' && sesi.dosen_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk mereview sesi bimbingan mahasiswa ini.' });
    }

    await pool.query('UPDATE logbook_sesi SET status = ?, catatan_dosen = ? WHERE id = ?', [status, catatan_dosen || null, id]);

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'APPROVE_SESI',
        req.ip || '127.0.0.1',
        `Dosen ${req.user?.name} mereview sesi bimbingan ID ${id} dengan status: ${status.toUpperCase()}.`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Sesi bimbingan berhasil diperbarui dengan status '${status}'.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogbooks,
  getLogbookById,
  createLogbook,
  reviewLogbook
};
