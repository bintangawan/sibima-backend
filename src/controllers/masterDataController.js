const pool = require('../config/database');

// ============================================================================
// MASTER DATA SUMMARY
// ============================================================================
const getSummary = async (req, res, next) => {
  try {
    const [[userCounts], [prodiCount], [activeSemester]] = await Promise.all([
      pool.query(`
        SELECT
          SUM(role = 'dosen' AND status = 'aktif') AS total_dosen_aktif,
          SUM(role = 'mahasiswa' AND status = 'aktif') AS total_mahasiswa_aktif
        FROM users
      `),
      pool.query('SELECT COUNT(*) AS total_prodi FROM prodi'),
      pool.query(`
        SELECT id, kode, nama, mulai, selesai
        FROM tahun_ajaran
        WHERE status = 'aktif'
        ORDER BY mulai DESC
        LIMIT 1
      `)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total_dosen_aktif: Number(userCounts[0]?.total_dosen_aktif || 0),
        total_mahasiswa_aktif: Number(userCounts[0]?.total_mahasiswa_aktif || 0),
        total_prodi: Number(prodiCount[0]?.total_prodi || 0),
        tahun_ajaran_aktif: activeSemester[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

const getActiveDosen = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.nip, u.keahlian, u.kuota_max, u.prodi_id,
              p.nama AS prodi_nama,
              (SELECT COUNT(*) FROM bimbingan b
               WHERE (b.dosen_pembimbing1_id = u.id OR b.dosen_pembimbing2_id = u.id)
                 AND b.status_bimbingan <> 'selesai') AS current_bimbingan_count
       FROM users u
       LEFT JOIN prodi p ON u.prodi_id = p.id
       WHERE u.role = 'dosen' AND u.status = 'aktif'
       ORDER BY u.name ASC`
    );
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PRODI MANAGEMENT
// ============================================================================
const getProdi = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, f.nama as fakultas_nama 
      FROM prodi p 
      LEFT JOIN fakultas f ON p.fakultas_id = f.id 
      ORDER BY p.id ASC
    `);
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) { next(error); }
};

const createProdi = async (req, res, next) => {
  try {
    const { fakultas_id, kode, nama, jenjang, kaprodi_name } = req.body;
    if (!fakultas_id || !kode || !nama) {
      return res.status(400).json({ success: false, message: 'Fakultas, kode, dan nama prodi wajib diisi!' });
    }
    const [result] = await pool.query(
      'INSERT INTO prodi (fakultas_id, kode, nama, jenjang, kaprodi_name) VALUES (?, ?, ?, ?, ?)',
      [fakultas_id, kode, nama, jenjang || 'S1', kaprodi_name || null]
    );
    return res.status(201).json({ success: true, message: 'Program studi berhasil ditambahkan!', data: { id: result.insertId, kode, nama } });
  } catch (error) { next(error); }
};

const updateProdi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fakultas_id, kode, nama, jenjang, kaprodi_name } = req.body;
    await pool.query(
      `UPDATE prodi SET fakultas_id = COALESCE(?, fakultas_id), kode = COALESCE(?, kode), 
       nama = COALESCE(?, nama), jenjang = COALESCE(?, jenjang), kaprodi_name = COALESCE(?, kaprodi_name) WHERE id = ?`,
      [fakultas_id, kode, nama, jenjang, kaprodi_name, id]
    );
    return res.status(200).json({ success: true, message: 'Program studi berhasil diperbarui!' });
  } catch (error) { next(error); }
};

const deleteProdi = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM prodi WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Program studi berhasil dihapus!' });
  } catch (error) { next(error); }
};

// ============================================================================
// TAHUN AJARAN MANAGEMENT
// ============================================================================
const getTahunAjaran = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tahun_ajaran ORDER BY mulai DESC');
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) { next(error); }
};

const createTahunAjaran = async (req, res, next) => {
  let connection;
  try {
    const { kode, nama, mulai, selesai, status } = req.body;
    if (!kode || !nama || !mulai || !selesai) {
      return res.status(400).json({ success: false, message: 'Semua kolom tahun ajaran wajib diisi!' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    if (status === 'aktif') {
      await connection.query("UPDATE tahun_ajaran SET status = 'arsip' WHERE status = 'aktif'");
    }
    const [result] = await connection.query(
      'INSERT INTO tahun_ajaran (kode, nama, mulai, selesai, status) VALUES (?, ?, ?, ?, ?)',
      [kode, nama, mulai, selesai, status || 'draf']
    );
    await connection.commit();
    return res.status(201).json({ success: true, message: 'Tahun ajaran berhasil ditambahkan!', data: { id: result.insertId, kode, nama } });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

const updateTahunAjaran = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const { kode, nama, mulai, selesai, status } = req.body;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.query('SELECT id FROM tahun_ajaran WHERE id = ? FOR UPDATE', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Tahun ajaran tidak ditemukan.' });
    }
    if (status === 'aktif') {
      await connection.query("UPDATE tahun_ajaran SET status = 'arsip' WHERE status = 'aktif' AND id <> ?", [id]);
    }
    await connection.query(
      `UPDATE tahun_ajaran SET kode = COALESCE(?, kode), nama = COALESCE(?, nama), 
       mulai = COALESCE(?, mulai), selesai = COALESCE(?, selesai), status = COALESCE(?, status) WHERE id = ?`,
      [kode, nama, mulai, selesai, status, id]
    );
    await connection.commit();
    return res.status(200).json({ success: true, message: 'Tahun ajaran berhasil diperbarui!' });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

const deleteTahunAjaran = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT status FROM tahun_ajaran WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tahun ajaran tidak ditemukan.' });
    if (rows[0].status === 'aktif') return res.status(409).json({ success: false, message: 'Tahun ajaran yang sedang aktif tidak dapat dihapus.' });
    await pool.query('DELETE FROM tahun_ajaran WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Tahun ajaran berhasil dihapus!' });
  } catch (error) { next(error); }
};

// ============================================================================
// FAKULTAS MANAGEMENT
// ============================================================================
const getFakultas = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fakultas ORDER BY id ASC');
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) { next(error); }
};

module.exports = {
  getSummary,
  getActiveDosen,
  getProdi,
  createProdi,
  updateProdi,
  deleteProdi,
  getTahunAjaran,
  createTahunAjaran,
  updateTahunAjaran,
  deleteTahunAjaran,
  getFakultas
};
