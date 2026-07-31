const pool = require('../config/database');

/**
 * Get all plotting / bimbingan records
 * GET /api/v1/plotting
 */
const getPlotting = async (req, res, next) => {
  try {
    const user = req.user;
    const { status_bimbingan, search } = req.query;

    let query = `
      SELECT b.*, 
             u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar,
             pr.nama as prodi_nama,
             p.judul as pengajuan_judul, p.bidang as pengajuan_bidang,
             d1.name as dosen_pembimbing1_nama, d1.nip as dosen_pembimbing1_nip,
             d2.name as dosen_pembimbing2_nama, d2.nip as dosen_pembimbing2_nip,
             (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id) as total_sesi,
             (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'disetujui') as sesi_disetujui
      FROM bimbingan b
      JOIN users u ON b.mahasiswa_id = u.id
      LEFT JOIN prodi pr ON u.prodi_id = pr.id
      LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
      JOIN users d1 ON b.dosen_pembimbing1_id = d1.id
      LEFT JOIN users d2 ON b.dosen_pembimbing2_id = d2.id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering
    if (user.role === 'mahasiswa') {
      query += ' AND b.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'dosen') {
      query += ' AND (b.dosen_pembimbing1_id = ? OR b.dosen_pembimbing2_id = ?)';
      params.push(user.id, user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      query += ' AND u.prodi_id = ?';
      params.push(user.prodi_id);
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

    query += ' ORDER BY b.tanggal_plotting DESC';

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
  try {
    const { mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id, no_sk } = req.body;

    if (!mahasiswa_id || !dosen_pembimbing1_id) {
      return res.status(400).json({ success: false, message: 'Mahasiswa dan Dosen Pembimbing 1 wajib dipilih!' });
    }

    // Check if mahasiswa already plotted
    const [existing] = await pool.query('SELECT id FROM bimbingan WHERE mahasiswa_id = ?', [mahasiswa_id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Mahasiswa ini sudah memiliki penetapan Dosen Pembimbing.' });
    }

    // Check Dosen 1 quota
    const [dosen1Rows] = await pool.query(
      `SELECT u.kuota_max, COUNT(b.id) as current_count 
       FROM users u 
       LEFT JOIN bimbingan b ON u.id = b.dosen_pembimbing1_id OR u.id = b.dosen_pembimbing2_id 
       WHERE u.id = ? GROUP BY u.id`,
      [dosen_pembimbing1_id]
    );
    if (dosen1Rows.length > 0 && dosen1Rows[0].current_count >= dosen1Rows[0].kuota_max) {
      return res.status(400).json({ success: false, message: 'Dosen Pembimbing 1 telah mencapai kuota maksimal mahasiswa bimbingan!' });
    }

    // Check Dosen 2 quota if provided
    if (dosen_pembimbing2_id) {
      if (dosen_pembimbing1_id === dosen_pembimbing2_id) {
        return res.status(400).json({ success: false, message: 'Dosen Pembimbing 1 dan Pembimbing 2 tidak boleh orang yang sama!' });
      }
      const [dosen2Rows] = await pool.query(
        `SELECT u.kuota_max, COUNT(b.id) as current_count 
         FROM users u 
         LEFT JOIN bimbingan b ON u.id = b.dosen_pembimbing1_id OR u.id = b.dosen_pembimbing2_id 
         WHERE u.id = ? GROUP BY u.id`,
        [dosen_pembimbing2_id]
      );
      if (dosen2Rows.length > 0 && dosen2Rows[0].current_count >= dosen2Rows[0].kuota_max) {
        return res.status(400).json({ success: false, message: 'Dosen Pembimbing 2 telah mencapai kuota maksimal mahasiswa bimbingan!' });
      }
    }

    const id = 'BIM-' + Math.floor(100 + Math.random() * 900);
    const tanggal = new Date().toISOString().split('T')[0];
    const skToSave = no_sk || `104/UN.FST/SK-PEMB/${new Date().getFullYear()}`;

    await pool.query(
      `INSERT INTO bimbingan (id, mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id, status_bimbingan, no_sk, tanggal_plotting)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mahasiswa_id,
        pengajuan_id || null,
        dosen_pembimbing1_id,
        dosen_pembimbing2_id || null,
        'bimbingan_berjalan',
        skToSave,
        tanggal
      ]
    );

    // If pengajuan_id exists, update pengajuan status to 'acc' if not already
    if (pengajuan_id) {
      await pool.query('UPDATE pengajuan_judul SET status = "acc" WHERE id = ?', [pengajuan_id]);
    }

    // Record audit log
    await pool.query(
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

    return res.status(201).json({
      success: true,
      message: 'Plotting dosen pembimbing berhasil disimpan!',
      data: { id, mahasiswa_id, dosen_pembimbing1_id, dosen_pembimbing2_id, tanggal_plotting: tanggal }
    });
  } catch (error) {
    next(error);
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

    const [existing] = await pool.query('SELECT id FROM bimbingan WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data plotting tidak ditemukan.' });
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
    const { status_bimbingan, catatan } = req.body; // e.g. 'siap_acc', 'sudah_acc', 'lulus'
    const user = req.user;

    const [rows] = await pool.query('SELECT * FROM bimbingan WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data bimbingan skripsi tidak ditemukan.' });
    }

    const bimbingan = rows[0];
    if (user.role === 'dosen' && bimbingan.dosen_pembimbing1_id !== user.id && bimbingan.dosen_pembimbing2_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Anda bukan Dosen Pembimbing untuk mahasiswa ini.' });
    }

    const targetStatus = status_bimbingan || 'sudah_acc';
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
        `Dosen ${user.name} memberikan persetujuan akhir / ACC Sidang skripsi (ID: ${id}) menjadi '${targetStatus}'.`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Berhasil memberikan ACC Sidang Skripsi! Status kini menjadi '${targetStatus}'.`
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
