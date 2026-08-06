const pool = require('../config/database');
const { getBabProgress } = require('../utils/babProgress');

const APPROVAL_SELECT = `
  SELECT
    pp.id,
    pp.bimbingan_id,
    pp.mahasiswa_id,
    pp.jenis,
    pp.attempt,
    pp.status AS status_pengajuan,
    pp.tanggal_pengajuan,
    pp.catatan_mahasiswa,
    pp.dokumen,
    pd.id AS keputusan_id,
    pd.dosen_id,
    pd.peran,
    pd.status AS status_keputusan,
    pd.catatan_dosen,
    pd.tanggal_keputusan,
    m.name AS mahasiswa_nama,
    m.nim AS mahasiswa_nim,
    m.avatar AS mahasiswa_avatar,
    pr.nama AS prodi_nama,
    p.judul,
    p.bidang,
    b.status_bimbingan,
    b.no_sk,
    b.tanggal_plotting,
    d1.name AS dosen_pembimbing1_nama,
    d2.name AS dosen_pembimbing2_nama,
    (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id) AS total_sesi,
    (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'disetujui') AS sesi_disetujui,
    (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = 'menunggu_review') AS sesi_menunggu,
    (SELECT COUNT(*) FROM persetujuan_dosen all_pd WHERE all_pd.pengajuan_persetujuan_id = pp.id) AS total_pembimbing,
    (SELECT COUNT(*) FROM persetujuan_dosen all_pd WHERE all_pd.pengajuan_persetujuan_id = pp.id AND all_pd.status = 'disetujui') AS pembimbing_menyetujui
  FROM pengajuan_persetujuan pp
  JOIN persetujuan_dosen pd ON pd.pengajuan_persetujuan_id = pp.id
  JOIN bimbingan b ON pp.bimbingan_id = b.id
  JOIN users m ON pp.mahasiswa_id = m.id
  LEFT JOIN prodi pr ON m.prodi_id = pr.id
  LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
  JOIN users d1 ON b.dosen_pembimbing1_id = d1.id
  LEFT JOIN users d2 ON b.dosen_pembimbing2_id = d2.id
`;

const getPersetujuan = async (req, res, next) => {
  try {
    const { jenis, status, search } = req.query;
    const user = req.user;
    let query = `${APPROVAL_SELECT} WHERE 1 = 1`;
    const params = [];

    if (user.role === 'dosen') {
      query += ' AND pd.dosen_id = ?';
      params.push(user.id);
    } else if (user.role === 'mahasiswa') {
      query += ' AND pp.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      query += ' AND m.prodi_id = ?';
      params.push(user.prodi_id);
    }

    if (jenis) {
      query += ' AND pp.jenis = ?';
      params.push(jenis);
    }
    if (status) {
      query += ' AND pd.status = ?';
      params.push(status);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      query += ' AND (m.name LIKE ? OR m.nim LIKE ? OR p.judul LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY (pd.status = 'menunggu') DESC, pp.tanggal_pengajuan DESC`;
    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map((row) => ({
        ...row,
        total_sesi: Number(row.total_sesi || 0),
        sesi_disetujui: Number(row.sesi_disetujui || 0),
        sesi_menunggu: Number(row.sesi_menunggu || 0),
        total_pembimbing: Number(row.total_pembimbing || 0),
        pembimbing_menyetujui: Number(row.pembimbing_menyetujui || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
};

const getPersetujuanById = async (req, res, next) => {
  try {
    const user = req.user;
    let query = `${APPROVAL_SELECT} WHERE pp.id = ?`;
    const params = [req.params.id];

    if (user.role === 'dosen') {
      query += ' AND pd.dosen_id = ?';
      params.push(user.id);
    } else if (user.role === 'mahasiswa') {
      query += ' AND pp.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'admin' && user.prodi_id) {
      query += ' AND m.prodi_id = ?';
      params.push(user.prodi_id);
    }

    const [rows] = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permohonan persetujuan tidak ditemukan.' });
    }

    const approval = rows[0];
    const [sessions] = await pool.query(
      `SELECT l.id, l.pertemuan, l.tanggal, l.topik, l.bab, l.status,
              l.catatan_mahasiswa, l.catatan_dosen, d.name AS dosen_nama
       FROM logbook_sesi l
       JOIN users d ON l.dosen_id = d.id
       WHERE l.bimbingan_id = ?
       ORDER BY l.tanggal DESC, l.pertemuan DESC`,
      [approval.bimbingan_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...approval,
        total_sesi: Number(approval.total_sesi || 0),
        sesi_disetujui: Number(approval.sesi_disetujui || 0),
        sesi_menunggu: Number(approval.sesi_menunggu || 0),
        total_pembimbing: Number(approval.total_pembimbing || 0),
        pembimbing_menyetujui: Number(approval.pembimbing_menyetujui || 0),
        sesi: sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

const submitPersetujuan = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Hanya mahasiswa yang dapat mengajukan persetujuan tahap.' });
    }

    const { jenis, catatan_mahasiswa, dokumen } = req.body;
    if (!['seminar_proposal', 'sidang_skripsi'].includes(jenis)) {
      return res.status(400).json({ success: false, message: 'Jenis persetujuan harus seminar_proposal atau sidang_skripsi.' });
    }

    await connection.beginTransaction();
    const [bimbinganRows] = await connection.query(
      `SELECT b.*, p.judul
       FROM bimbingan b
       LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
       WHERE b.mahasiswa_id = ?
       FOR UPDATE`,
      [req.user.id]
    );
    if (bimbinganRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Anda belum memiliki bimbingan skripsi yang aktif.' });
    }

    const bimbingan = bimbinganRows[0];
    const [activeRows] = await connection.query(
      `SELECT id, status FROM pengajuan_persetujuan
       WHERE bimbingan_id = ? AND jenis = ? AND status IN ('menunggu', 'disetujui')
       LIMIT 1`,
      [bimbingan.id, jenis]
    );
    if (activeRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Permohonan untuk tahap ini masih aktif atau sudah disetujui.' });
    }

    if (jenis === 'seminar_proposal') {
      const babProgress = await getBabProgress(connection, bimbingan.id);
      const eligible = babProgress.slice(0, 3).every((bab) => bab.status === 'disetujui');
      if (!eligible) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Bab 1, Bab 2, dan Bab 3 harus mendapatkan ACC sebelum Seminar Proposal diajukan.'
        });
      }
    } else {
      const [configRows] = await connection.query(
        `SELECT key_value FROM konfigurasi_sistem WHERE key_name = 'minSesiSidang' LIMIT 1`
      );
      const minimumSesi = Number(configRows[0]?.key_value) || 8;
      const [sessionRows] = await connection.query(
        `SELECT COUNT(*) AS count FROM logbook_sesi
         WHERE bimbingan_id = ? AND status = 'disetujui'`,
        [bimbingan.id]
      );
      if (Number(sessionRows[0]?.count || 0) < minimumSesi) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Minimal ${minimumSesi} sesi bimbingan yang disetujui diperlukan untuk Sidang Skripsi.`
        });
      }
    }

    if (jenis === 'sidang_skripsi') {
      const [seminarRows] = await connection.query(
        `SELECT id FROM pengajuan_persetujuan
         WHERE bimbingan_id = ? AND jenis = 'seminar_proposal' AND status = 'disetujui'
         LIMIT 1`,
        [bimbingan.id]
      );
      if (seminarRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Seminar proposal harus disetujui sebelum mengajukan sidang skripsi.' });
      }
    }

    const [attemptRows] = await connection.query(
      `SELECT COALESCE(MAX(attempt), 0) + 1 AS next_attempt
       FROM pengajuan_persetujuan WHERE bimbingan_id = ? AND jenis = ?`,
      [bimbingan.id, jenis]
    );
    const attempt = Number(attemptRows[0].next_attempt);
    const id = `PER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await connection.query(
      `INSERT INTO pengajuan_persetujuan
       (id, bimbingan_id, mahasiswa_id, jenis, attempt, status, tanggal_pengajuan, catatan_mahasiswa, dokumen)
       VALUES (?, ?, ?, ?, ?, 'menunggu', CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'), ?, ?)`,
      [id, bimbingan.id, req.user.id, jenis, attempt, catatan_mahasiswa || null, dokumen || null]
    );

    const dosen = [
      { id: bimbingan.dosen_pembimbing1_id, peran: 'pembimbing_1' },
      { id: bimbingan.dosen_pembimbing2_id, peran: 'pembimbing_2' }
    ].filter((item) => item.id);

    for (const [index, item] of dosen.entries()) {
      await connection.query(
        `INSERT INTO persetujuan_dosen
         (id, pengajuan_persetujuan_id, dosen_id, peran, status)
         VALUES (?, ?, ?, ?, 'menunggu')`,
        [`KEP-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`, id, item.id, item.peran]
      );
    }

    await connection.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details)
       VALUES (?, ?, ?, ?, 'CREATE_PERSETUJUAN', ?, ?)`,
      [
        `log-${Date.now()}`,
        req.user.id,
        req.user.name,
        req.user.role,
        req.ip || '127.0.0.1',
        `Mengajukan ${jenis === 'seminar_proposal' ? 'Seminar Proposal' : 'Sidang Skripsi'} untuk bimbingan ${bimbingan.id}.`
      ]
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Permohonan persetujuan berhasil dikirim.', data: { id, jenis, attempt } });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

const decidePersetujuan = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { status, catatan_dosen } = req.body;
    if (!['disetujui', 'ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Keputusan harus disetujui atau ditolak.' });
    }
    if (status === 'ditolak' && !catatan_dosen?.trim()) {
      return res.status(400).json({ success: false, message: 'Catatan dosen wajib diisi ketika menolak permohonan.' });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT pp.id, pp.bimbingan_id, pp.jenis, pp.status AS status_pengajuan,
              pd.id AS keputusan_id, pd.status AS status_keputusan
       FROM pengajuan_persetujuan pp
       JOIN persetujuan_dosen pd ON pd.pengajuan_persetujuan_id = pp.id
       WHERE pp.id = ? AND pd.dosen_id = ?
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Permohonan tidak ditemukan dalam daftar persetujuan Anda.' });
    }

    const approval = rows[0];
    if (approval.status_pengajuan !== 'menunggu' || approval.status_keputusan !== 'menunggu') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Permohonan ini sudah memiliki keputusan final.' });
    }

    await connection.query(
      `UPDATE persetujuan_dosen
       SET status = ?, catatan_dosen = ?,
           tanggal_keputusan = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')
       WHERE id = ?`,
      [status, catatan_dosen?.trim() || null, approval.keputusan_id]
    );

    const [decisionRows] = await connection.query(
      `SELECT COUNT(*) AS total,
              SUM(status = 'disetujui') AS disetujui,
              SUM(status = 'ditolak') AS ditolak
       FROM persetujuan_dosen WHERE pengajuan_persetujuan_id = ?`,
      [approval.id]
    );
    const decision = decisionRows[0];
    let aggregateStatus = 'menunggu';
    if (Number(decision.ditolak || 0) > 0) aggregateStatus = 'ditolak';
    else if (Number(decision.disetujui || 0) === Number(decision.total || 0)) aggregateStatus = 'disetujui';

    await connection.query('UPDATE pengajuan_persetujuan SET status = ? WHERE id = ?', [aggregateStatus, approval.id]);

    if (aggregateStatus === 'disetujui') {
      const nextStage = approval.jenis === 'seminar_proposal' ? 'sempro' : 'sidang';
      await connection.query('UPDATE bimbingan SET status_bimbingan = ? WHERE id = ?', [nextStage, approval.bimbingan_id]);
    }

    await connection.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details)
       VALUES (?, ?, ?, ?, 'DECIDE_PERSETUJUAN', ?, ?)`,
      [
        `log-${Date.now()}`,
        req.user.id,
        req.user.name,
        req.user.role,
        req.ip || '127.0.0.1',
        `Memberikan keputusan ${status} untuk ${approval.jenis} pada permohonan ${approval.id}.`
      ]
    );

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: status === 'disetujui' ? 'Persetujuan berhasil diberikan.' : 'Permohonan telah ditolak.',
      data: { status_keputusan: status, status_pengajuan: aggregateStatus }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

const accSempro = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [bimbinganRows] = await connection.query(
      `SELECT * FROM bimbingan WHERE id = ? FOR UPDATE`,
      [req.params.bimbinganId]
    );
    if (bimbinganRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data bimbingan tidak ditemukan.' });
    }

    const bimbingan = bimbinganRows[0];
    const supervisorIds = [bimbingan.dosen_pembimbing1_id, bimbingan.dosen_pembimbing2_id].filter(Boolean);
    if (!supervisorIds.includes(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Anda bukan dosen pembimbing mahasiswa ini.' });
    }

    const babProgress = await getBabProgress(connection, bimbingan.id);
    const eligible = babProgress.slice(0, 3).every((bab) => bab.status === 'disetujui');
    if (!eligible) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ACC Sempro baru tersedia setelah sesi terbaru Bab 1, Bab 2, dan Bab 3 seluruhnya disetujui.'
      });
    }

    let [requestRows] = await connection.query(
      `SELECT * FROM pengajuan_persetujuan
       WHERE bimbingan_id = ? AND jenis = 'seminar_proposal'
         AND status IN ('menunggu', 'disetujui')
       ORDER BY attempt DESC LIMIT 1 FOR UPDATE`,
      [bimbingan.id]
    );

    let request = requestRows[0];
    if (!request) {
      const [attemptRows] = await connection.query(
        `SELECT COALESCE(MAX(attempt), 0) + 1 AS next_attempt
         FROM pengajuan_persetujuan
         WHERE bimbingan_id = ? AND jenis = 'seminar_proposal'`,
        [bimbingan.id]
      );
      const requestId = `PER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await connection.query(
        `INSERT INTO pengajuan_persetujuan
         (id, bimbingan_id, mahasiswa_id, jenis, attempt, status, tanggal_pengajuan, catatan_mahasiswa)
         VALUES (?, ?, ?, 'seminar_proposal', ?, 'menunggu',
                 CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'),
                 'Kelayakan Sempro terbentuk otomatis setelah Bab 1 sampai Bab 3 memperoleh ACC.')`,
        [requestId, bimbingan.id, bimbingan.mahasiswa_id, Number(attemptRows[0].next_attempt)]
      );

      const supervisors = [
        { id: bimbingan.dosen_pembimbing1_id, role: 'pembimbing_1' },
        { id: bimbingan.dosen_pembimbing2_id, role: 'pembimbing_2' }
      ].filter((item) => item.id);
      for (const [index, supervisor] of supervisors.entries()) {
        await connection.query(
          `INSERT INTO persetujuan_dosen
           (id, pengajuan_persetujuan_id, dosen_id, peran, status)
           VALUES (?, ?, ?, ?, 'menunggu')`,
          [`KEP-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`, requestId, supervisor.id, supervisor.role]
        );
      }
      request = { id: requestId, status: 'menunggu' };
    }

    const [decisionRows] = await connection.query(
      `SELECT id, status FROM persetujuan_dosen
       WHERE pengajuan_persetujuan_id = ? AND dosen_id = ? FOR UPDATE`,
      [request.id, req.user.id]
    );
    const ownDecision = decisionRows[0];
    if (!ownDecision) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Data keputusan dosen belum terbentuk dengan benar. Silakan muat ulang dan coba kembali.'
      });
    }
    if (ownDecision?.status === 'disetujui') {
      await connection.commit();
      return res.status(200).json({ success: true, message: 'ACC Sempro Anda sudah tersimpan.' });
    }

    await connection.query(
      `UPDATE persetujuan_dosen
       SET status = 'disetujui', catatan_dosen = ?,
           tanggal_keputusan = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')
       WHERE id = ?`,
      [req.body.catatan_dosen?.trim() || 'Bab 1 sampai Bab 3 telah memenuhi kelayakan Seminar Proposal.', ownDecision.id]
    );

    const [aggregateRows] = await connection.query(
      `SELECT COUNT(*) AS total, SUM(status = 'disetujui') AS approved
       FROM persetujuan_dosen WHERE pengajuan_persetujuan_id = ?`,
      [request.id]
    );
    const fullyApproved = Number(aggregateRows[0].total) === Number(aggregateRows[0].approved);
    await connection.query(
      `UPDATE pengajuan_persetujuan SET status = ? WHERE id = ?`,
      [fullyApproved ? 'disetujui' : 'menunggu', request.id]
    );
    if (fullyApproved) {
      await connection.query(`UPDATE bimbingan SET status_bimbingan = 'sempro' WHERE id = ?`, [bimbingan.id]);
    }

    await connection.query(
      `INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details)
       VALUES (?, ?, ?, ?, 'ACC_SEMPRO', ?, ?)`,
      [
        `log-${Date.now()}`,
        req.user.id,
        req.user.name,
        req.user.role,
        req.ip || '127.0.0.1',
        `Memberikan ACC Seminar Proposal untuk bimbingan ${bimbingan.id}.`
      ]
    );

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: fullyApproved
        ? 'Seminar Proposal telah disetujui seluruh dosen pembimbing.'
        : 'ACC Sempro Anda tersimpan. Menunggu persetujuan dosen pembimbing lainnya.',
      data: { fully_approved: fullyApproved }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

module.exports = {
  getPersetujuan,
  getPersetujuanById,
  submitPersetujuan,
  decidePersetujuan,
  accSempro
};
