const pool = require('../config/database');
const {
  getNotaTugasData,
  renderNotaTugasHtml,
  generateNotaTugasPdf
} = require('../services/notaTugasService');

const canAccessNotaTugas = (user, note) => (
  user.role === 'superadmin' ||
  (user.role === 'mahasiswa' && note.mahasiswa_id === user.id) ||
  (user.role === 'admin' && user.prodi_id && String(note.prodi_id) === String(user.prodi_id))
);

/**
 * Return only Nota Tugas records. Legacy research/sidang letters are no longer
 * part of the active product flow.
 */
const getSurat = async (req, res, next) => {
  try {
    const user = req.user;
    if (!['superadmin', 'admin', 'mahasiswa'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke Nota Tugas.' });
    }

    const { status, search } = req.query;
    let query = `
      SELECT s.id, s.no_surat, s.mahasiswa_id, s.pengajuan_id, s.bimbingan_id,
             s.jenis, s.perihal, s.tanggal, s.status, s.template_version, s.created_at,
             u.name AS mahasiswa_nama, u.nim AS mahasiswa_nim, u.avatar AS mahasiswa_avatar,
             pr.nama AS prodi_nama,
             p.judul,
             d1.name AS dosen_pembimbing1_nama,
             d2.name AS dosen_pembimbing2_nama
      FROM manajemen_surat s
      JOIN users u ON s.mahasiswa_id = u.id
      LEFT JOIN prodi pr ON u.prodi_id = pr.id
      LEFT JOIN bimbingan b ON b.id = COALESCE(
        s.bimbingan_id,
        (SELECT b2.id FROM bimbingan b2
         WHERE b2.mahasiswa_id = s.mahasiswa_id
         ORDER BY b2.updated_at DESC LIMIT 1)
      )
      LEFT JOIN pengajuan_judul p ON p.id = COALESCE(s.pengajuan_id, b.pengajuan_id)
      LEFT JOIN users d1 ON d1.id = b.dosen_pembimbing1_id
      LEFT JOIN users d2 ON d2.id = b.dosen_pembimbing2_id
      WHERE s.jenis = 'nota_tugas'
    `;
    const params = [];

    if (user.role === 'mahasiswa') {
      query += ' AND s.mahasiswa_id = ?';
      params.push(user.id);
    } else if (user.role === 'admin') {
      if (!user.prodi_id) query += ' AND 1 = 0';
      else {
        query += ' AND u.prodi_id = ?';
        params.push(user.prodi_id);
      }
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      const term = `%${search}%`;
      query += ' AND (s.no_surat LIKE ? OR u.name LIKE ? OR u.nim LIKE ? OR p.judul LIKE ?)';
      params.push(term, term, term, term);
    }
    query += ' ORDER BY s.tanggal DESC, s.created_at DESC';

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

const getNotaTugasPreview = async (req, res, next) => {
  try {
    const note = await getNotaTugasData(pool, req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Nota Tugas tidak ditemukan.' });
    if (!canAccessNotaTugas(req.user, note)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke Nota Tugas ini.' });
    }
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    return res.status(200).type('html').send(renderNotaTugasHtml(note));
  } catch (error) {
    next(error);
  }
};

const downloadNotaTugasPdf = async (req, res, next) => {
  try {
    const note = await getNotaTugasData(pool, req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Nota Tugas tidak ditemukan.' });
    if (!canAccessNotaTugas(req.user, note)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke Nota Tugas ini.' });
    }

    const pdf = await generateNotaTugasPdf(note);
    const safeNim = String(note.mahasiswa_nim || note.id).replace(/[^A-Za-z0-9_-]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Nota-Tugas-${safeNim}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    return res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
};

const updateSuratStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['draf', 'menunggu_ttd', 'terbit', 'arsip'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status Nota Tugas tidak valid.' });
    }
    const [result] = await pool.query(
      `UPDATE manajemen_surat SET status = ? WHERE id = ? AND jenis = 'nota_tugas'`,
      [status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Nota Tugas tidak ditemukan.' });
    return res.status(200).json({ success: true, message: 'Status Nota Tugas berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSurat,
  getNotaTugasPreview,
  downloadNotaTugasPdf,
  updateSuratStatus
};
