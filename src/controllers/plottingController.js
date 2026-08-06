const pool = require('../config/database');
const { createNotaTugasRecord } = require('../services/notaTugasService');

/**
 * Get all plotting / bimbingan records
 * GET /api/v1/plotting
 */
const getPlotting = async (req, res, next) => {
  try {
    const user = req.user;
    const { status_bimbingan, search } = req.query;

    let query = `
      SELECT p.id AS pengajuan_id, p.mahasiswa_id, p.judul AS pengajuan_judul,
             p.bidang AS pengajuan_bidang, p.dosen_usulan1_id, p.dosen_usulan2_id,
             u.name AS mahasiswa_nama, u.nim AS mahasiswa_nim, u.avatar AS mahasiswa_avatar,
             pr.nama AS prodi_nama,
             us1.name AS dosen_usulan1_nama, us2.name AS dosen_usulan2_nama,
             b.id AS bimbingan_id, b.status_bimbingan, b.no_sk, b.tanggal_plotting,
             b.dosen_pembimbing1_id, b.dosen_pembimbing2_id,
             d1.name as dosen_pembimbing1_nama, d1.nip as dosen_pembimbing1_nip,
             d2.name as dosen_pembimbing2_nama, d2.nip as dosen_pembimbing2_nip,
             (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id) as total_sesi,
             (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'disetujui') as sesi_disetujui
      FROM pengajuan_judul p
      JOIN users u ON p.mahasiswa_id = u.id
      LEFT JOIN prodi pr ON u.prodi_id = pr.id
      LEFT JOIN users us1 ON p.dosen_usulan1_id = us1.id
      LEFT JOIN users us2 ON p.dosen_usulan2_id = us2.id
      LEFT JOIN bimbingan b ON b.pengajuan_id = p.id
      LEFT JOIN users d1 ON b.dosen_pembimbing1_id = d1.id
      LEFT JOIN users d2 ON b.dosen_pembimbing2_id = d2.id
      WHERE p.status = 'acc'
    `;
    const params = [];

    // Role filtering
    if (user.role === 'mahasiswa') {
      query += ' AND p.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'dosen') {
      query += ' AND (b.dosen_pembimbing1_id = ? OR b.dosen_pembimbing2_id = ?)';
      params.push(user.id, user.id);
    } else if (user.role === 'admin') {
      if (!user.prodi_id) query += ' AND 1 = 0';
      else {
        query += ' AND u.prodi_id = ?';
        params.push(user.prodi_id);
      }
    }

    if (status_bimbingan) {
      query += ' AND b.status_bimbingan = ?';
      params.push(status_bimbingan);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR u.nim LIKE ? OR d1.name LIKE ? OR p.judul LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY (b.id IS NULL) DESC, b.tanggal_plotting DESC, p.created_at DESC';

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
 * Assign / Plotting Dosen Pembimbing (Admin Prodi / Superadmin)
 * POST /api/v1/plotting
 */
const createPlotting = async (req, res, next) => {
  let connection;
  try {
    const { mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id } = req.body;

    if (!mahasiswa_id || !pengajuan_id || !dosen_pembimbing1_id) {
      return res.status(400).json({ success: false, message: 'Mahasiswa, judul ACC, dan Pembimbing 1 wajib dipilih.' });
    }
    if (dosen_pembimbing1_id === dosen_pembimbing2_id) {
      return res.status(400).json({ success: false, message: 'Pembimbing 1 dan Pembimbing 2 tidak boleh sama.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [mahasiswa_id]);
    const [proposalRows] = await connection.query(
      `SELECT id, mahasiswa_id, prodi_id FROM pengajuan_judul
       WHERE id = ? AND mahasiswa_id = ? AND status = 'acc' FOR UPDATE`,
      [pengajuan_id, mahasiswa_id]
    );
    if (proposalRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Judul ACC untuk mahasiswa ini tidak ditemukan.' });
    }
    if (req.user.role === 'admin' && proposalRows[0].prodi_id !== req.user.prodi_id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Mahasiswa berada di luar program studi Anda.' });
    }

    const [existing] = await connection.query('SELECT id FROM bimbingan WHERE mahasiswa_id = ? FOR UPDATE', [mahasiswa_id]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Mahasiswa ini sudah memiliki penetapan Dosen Pembimbing.' });
    }

    const supervisorIds = [dosen_pembimbing1_id, dosen_pembimbing2_id].filter(Boolean).sort();
    const [supervisors] = await connection.query(
      `SELECT id, kuota_max FROM users
       WHERE id IN (?) AND role = 'dosen' AND status = 'aktif'
       ORDER BY id FOR UPDATE`,
      [supervisorIds]
    );
    if (supervisors.length !== supervisorIds.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Dosen pembimbing tidak valid atau tidak aktif.' });
    }
    for (const supervisor of supervisors) {
      const [quotaRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM bimbingan
         WHERE (dosen_pembimbing1_id = ? OR dosen_pembimbing2_id = ?)
           AND status_bimbingan <> 'selesai'`,
        [supervisor.id, supervisor.id]
      );
      if (Number(quotaRows[0].total) >= Number(supervisor.kuota_max || 10)) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: `Kuota dosen ${supervisor.id} sudah penuh.` });
      }
    }

    const id = `BIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await connection.query(
      `INSERT INTO bimbingan
       (id, mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id,
        status_bimbingan, tanggal_plotting)
       VALUES (?, ?, ?, ?, ?, 'bimbingan_berjalan',
               DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')))`,
      [id, mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id || null]
    );
    const note = await createNotaTugasRecord(connection, { mahasiswaId: mahasiswa_id, pengajuanId: pengajuan_id, bimbinganId: id });

    // Record audit log
    await connection.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        req.user?.id || 'system',
        req.user?.name || 'System',
        req.user?.role || 'system',
        'CREATE_PLOTTING',
        req.ip || '127.0.0.1',
        `Melakukan plotting dosen pembimbing untuk mahasiswa ID: ${mahasiswa_id}.`
      ]
    );

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: 'Plotting dosen berhasil disimpan dan Nota Tugas diterbitkan.',
      data: { id, mahasiswa_id, dosen_pembimbing1_id, dosen_pembimbing2_id, nota_tugas_id: note.id }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

/**
 * Update Plotting / Bimbingan
 * PUT /api/v1/plotting/:id
 */
const updatePlotting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dosen_pembimbing1_id, dosen_pembimbing2_id, status_bimbingan, no_sk } = req.body;

    if (!dosen_pembimbing1_id) {
      return res.status(400).json({ success: false, message: 'Pembimbing 1 wajib dipilih.' });
    }
    if (dosen_pembimbing1_id === dosen_pembimbing2_id) {
      return res.status(400).json({ success: false, message: 'Pembimbing 1 dan Pembimbing 2 tidak boleh sama.' });
    }

    const [existing] = await pool.query(
      `SELECT b.id, m.prodi_id FROM bimbingan b
       JOIN users m ON m.id = b.mahasiswa_id
       WHERE b.id = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data plotting tidak ditemukan.' });
    }
    if (req.user.role === 'admin' && existing[0].prodi_id !== req.user.prodi_id) {
      return res.status(403).json({ success: false, message: 'Plotting berada di luar program studi Anda.' });
    }

    const supervisorIds = [dosen_pembimbing1_id, dosen_pembimbing2_id].filter(Boolean);
    const [supervisors] = await pool.query(
      `SELECT id, kuota_max FROM users WHERE id IN (?) AND role = 'dosen' AND status = 'aktif'`,
      [supervisorIds]
    );
    if (supervisors.length !== supervisorIds.length) {
      return res.status(400).json({ success: false, message: 'Dosen pembimbing tidak valid atau tidak aktif.' });
    }
    for (const supervisor of supervisors) {
      const [quotaRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM bimbingan
         WHERE id <> ? AND (dosen_pembimbing1_id = ? OR dosen_pembimbing2_id = ?)
           AND status_bimbingan <> 'selesai'`,
        [id, supervisor.id, supervisor.id]
      );
      if (Number(quotaRows[0].total) >= Number(supervisor.kuota_max || 10)) {
        return res.status(409).json({ success: false, message: `Kuota dosen ${supervisor.id} sudah penuh.` });
      }
    }

    await pool.query(
      `UPDATE bimbingan 
       SET dosen_pembimbing1_id = COALESCE(?, dosen_pembimbing1_id),
           dosen_pembimbing2_id = ?,
           status_bimbingan = COALESCE(?, status_bimbingan),
           no_sk = COALESCE(?, no_sk)
       WHERE id = ?`,
      [dosen_pembimbing1_id, dosen_pembimbing2_id || null, status_bimbingan, no_sk, id]
    );

    return res.status(200).json({ success: true, message: 'Data plotting bimbingan berhasil diperbarui!' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Plotting / Bimbingan
 * DELETE /api/v1/plotting/:id
 */
const deletePlotting = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bimbingan WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Data plotting bimbingan berhasil dihapus!' });
  } catch (error) {
    next(error);
  }
};

/**
 * ACC Sidang / Persetujuan Akhir oleh Dosen Pembimbing
 * PUT /api/v1/plotting/:id/acc-sidang
 */
const accSidang = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status_bimbingan, catatan } = req.body;
    const user = req.user;

    const [rows] = await pool.query('SELECT * FROM bimbingan WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data bimbingan skripsi tidak ditemukan.' });
    }

    const bimbingan = rows[0];
    if (user.role === 'dosen' && bimbingan.dosen_pembimbing1_id !== user.id && bimbingan.dosen_pembimbing2_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Anda bukan Dosen Pembimbing untuk mahasiswa ini.' });
    }

    const targetStatus = status_bimbingan || 'sidang';
    if (!['sempro', 'sidang', 'selesai'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status tahap tidak valid. Gunakan sempro, sidang, atau selesai.'
      });
    }
    await pool.query('UPDATE bimbingan SET status_bimbingan = ? WHERE id = ?', [targetStatus, id]);

    // Record audit log
    await pool.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'log-' + Date.now(),
        user.id,
        user.name,
        user.role,
        'ACC_SIDANG',
        req.ip || '127.0.0.1',
        `${user.name} memperbarui tahap bimbingan (ID: ${id}) menjadi '${targetStatus}'. Catatan: ${catatan || '-'}`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Tahap bimbingan berhasil diperbarui menjadi '${targetStatus}'.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlotting,
  createPlotting,
  updatePlotting,
  deletePlotting,
  accSidang
};
