const pool = require('../config/database');

/**
 * Get all system configurations as key-value object
 * GET /api/v1/config
 */
const getConfigs = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT key_name, key_value, description FROM konfigurasi_sistem');
    
    // Transform array to object { key: value }
    const configObj = {};
    rows.forEach(item => {
      configObj[item.key_name] = item.key_value;
    });

    return res.status(200).json({
      success: true,
      data: configObj,
      raw: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update system configurations (accepts object { key: value })
 * PUT /api/v1/config
 */
const updateConfigs = async (req, res, next) => {
  try {
    const configData = req.body; // e.g. { maxKuotaDosen: '12', minSesiSidang: '8' }
    
    if (!configData || typeof configData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Format data konfigurasi tidak valid. Harus berupa objek key-value.'
      });
    }

    const keys = Object.keys(configData);
    for (const key of keys) {
      const val = String(configData[key]);
      await pool.query(
        'INSERT INTO konfigurasi_sistem (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)',
        [key, val]
      );
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
        'UPDATE_CONFIG',
        req.ip || '127.0.0.1',
        `Memperbarui parameter konfigurasi sistem: ${keys.join(', ')}.`
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Konfigurasi sistem berhasil disimpan!'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConfigs,
  updateConfigs
};
