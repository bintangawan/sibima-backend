const pool = require('../config/database');

/**
 * Get dashboard statistics based on logged-in user role
 * GET /api/v1/dashboard/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;
    let stats = {};
    let recentActivities = [];
    let extraData = {};

    if (role === 'superadmin') {
      // 1. Superadmin stats: total users across roles, total prodi, total bimbingan, total pengajuan
      const [userCounts] = await pool.query(`
        SELECT role, COUNT(*) as count FROM users GROUP BY role
      `);
      const userMap = { superadmin: 0, admin: 0, dosen: 0, mahasiswa: 0 };
      userCounts.forEach(r => { userMap[r.role] = r.count; });

      const [prodiCount] = await pool.query('SELECT COUNT(*) as count FROM prodi');
      const [pengajuanCount] = await pool.query('SELECT status, COUNT(*) as count FROM pengajuan_judul GROUP BY status');
      const pengajuanMap = { menunggu: 0, acc: 0, ditolak: 0 };
      pengajuanCount.forEach(r => { pengajuanMap[r.status] = r.count; });

      const [bimbinganCount] = await pool.query('SELECT COUNT(*) as count FROM bimbingan WHERE status_bimbingan = "bimbingan_berjalan"');
      const [logbookCount] = await pool.query('SELECT COUNT(*) as count FROM logbook_sesi');
      const [suratCount] = await pool.query('SELECT COUNT(*) as count FROM manajemen_surat');

      // Recent audit logs
      const [logs] = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5');

      stats = {
        totalMahasiswa: userMap.mahasiswa || 0,
        totalDosen: userMap.dosen || 0,
        totalAdmin: userMap.admin || 0,
        totalProdi: prodiCount[0].count || 0,
        pengajuanMenunggu: pengajuanMap.menunggu || 0,
        pengajuanDisetujui: pengajuanMap.acc || 0,
        bimbinganAktif: bimbinganCount[0].count || 0,
        totalSesiLogbook: logbookCount[0].count || 0,
        totalSuratTerbit: suratCount[0].count || 0
      };
      recentActivities = logs;

    } else if (role === 'admin') {
      // 2. Admin Prodi stats: filtered by prodi_id
      const prodiId = user.prodi_id || 1;
      const [mahasiswaCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "mahasiswa" AND prodi_id = ?', [prodiId]);
      const [dosenCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "dosen"');
      const [pengajuanCount] = await pool.query('SELECT status, COUNT(*) as count FROM pengajuan_judul WHERE prodi_id = ? GROUP BY status', [prodiId]);
      const pengajuanMap = { menunggu: 0, acc: 0, ditolak: 0 };
      pengajuanCount.forEach(r => { pengajuanMap[r.status] = r.count; });

      const [bimbinganCount] = await pool.query(`
        SELECT COUNT(*) as count FROM bimbingan b 
        JOIN users u ON b.mahasiswa_id = u.id 
        WHERE u.prodi_id = ? AND b.status_bimbingan = "bimbingan_berjalan"
      `, [prodiId]);

      // Dosen Quota summary
      const [dosenList] = await pool.query(`
        SELECT u.id, u.name, u.nip, u.kuota_max,
               (SELECT COUNT(*) FROM bimbingan b WHERE b.dosen_pembimbing1_id = u.id OR b.dosen_pembimbing2_id = u.id) as bimbingan_aktif
        FROM users u 
        WHERE u.role = "dosen" AND u.status = "aktif"
        ORDER BY bimbingan_aktif DESC LIMIT 5
      `);

      // Pending verification list
      const [pendingList] = await pool.query(`
        SELECT p.*, u.name as mahasiswa_nama, u.nim as mahasiswa_nim 
        FROM pengajuan_judul p 
        JOIN users u ON p.mahasiswa_id = u.id 
        WHERE p.prodi_id = ? AND p.status = "menunggu" 
        ORDER BY p.created_at ASC LIMIT 5
      `, [prodiId]);

      stats = {
        totalMahasiswaProdi: mahasiswaCount[0].count || 0,
        totalDosen: dosenCount[0].count || 0,
        pengajuanMenunggu: pengajuanMap.menunggu || 0,
        pengajuanDisetujui: pengajuanMap.acc || 0,
        bimbinganAktif: bimbinganCount[0].count || 0
      };
      extraData = {
        dosenQuota: dosenList,
        pendingVerifications: pendingList
      };

    } else if (role === 'dosen') {
      // 3. Dosen stats: filtered by dosen_pembimbing1_id or dosen_pembimbing2_id
      const dosenId = user.id;
      const [bimbinganCount] = await pool.query(`
        SELECT status_bimbingan, COUNT(*) as count 
        FROM bimbingan 
        WHERE dosen_pembimbing1_id = ? OR dosen_pembimbing2_id = ? 
        GROUP BY status_bimbingan
      `, [dosenId, dosenId]);
      const bimbinganMap = { bimbingan_berjalan: 0, sempro: 0, sidang: 0, selesai: 0 };
      bimbinganCount.forEach(r => { bimbinganMap[r.status_bimbingan] = r.count; });

      const [logbookMenunggu] = await pool.query(`
        SELECT COUNT(*) as count FROM logbook_sesi 
        WHERE dosen_id = ? AND status = "menunggu_review"
      `, [dosenId]);

      // List of pending logbook reviews
      const [pendingReviews] = await pool.query(`
        SELECT l.*, u.name as mahasiswa_nama, u.nim as mahasiswa_nim, u.avatar as mahasiswa_avatar
        FROM logbook_sesi l
        JOIN users u ON l.mahasiswa_id = u.id
        WHERE l.dosen_id = ? AND l.status = "menunggu_review"
        ORDER BY l.tanggal ASC LIMIT 5
      `, [dosenId]);

      // List of students ready for ACC / sidang
      const [siapSidangList] = await pool.query(`
        SELECT b.*, u.name as mahasiswa_nama, u.nim as mahasiswa_nim, p.judul,
               (SELECT COUNT(*) FROM logbook_sesi l WHERE l.bimbingan_id = b.id AND l.status = "disetujui") as sesi_disetujui
        FROM bimbingan b
        JOIN users u ON b.mahasiswa_id = u.id
        LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
        WHERE (b.dosen_pembimbing1_id = ? OR b.dosen_pembimbing2_id = ?) AND b.status_bimbingan IN ("bimbingan_berjalan", "sempro", "sidang")
        ORDER BY b.tanggal_plotting DESC
      `, [dosenId, dosenId]);

      stats = {
        mahasiswaBimbingan: (bimbinganMap.bimbingan_berjalan || 0) + (bimbinganMap.sempro || 0) + (bimbinganMap.sidang || 0),
        logbookMenungguReview: logbookMenunggu[0].count || 0,
        siapSidang: bimbinganMap.sidang || 0,
        selesaiBimbingan: bimbinganMap.selesai || 0,
        kuotaMax: user.kuota_max || 10
      };
      extraData = {
        pendingReviews,
        mahasiswaList: siapSidangList
      };

    } else if (role === 'mahasiswa') {
      // 4. Mahasiswa stats: filtered by mahasiswa_id
      const mhsId = user.id;
      const [pengajuan] = await pool.query(
        `SELECT * FROM pengajuan_judul
         WHERE mahasiswa_id = ?
         ORDER BY (status = 'acc') DESC, created_at DESC
         LIMIT 1`,
        [mhsId]
      );
      const [bimbingan] = await pool.query(`
        SELECT b.*, d1.name as dosen1_nama, d1.nip as dosen1_nip, d2.name as dosen2_nama, d2.nip as dosen2_nip, p.judul
        FROM bimbingan b
        JOIN users d1 ON b.dosen_pembimbing1_id = d1.id
        LEFT JOIN users d2 ON b.dosen_pembimbing2_id = d2.id
        LEFT JOIN pengajuan_judul p ON b.pengajuan_id = p.id
        WHERE b.mahasiswa_id = ?
        ORDER BY b.updated_at DESC
        LIMIT 1
      `, [mhsId]);

      const [logbookCounts] = await pool.query(`
        SELECT status, COUNT(*) as count FROM logbook_sesi WHERE mahasiswa_id = ? GROUP BY status
      `, [mhsId]);
      const logbookMap = { disetujui: 0, menunggu_review: 0, revisi: 0 };
      logbookCounts.forEach(r => { logbookMap[r.status] = r.count; });

      const totalSesi = (logbookMap.disetujui || 0) + (logbookMap.menunggu_review || 0) + (logbookMap.revisi || 0);

      const [recentSesi] = await pool.query(`
        SELECT l.*, u.name as dosen_nama
        FROM logbook_sesi l
        JOIN users u ON l.dosen_id = u.id
        WHERE l.mahasiswa_id = ?
        ORDER BY l.pertemuan DESC, l.created_at DESC LIMIT 1
      `, [mhsId]);

      const [minimumRows] = await pool.query(
        `SELECT key_value FROM konfigurasi_sistem WHERE key_name = 'minSesiSidang' LIMIT 1`
      );
      const minimumSesi = Number(minimumRows[0]?.key_value) || 8;

      const [documentRows] = await pool.query(`
        SELECT title, file_url, document_date FROM (
          SELECT 'Proposal Pengajuan Judul' AS title, dokumen AS file_url, created_at AS document_date
          FROM pengajuan_judul
          WHERE mahasiswa_id = ? AND dokumen IS NOT NULL
          UNION ALL
          SELECT CONCAT('Logbook Pertemuan #', pertemuan), dokumen, created_at
          FROM logbook_sesi
          WHERE mahasiswa_id = ? AND dokumen IS NOT NULL
          UNION ALL
          SELECT perihal, file_url, created_at
          FROM manajemen_surat
          WHERE mahasiswa_id = ? AND file_url IS NOT NULL
        ) AS real_documents
        ORDER BY document_date DESC
        LIMIT 5
      `, [mhsId, mhsId, mhsId]);

      const [documentCountRows] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM pengajuan_judul WHERE mahasiswa_id = ? AND dokumen IS NOT NULL) +
          (SELECT COUNT(*) FROM logbook_sesi WHERE mahasiswa_id = ? AND dokumen IS NOT NULL) +
          (SELECT COUNT(*) FROM manajemen_surat WHERE mahasiswa_id = ? AND file_url IS NOT NULL) AS total
      `, [mhsId, mhsId, mhsId]);

      stats = {
        statusPengajuan: pengajuan.length > 0 ? pengajuan[0].status : 'belum_mengajukan',
        statusBimbingan: bimbingan.length > 0 ? bimbingan[0].status_bimbingan : 'belum_plotting',
        totalSesiLogbook: totalSesi,
        sesiDisetujui: logbookMap.disetujui || 0,
        sesiMenunggu: logbookMap.menunggu_review || 0,
        sesiRevisi: logbookMap.revisi || 0,
        targetMinimalSesi: minimumSesi,
        totalDokumen: Number(documentCountRows[0]?.total || 0)
      };
      extraData = {
        pengajuanTerakhir: pengajuan[0] || null,
        bimbinganAktif: bimbingan[0] || null,
        sesiTerakhir: recentSesi[0] || null,
        dokumenTerkini: documentRows
      };
    }

    return res.status(200).json({
      success: true,
      role: role,
      stats: stats,
      activities: recentActivities,
      data: extraData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
