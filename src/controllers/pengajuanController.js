const pool = require('../config/database');
const { createNotaTugasRecord } = require('../services/notaTugasService');
const { createNotification, notifyAdminsForProdi } = require('../services/notificationService');

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
             d2.name as dosen_usulan2_nama, d2.nip as dosen_usulan2_nip,
             (SELECT s.id FROM manajemen_surat s
              WHERE s.pengajuan_id = p.id AND s.jenis = 'nota_tugas'
              ORDER BY s.created_at DESC LIMIT 1) AS nota_tugas_id,
             (SELECT s.no_surat FROM manajemen_surat s
              WHERE s.pengajuan_id = p.id AND s.jenis = 'nota_tugas'
              ORDER BY s.created_at DESC LIMIT 1) AS nota_tugas_nomor
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
    } else if (user.role === 'admin') {
      if (!user.prodi_id) query += ' AND 1 = 0';
      else {
        query += ' AND p.prodi_id = ?';
        params.push(user.prodi_id);
      }
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
    let meta = undefined;
    if (user.role === 'mahasiswa') {
      const [summaryRows] = await pool.query(
        `SELECT
           SUM(status = 'acc') AS total_acc,
           SUM(status IN ('menunggu', 'revisi')) AS total_menunggu
         FROM pengajuan_judul WHERE mahasiswa_id = ?`,
        [user.id]
      );
      const hasAcc = Number(summaryRows[0]?.total_acc || 0) > 0;
      const activeCount = Number(summaryRows[0]?.total_menunggu || 0);
      meta = {
        has_acc: hasAcc,
        active_count: activeCount,
        max_active: 3,
        can_create: !hasAcc && activeCount < 3,
        block_reason: hasAcc
          ? 'Salah satu judul sudah disetujui. Pengajuan baru tidak dapat dibuat.'
          : activeCount >= 3
            ? 'Tiga judul masih aktif (menunggu atau revisi). Ajukan kembali setelah salah satunya ditolak atau dibatalkan.'
            : null
      };
    }
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      meta
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
  let connection;
  try {
    const user = req.user;
    if (user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Hanya mahasiswa yang dapat mengajukan judul skripsi.' });
    }

    const { judul, bidang, latar_belakang, dosen_usulan1_id, dosen_usulan2_id } = req.body;
    if (!judul || !bidang || !latar_belakang || !dosen_usulan1_id || !req.file) {
      return res.status(400).json({ success: false, message: 'Judul, bidang riset, latar belakang, usulan Dosen 1, dan dokumen proposal wajib diisi!' });
    }
    if (judul.trim().length < 15 || latar_belakang.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'Judul minimal 15 karakter dan latar belakang minimal 50 karakter.' });
    }
    if (!user.prodi_id) {
      return res.status(400).json({ success: false, message: 'Akun mahasiswa belum memiliki program studi yang valid.' });
    }

    if (dosen_usulan1_id === dosen_usulan2_id) {
      return res.status(400).json({ success: false, message: 'Dosen Pembimbing 1 dan Pembimbing 2 tidak boleh sama.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);

    const [statusRows] = await connection.query(
      `SELECT status, COUNT(*) AS count
       FROM pengajuan_judul WHERE mahasiswa_id = ? GROUP BY status`,
      [user.id]
    );
    const statusMap = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count)]));
    if ((statusMap.acc || 0) > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Anda sudah memiliki judul yang disetujui. Seluruh pengajuan lain tidak berlaku dan pengajuan baru dikunci.'
      });
    }
    if ((statusMap.menunggu || 0) + (statusMap.revisi || 0) >= 3) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Maksimal tiga judul dapat aktif secara bersamaan. Ajukan kembali setelah salah satunya ditolak atau dibatalkan.'
      });
    }

    const requestedDosenIds = [dosen_usulan1_id, dosen_usulan2_id].filter(Boolean);
    const [dosenRows] = await connection.query(
      `SELECT id FROM users WHERE role = 'dosen' AND status = 'aktif' AND id IN (?)`,
      [requestedDosenIds]
    );
    if (dosenRows.length !== requestedDosenIds.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Usulan dosen harus dipilih dari daftar dosen aktif.' });
    }

    const id = `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dokumenUrl = req.file ? `/storage/proposal/${req.file.filename}` : null;

    await connection.query(
      `INSERT INTO pengajuan_judul
       (id, mahasiswa_id, prodi_id, judul, bidang, latar_belakang, status, tanggal, dosen_usulan1_id, dosen_usulan2_id, dokumen)
       VALUES (?, ?, ?, ?, ?, ?, 'menunggu', DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')), ?, ?, ?)`,
      [
        id,
        user.id,
        user.prodi_id,
        judul.trim(),
        bidang,
        latar_belakang?.trim() || null,
        dosen_usulan1_id,
        dosen_usulan2_id || null,
        dokumenUrl
      ]
    );

    // Record audit log
    await connection.query(
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

    await notifyAdminsForProdi(connection, user.prodi_id, {
      type: 'info',
      title: 'Pengajuan Judul Baru',
      message: `${user.name} (${user.nim || '-'}) mengajukan judul baru untuk diverifikasi.`,
      link: '/admin/verifikasi'
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Pengajuan judul skripsi berhasil dikirim!',
      data: { id, judul: judul.trim(), status: 'menunggu' }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

/**
 * Verify pengajuan judul (by Admin Prodi / Koordinator Skripsi)
 * PUT /api/v1/pengajuan/:id/verify
 */
const verifyPengajuan = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const { status, catatan, dosen_pembimbing1_id, dosen_pembimbing2_id } = req.body;

    if (!['acc', 'revisi', 'ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status verifikasi tidak valid. Gunakan acc, revisi, atau ditolak.' });
    }
    if (status !== 'acc' && !catatan?.trim()) {
      return res.status(400).json({ success: false, message: 'Catatan wajib diisi untuk keputusan revisi atau ditolak.' });
    }
    if (status === 'acc' && !dosen_pembimbing1_id) {
      return res.status(400).json({ success: false, message: 'Pembimbing 1 wajib ditetapkan sebelum judul disetujui.' });
    }
    if (dosen_pembimbing1_id && dosen_pembimbing1_id === dosen_pembimbing2_id) {
      return res.status(400).json({ success: false, message: 'Pembimbing 1 dan Pembimbing 2 tidak boleh sama.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [referenceRows] = await connection.query(
      'SELECT mahasiswa_id FROM pengajuan_judul WHERE id = ?',
      [id]
    );
    if (referenceRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [referenceRows[0].mahasiswa_id]);
    const [rows] = await connection.query('SELECT * FROM pengajuan_judul WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }

    const pengajuan = rows[0];

    if (req.user.role === 'admin' && req.user.prodi_id !== pengajuan.prodi_id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Pengajuan berada di luar program studi Anda.' });
    }

    if (!['menunggu', 'revisi'].includes(pengajuan.status)) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Pengajuan ini sudah memiliki keputusan dan tidak dapat diproses ulang.' });
    }

    let note = null;
    if (status === 'acc') {
      const [acceptedRows] = await connection.query(
        `SELECT id FROM pengajuan_judul
         WHERE mahasiswa_id = ? AND status = 'acc' AND id <> ? LIMIT 1`,
        [pengajuan.mahasiswa_id, id]
      );
      if (acceptedRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Mahasiswa ini sudah memiliki judul lain yang disetujui.' });
      }

      const supervisorIds = [dosen_pembimbing1_id, dosen_pembimbing2_id].filter(Boolean).sort();
      const [supervisorRows] = await connection.query(
        `SELECT id, kuota_max FROM users
         WHERE id IN (?) AND role = 'dosen' AND status = 'aktif'
         ORDER BY id FOR UPDATE`,
        [supervisorIds]
      );
      if (supervisorRows.length !== supervisorIds.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Pembimbing harus dipilih dari daftar dosen aktif.' });
      }

      for (const supervisor of supervisorRows) {
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

      const [bimbinganRows] = await connection.query(
        'SELECT id FROM bimbingan WHERE mahasiswa_id = ? FOR UPDATE',
        [pengajuan.mahasiswa_id]
      );
      let bimbinganId = bimbinganRows[0]?.id;
      if (bimbinganId) {
        await connection.query(
          `UPDATE bimbingan
           SET pengajuan_id = ?, dosen_pembimbing1_id = ?, dosen_pembimbing2_id = ?,
               status_bimbingan = 'bimbingan_berjalan',
               tanggal_plotting = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
           WHERE id = ?`,
          [id, dosen_pembimbing1_id, dosen_pembimbing2_id || null, bimbinganId]
        );
      } else {
        bimbinganId = `BIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await connection.query(
          `INSERT INTO bimbingan
           (id, mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id,
            status_bimbingan, tanggal_plotting)
           VALUES (?, ?, ?, ?, ?, 'bimbingan_berjalan',
                   DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')))`,
          [bimbinganId, pengajuan.mahasiswa_id, id, dosen_pembimbing1_id, dosen_pembimbing2_id || null]
        );
      }

      await connection.query(
        `UPDATE pengajuan_judul
         SET dosen_usulan1_id = ?, dosen_usulan2_id = ?
         WHERE id = ?`,
        [dosen_pembimbing1_id, dosen_pembimbing2_id || null, id]
      );
      note = await createNotaTugasRecord(connection, {
        mahasiswaId: pengajuan.mahasiswa_id,
        pengajuanId: id,
        bimbinganId
      });
    }

    await connection.query('UPDATE pengajuan_judul SET status = ?, catatan = ? WHERE id = ?', [status, catatan || null, id]);
    if (status === 'acc') {
      await connection.query(
        `UPDATE pengajuan_judul
         SET status = 'dibatalkan',
             catatan = 'Tidak berlaku karena judul lain telah disetujui.'
         WHERE mahasiswa_id = ? AND id <> ? AND status IN ('menunggu', 'revisi')`,
        [pengajuan.mahasiswa_id, id]
      );
    }

    // Record audit log
    await connection.query(
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

    await createNotification(connection, {
      userId: pengajuan.mahasiswa_id,
      type: status === 'acc' ? 'success' : status === 'revisi' ? 'warning' : 'danger',
      title: status === 'acc' ? 'Judul Skripsi Disetujui' : status === 'revisi' ? 'Judul Perlu Direvisi' : 'Judul Skripsi Ditolak',
      message: status === 'acc'
        ? 'Judul Anda telah disetujui dan dosen pembimbing telah ditetapkan.'
        : catatan?.trim() || `Pengajuan judul Anda berstatus ${status}.`,
      link: '/mahasiswa/pengajuan'
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: status === 'acc'
        ? 'Judul disetujui, dosen pembimbing ditetapkan, dan Nota Tugas otomatis diterbitkan.'
        : `Pengajuan judul berhasil ditandai ${status}.`,
      data: note ? { nota_tugas_id: note.id, nota_tugas_nomor: note.no_surat } : null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

/**
 * Cancel a waiting pengajuan while preserving its history.
 * DELETE /api/v1/pengajuan/:id
 */
const cancelPengajuan = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [referenceRows] = await connection.query('SELECT mahasiswa_id FROM pengajuan_judul WHERE id = ?', [id]);
    if (referenceRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [referenceRows[0].mahasiswa_id]);
    const [rows] = await connection.query('SELECT * FROM pengajuan_judul WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data pengajuan judul tidak ditemukan.' });
    }

    const pengajuan = rows[0];
    if (req.user.role === 'mahasiswa' && pengajuan.mahasiswa_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk membatalkan pengajuan ini.' });
    }

    if (!['mahasiswa', 'admin', 'superadmin'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk membatalkan pengajuan.' });
    }

    if (pengajuan.status !== 'menunggu') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Hanya pengajuan yang masih menunggu review yang dapat dibatalkan.' });
    }

    await connection.query(
      `UPDATE pengajuan_judul
       SET status = 'dibatalkan', catatan = 'Dibatalkan oleh pengguna.'
       WHERE id = ?`,
      [id]
    );
    await connection.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details)
       VALUES (?, ?, ?, ?, 'CANCEL_PENGAJUAN', ?, ?)`,
      [
        `log-${Date.now()}`,
        req.user.id,
        req.user.name,
        req.user.role,
        req.ip || '127.0.0.1',
        `Membatalkan pengajuan judul ${id}.`
      ]
    );
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Pengajuan judul berhasil dibatalkan.'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

module.exports = {
  getPengajuan,
  createPengajuan,
  verifyPengajuan,
  cancelPengajuan
};
