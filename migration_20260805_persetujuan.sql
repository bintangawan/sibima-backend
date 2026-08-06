-- Migrasi non-destruktif SIBIMA
-- Jalankan pada database sibimapps_db yang sudah ada.

USE sibimapps_db;

SET @has_checklist_revisi = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logbook_sesi' AND COLUMN_NAME = 'checklist_revisi'
);
SET @migration_sql = IF(
  @has_checklist_revisi = 0,
  'ALTER TABLE logbook_sesi ADD COLUMN checklist_revisi JSON NULL AFTER catatan_dosen',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_latar_belakang = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengajuan_judul' AND COLUMN_NAME = 'latar_belakang'
);
SET @migration_sql = IF(
  @has_latar_belakang = 0,
  'ALTER TABLE pengajuan_judul ADD COLUMN latar_belakang TEXT NULL AFTER bidang',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

ALTER TABLE pengajuan_judul
  MODIFY COLUMN status ENUM('menunggu', 'revisi', 'acc', 'ditolak', 'dibatalkan') DEFAULT 'menunggu';

CREATE TABLE IF NOT EXISTS pengajuan_persetujuan (
  id VARCHAR(50) PRIMARY KEY,
  bimbingan_id VARCHAR(50) NOT NULL,
  mahasiswa_id VARCHAR(50) NOT NULL,
  jenis ENUM('seminar_proposal', 'sidang_skripsi') NOT NULL,
  attempt INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('menunggu', 'disetujui', 'ditolak', 'dibatalkan') DEFAULT 'menunggu',
  tanggal_pengajuan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  catatan_mahasiswa TEXT NULL,
  dokumen VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pengajuan_persetujuan_bimbingan FOREIGN KEY (bimbingan_id) REFERENCES bimbingan(id) ON DELETE CASCADE,
  CONSTRAINT fk_pengajuan_persetujuan_mhs FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_pengajuan_persetujuan_attempt (bimbingan_id, jenis, attempt),
  INDEX idx_pengajuan_persetujuan_mhs (mahasiswa_id),
  INDEX idx_pengajuan_persetujuan_status (status),
  INDEX idx_pengajuan_persetujuan_jenis (jenis),
  INDEX idx_pengajuan_persetujuan_tanggal (tanggal_pengajuan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS persetujuan_dosen (
  id VARCHAR(50) PRIMARY KEY,
  pengajuan_persetujuan_id VARCHAR(50) NOT NULL,
  dosen_id VARCHAR(50) NOT NULL,
  peran ENUM('pembimbing_1', 'pembimbing_2') NOT NULL,
  status ENUM('menunggu', 'disetujui', 'ditolak') DEFAULT 'menunggu',
  catatan_dosen TEXT NULL,
  tanggal_keputusan DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_persetujuan_dosen_pengajuan FOREIGN KEY (pengajuan_persetujuan_id) REFERENCES pengajuan_persetujuan(id) ON DELETE CASCADE,
  CONSTRAINT fk_persetujuan_dosen_user FOREIGN KEY (dosen_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_persetujuan_dosen (pengajuan_persetujuan_id, dosen_id),
  INDEX idx_persetujuan_dosen_user (dosen_id),
  INDEX idx_persetujuan_dosen_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
