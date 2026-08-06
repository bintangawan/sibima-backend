const pool = require('../config/database');
const { parseBabNumber, buildBabProgress, getBabProgress } = require('../utils/babProgress');

const getMinimumSesi = async () => {
  const [rows] = await pool.query(
    `SELECT key_value FROM konfigurasi_sistem WHERE key_name = 'minSesiSidang' LIMIT 1`
  );
  const value = Number(rows[0]?.key_value);
  return Number.isFinite(value) && value > 0 ? value : 8;
};

/**
 * Get the real list of students supervised by the authenticated lecturer.
 * GET /api/v1/logbook/bimbingan
 */
const getDosenBimbingan = async (req, res, next) => {
  try {
    const user = req.user;
    let roleFilter = '';
    const params = [];

    if (user.role === 'dosen') {
      roleFilter = 'AND (b.dosen_pembimbing1_id = ? OR b.dosen_pembimbing2_id = ?)';
      params.push(user.id, user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      roleFilter = 'AND m.prodi_id = ?';
      params.push(user.prodi_id);
    }

    const [rows] = await pool.query(
      `SELECT
         b.id AS bimbingan_id,
         b.mahasiswa_id,
         b.dosen_pembimbing1_id,
         b.dosen_pembimbing2_id,
         b.status_bimbingan,
         b.tanggal_plotting,
         m.name AS mahasiswa_nama,
         m.nim AS mahasiswa_nim,
         m.avatar AS mahasiswa_avatar,
         pr.nama AS prodi_nama,
         p.judul,
         p.bidang,
         CASE
           WHEN b.dosen_pembimbing1_id = ? THEN 'pembimbing_1'
           WHEN b.dosen_pembimbing2_id = ? THEN 'pembimbing_2'
           ELSE NULL
         END AS peran,
         (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id) AS total_sesi,
         (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'disetujui') AS sesi_disetujui,
         (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.dosen_id = ? AND l.status = 'menunggu_review') AS menunggu_review,
         (SELECT l.bab FROM logbook_sesi l WHERE l.bimbingan_id = b.id ORDER BY l.tanggal DESC, l.pertemuan DESC LIMIT 1) AS bab_terakhir,
         (SELECT l.status FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.bab LIKE 'Bab 1%' ORDER BY l.pertemuan DESC LIMIT 1) AS bab1_status,
         (SELECT l.status FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.bab LIKE 'Bab 2%' ORDER BY l.pertemuan DESC LIMIT 1) AS bab2_status,
         (SELECT l.status FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.bab LIKE 'Bab 3%' ORDER BY l.pertemuan DESC LIMIT 1) AS bab3_status,
         (SELECT pd.status
          FROM pengajuan_persetujuan pp
          JOIN persetujuan_dosen pd ON pd.pengajuan_persetujuan_id = pp.id
          WHERE pp.bimbingan_id = b.id AND pp.jenis = 'seminar_proposal' AND pd.dosen_id = ?
          ORDER BY pp.attempt DESC LIMIT 1) AS sempro_status_keputusan
       FROM bimbingan b
       JOIN users m ON b.mahasiswa_id = m.id
       LEFT JOIN prodi pr ON m.prodi_id = pr.id
       LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
       WHERE 1 = 1 ${roleFilter}
       ORDER BY m.name ASC`,
      [user.id, user.id, user.id, user.id, ...params]
    );

    const minimumSesi = await getMinimumSesi();
    const data = rows.map((row) => ({
      ...row,
      total_sesi: Number(row.total_sesi || 0),
      sesi_disetujui: Number(row.sesi_disetujui || 0),
      menunggu_review: Number(row.menunggu_review || 0),
      target_sesi: minimumSesi,
      sempro_eligible: [row.bab1_status, row.bab2_status, row.bab3_status].every((status) => status === 'disetujui'),
      progress: Math.min(100, Math.round((Number(row.sesi_disetujui || 0) / minimumSesi) * 100))
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a supervised student's thesis summary and real logbook sessions.
 * GET /api/v1/logbook/mahasiswa/:mahasiswaRef
 */
const getMahasiswaLogbook = async (req, res, next) => {
  try {
    const { mahasiswaRef } = req.params;
    const user = req.user;
    let accessFilter = '';
    const params = [user.id, user.id, mahasiswaRef, mahasiswaRef];

    if (user.role === 'dosen') {
      accessFilter = 'AND (b.dosen_pembimbing1_id = ? OR b.dosen_pembimbing2_id = ?)';
      params.push(user.id, user.id);
    } else if (user.role === 'mahasiswa') {
      accessFilter = 'AND m.id = ?';
      params.push(user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      accessFilter = 'AND m.prodi_id = ?';
      params.push(user.prodi_id);
    }

    const [rows] = await pool.query(
      `SELECT
         b.id AS bimbingan_id,
         b.mahasiswa_id,
         b.dosen_pembimbing1_id,
         b.dosen_pembimbing2_id,
         b.status_bimbingan,
         b.tanggal_plotting,
         m.name AS mahasiswa_nama,
         m.nim AS mahasiswa_nim,
         m.avatar AS mahasiswa_avatar,
         pr.nama AS prodi_nama,
         p.judul,
         p.bidang,
         d1.name AS dosen_pembimbing1_nama,
         d2.name AS dosen_pembimbing2_nama,
         CASE
           WHEN b.dosen_pembimbing1_id = ? THEN 'pembimbing_1'
           WHEN b.dosen_pembimbing2_id = ? THEN 'pembimbing_2'
           ELSE NULL
         END AS peran,
         (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id) AS total_sesi,
         (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'disetujui') AS sesi_disetujui,
         (SELECT l.bab FROM logbook_sesi l WHERE l.bimbingan_id = b.id ORDER BY l.tanggal DESC, l.pertemuan DESC LIMIT 1) AS bab_terakhir
       FROM bimbingan b
       JOIN users m ON b.mahasiswa_id = m.id
       LEFT JOIN prodi pr ON m.prodi_id = pr.id
       LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
       JOIN users d1 ON b.dosen_pembimbing1_id = d1.id
       LEFT JOIN users d2 ON b.dosen_pembimbing2_id = d2.id
       WHERE (m.nim = ? OR m.id = ?) ${accessFilter}
       LIMIT 1`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mahasiswa tidak ditemukan atau bukan bagian dari bimbingan Anda.'
      });
    }

    const summary = rows[0];
    let sessionFilter = '';
    const sessionParams = [summary.bimbingan_id];
    if (user.role === 'dosen') {
      sessionFilter = 'AND l.dosen_id = ?';
      sessionParams.push(user.id);
    }

    const [sessions] = await pool.query(
      `SELECT l.*, d.name AS dosen_nama, d.nip AS dosen_nip
       FROM logbook_sesi l
       JOIN users d ON l.dosen_id = d.id
       WHERE l.bimbingan_id = ? ${sessionFilter}
       ORDER BY l.tanggal DESC, l.pertemuan DESC`,
      sessionParams
    );

    const [allProgressSessions] = user.role === 'dosen'
      ? await pool.query(
          `SELECT id, bab, status, pertemuan FROM logbook_sesi
           WHERE bimbingan_id = ? ORDER BY pertemuan DESC`,
          [summary.bimbingan_id]
        )
      : [sessions];
    const babProgress = buildBabProgress(allProgressSessions);
    const semproEligible = babProgress.slice(0, 3).every((bab) => bab.status === 'disetujui');

    const [semproRows] = await pool.query(
      `SELECT pp.id, pp.status AS status_pengajuan,
              pd.status AS status_keputusan, pd.tanggal_keputusan
       FROM pengajuan_persetujuan pp
       LEFT JOIN persetujuan_dosen pd
         ON pd.pengajuan_persetujuan_id = pp.id AND pd.dosen_id = ?
       WHERE pp.bimbingan_id = ? AND pp.jenis = 'seminar_proposal'
       ORDER BY pp.attempt DESC LIMIT 1`,
      [user.role === 'dosen' ? user.id : '', summary.bimbingan_id]
    );

    const minimumSesi = await getMinimumSesi();
    const approved = Number(summary.sesi_disetujui || 0);
    return res.status(200).json({
      success: true,
      data: {
        mahasiswa: {
          ...summary,
          total_sesi: Number(summary.total_sesi || 0),
          sesi_disetujui: approved,
          target_sesi: minimumSesi,
          progress: Math.min(100, Math.round((approved / minimumSesi) * 100))
        },
        sesi: sessions,
        bab_progress: babProgress,
        sempro_eligible: semproEligible,
        sempro: semproRows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

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
              u.prodi_id as mahasiswa_prodi_id,
              d.name as dosen_nama, d.nip as dosen_nip,
              b.dosen_pembimbing1_id, b.dosen_pembimbing2_id
       FROM logbook_sesi l
       JOIN users u ON l.mahasiswa_id = u.id
       JOIN users d ON l.dosen_id = d.id
       JOIN bimbingan b ON l.bimbingan_id = b.id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sesi logbook tidak ditemukan.' });
    }

    const logbook = rows[0];
    const isAllowed =
      req.user.role === 'superadmin' ||
      (req.user.role === 'mahasiswa' && logbook.mahasiswa_id === req.user.id) ||
      (req.user.role === 'dosen' && logbook.dosen_id === req.user.id) ||
      (req.user.role === 'admin' && logbook.mahasiswa_prodi_id === req.user.prodi_id);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses ke sesi logbook ini.' });
    }

    return res.status(200).json({ success: true, data: logbook });
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
    if (!topik || !bab || !catatan_mahasiswa) {
      return res.status(400).json({ success: false, message: 'Topik, bab, dan catatan bimbingan wajib diisi!' });
    }

    // Get user active bimbingan
    const [bimRows] = await pool.query('SELECT id, dosen_pembimbing1_id, dosen_pembimbing2_id FROM bimbingan WHERE mahasiswa_id = ?', [user.id]);
    if (bimRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Anda belum memiliki penetapan resmi (plotting) Dosen Pembimbing.' });
    }

    const bimbingan = bimRows[0];
    const targetDosenId = dosen_id || bimbingan.dosen_pembimbing1_id;

    if (![bimbingan.dosen_pembimbing1_id, bimbingan.dosen_pembimbing2_id].filter(Boolean).includes(targetDosenId)) {
      return res.status(400).json({
        success: false,
        message: 'Dosen tujuan harus merupakan Pembimbing 1 atau Pembimbing 2 yang resmi.'
      });
    }

    const requestedBab = parseBabNumber(bab);
    if (!requestedBab) {
      return res.status(400).json({ success: false, message: 'Bab skripsi harus berada pada rentang Bab 1 sampai Bab 5.' });
    }

    const babProgress = await getBabProgress(pool, bimbingan.id);
    const targetProgress = babProgress.find((item) => item.number === requestedBab);
    if (!targetProgress?.unlocked) {
      const blockingChapter = babProgress
        .slice(0, requestedBab - 1)
        .find((item) => item.status !== 'disetujui');
      return res.status(400).json({
        success: false,
        message: `Bab ${requestedBab} belum dapat diajukan. Bab ${blockingChapter?.number || requestedBab - 1} harus mendapat ACC terlebih dahulu.`
      });
    }
    if (targetProgress.status === 'menunggu_review') {
      return res.status(409).json({
        success: false,
        message: `Sesi terbaru Bab ${requestedBab} masih menunggu review dosen. Tunggu keputusan sebelum mengirim sesi berikutnya.`
      });
    }

    // Calculate next pertemuan number
    const [maxRows] = await pool.query(
      'SELECT COALESCE(MAX(pertemuan), 0) + 1 as next_pertemuan FROM logbook_sesi WHERE bimbingan_id = ?',
      [bimbingan.id]
    );
    const pertemuan = maxRows[0].next_pertemuan;

    const id = 'sesi-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
    const dokumenUrl = req.file ? `/storage/logbook/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO logbook_sesi (id, bimbingan_id, mahasiswa_id, dosen_id, pertemuan, tanggal, topik, bab, status, dokumen, catatan_mahasiswa)
       VALUES (?, ?, ?, ?, ?, DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')), ?, ?, ?, ?, ?)`,
      [
        id,
        bimbingan.id,
        user.id,
        targetDosenId,
        pertemuan,
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
      data: { id, pertemuan, topik, bab, status: 'menunggu_review' }
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
    const { status, catatan_dosen, checklist_revisi = [] } = req.body;

    if (!['disetujui', 'revisi'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status review tidak valid. Gunakan "disetujui" atau "revisi".' });
    }

    if (!catatan_dosen || !catatan_dosen.trim()) {
      return res.status(400).json({ success: false, message: 'Catatan feedback dosen wajib diisi.' });
    }

    const [rows] = await pool.query('SELECT * FROM logbook_sesi WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sesi logbook tidak ditemukan.' });
    }

    const sesi = rows[0];
    if (req.user.role === 'dosen' && sesi.dosen_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk mereview sesi bimbingan mahasiswa ini.' });
    }

    const normalizedChecklist = Array.isArray(checklist_revisi)
      ? checklist_revisi
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    await pool.query(
      'UPDATE logbook_sesi SET status = ?, catatan_dosen = ?, checklist_revisi = ? WHERE id = ?',
      [status, catatan_dosen.trim(), normalizedChecklist.length ? JSON.stringify(normalizedChecklist) : null, id]
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
        'REVIEW_SESI',
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
  getDosenBimbingan,
  getMahasiswaLogbook,
  getLogbooks,
  getLogbookById,
  createLogbook,
  reviewLogbook
};
