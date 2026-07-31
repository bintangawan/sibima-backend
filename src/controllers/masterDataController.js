const pool = require('../config/database');

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
  try {
    const { kode, nama, mulai, selesai, status } = req.body;
    if (!kode || !nama || !mulai || !selesai) {
      return res.status(400).json({ success: false, message: 'Semua kolom tahun ajaran wajib diisi!' });
    }
    const [result] = await pool.query(
      'INSERT INTO tahun_ajaran (kode, nama, mulai, selesai, status) VALUES (?, ?, ?, ?, ?)',
      [kode, nama, mulai, selesai, status || 'draf']
    );
    return res.status(201).json({ success: true, message: 'Tahun ajaran berhasil ditambahkan!', data: { id: result.insertId, kode, nama } });
  } catch (error) { next(error); }
};

const updateTahunAjaran = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kode, nama, mulai, selesai, status } = req.body;
    await pool.query(
      `UPDATE tahun_ajaran SET kode = COALESCE(?, kode), nama = COALESCE(?, nama), 
       mulai = COALESCE(?, mulai), selesai = COALESCE(?, selesai), status = COALESCE(?, status) WHERE id = ?`,
      [kode, nama, mulai, selesai, status, id]
    );
    return res.status(200).json({ success: true, message: 'Tahun ajaran berhasil diperbarui!' });
  } catch (error) { next(error); }
};

const deleteTahunAjaran = async (req, res, next) => {
  try {
    const { id } = req.params;
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
