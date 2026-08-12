const createNotification = async (db, { userId, type = 'info', title, message, link = null }) => {
  if (userId === null || userId === undefined || !title || !message) return null;
  const id = `notif-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await db.query(
    `INSERT INTO notifications (id, user_id, type, title, message, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, type, title, message, link]
  );
  return id;
};

const notifyAdminsForProdi = async (db, prodiId, notification) => {
  const [admins] = await db.query(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'aktif' AND prodi_id = ?`,
    [prodiId]
  );
  for (const admin of admins) {
    await createNotification(db, { ...notification, userId: admin.id });
  }
};

module.exports = { createNotification, notifyAdminsForProdi };
