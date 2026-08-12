const pool = require('../config/database');

const getNotifications = async (req, res, next) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 30;
    const [rows] = await pool.query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    return res.status(200).json({
      success: true,
      count: rows.length,
      unread_count: rows.filter((item) => !item.is_read).length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan.' });
    return res.status(200).json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    next(error);
  }
};

const clearAll = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ success: true, message: 'Semua notifikasi berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, clearAll };
