const pool = require('../config/database');

/**
 * Get all pengajuan judul with role-based filtering
 * GET /api/v1/pengajuan
 */
const getPengajuan = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, prodi_id, search } = req.query;

    let query = `
      SELECT p.*, 
             u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar,
             pr.nama as prodi_nama,
             d1.name as dosen_usulan1_nama, d1.nip as dosen_usulan1_nip,
             d2.name as dosen_usulan2_nama, d2.nip as dosen_usulan2_nip
      FROM pengajuan_judul p
      JOIN users u ON p.mahasiswa_id = u.id
      LEFT JOIN prodi pr ON p.prodi_id = pr.id
      LEFT JOIN users d1 ON p.dosen_usulan1_id = d1.id
      LEFT JOIN users d2 ON p.dosen_usulan2_id = d2.id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering
    if (user.role === 'mahasiswa') {
      query += ' AND p.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'dosen') {
      query += ' AND (p.dosen_usulan1_id = ? OR p.dosen_usulan2_id = ?)';
      params.push(user.id, user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      query += ' AND p.prodi_id = ?';
      params.push(user.prodi_id);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (prodi_id) {
      query += ' AND p.prodi_id = ?';
      params.push(prodi_id);
    }
    if (search) {
      query += ' AND (p.judul LIKE ? OR u.name LIKE ? OR u.nim LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC';

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
 * Submit new pengajuan judul (by Mahasiswa)
 * POST /api/v1/pengajuan
 */
const createPengajuan = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Hanya mahasiswa yang dapat mengajukan judul skripsi.' });
    }

    const { judul, bidang, dosen_usulan1_id, dosen_usulan2_id } = req.body;
    if (!judul || !bidang || !dosen_usulan1_id) {
      return res.status(400).json({ success: false, message: 'Judul, bidang riset, dan usulan Dosen 1 wajib diisi!' });
    }

    // Check maximum active pengajuan (max 2 in waiting status)
    const [activeRows] = await pool.query(
      'SELECT id FROM pengajuan_judul WHERE mahasiswa_id = ? AND status = "menunggu"',
      [user.id]
    );
    if (activeRows.length >= 2) {
      return res.status(400).json({ success: false, message: 'Anda sudah mencapai batas maksimal 2 pengajuan yang sedang menunggu review prodi.' });
    }

    const id = 'PEN-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
    const tanggal = new Date().toISOString().split('T')[0];
    const dokumenUrl = req.file ? `/storage/proposal/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO pengajuan_judul (id, mahasiswa_id, prodi_id, judul, bidang, status, tanggal, dosen_usulan1_id, dosen_usulan2_id, dokumen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        user.prodi_id || 1,
        judul,
        bidang,
        'menunggu',
        tanggal,
        dosen_usulan1_id,
        dosen_usulan2_id || null,
        dokumenUrl
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
        'CREATE_PENGAJUAN',
        req.ip || '127.0.0.1',
        `Mahasiswa ${user.name} mengajukan judul skripsi: "${judul.substring(0, 50)}...".`
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Pengajuan judul skripsi berhasil dikirim!',
      data: { id, judul, status: 'menunggu', tanggal }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify pengajuan judul (by Admin Prodi / Koordinator Skripsi)
 * PUT /api/v1/pengajuan/:id/verify
 */
const verifyPengajuan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body; // status: 'acc' | 'ditolak'

    if (!['acc', 'ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status verifikasi tidak valid. Gunakan "acc" atau "ditolak".' });
    }

    const [rows] = await pool.query('SELECT * FROM pengajuan_judul WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }

    const pengajuan = rows[0];

    await pool.query('UPDATE pengajuan_judul SET status = ?, catatan = ? WHERE id = ?', [status, catatan || null, id]);

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'VERIFY_PENGAJUAN',
        req.ip || '127.0.0.1',
        `Memverifikasi pengajuan judul (ID: ${id}) dengan status: ${status.toUpperCase()}.`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Pengajuan judul berhasil diverifikasi dengan status '${status}'.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel/Delete waiting pengajuan (by Mahasiswa)
 * DELETE /api/v1/pengajuan/:id
 */
const cancelPengajuan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM pengajuan_judul WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }

    const pengajuan = rows[0];
    if (req.user.role === 'mahasiswa' && pengajuan.mahasiswa_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk membatalkan pengajuan ini.' });
    }

    if (pengajuan.status !== 'menunggu' && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Pengajuan yang sudah diproses (acc/ditolak) tidak dapat dibatalkan.' });
    }

    await pool.query('DELETE FROM pengajuan_judul WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Pengajuan judul berhasil dibatalkan dan dihapus.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPengajuan,
  createPengajuan,
  verifyPengajuan,
  cancelPengajuan
};
