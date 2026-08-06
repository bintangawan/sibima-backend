-- Migrasi non-destruktif: status revisi dan Nota Tugas otomatis.
-- Jalankan pada database sibimapps_db setelah migration_20260805_persetujuan.sql.

USE sibimapps_db;

ALTER TABLE pengajuan_judul
  MODIFY COLUMN status ENUM('menunggu', 'revisi', 'acc', 'ditolak', 'dibatalkan') DEFAULT 'menunggu';

ALTER TABLE manajemen_surat
  MODIFY COLUMN jenis ENUM('nota_tugas', 'sk_pembimbing', 'ijin_riset', 'siap_sidang', 'lainnya') DEFAULT 'nota_tugas';

SET @has_pengajuan_id = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manajemen_surat' AND COLUMN_NAME = 'pengajuan_id'
);
SET @migration_sql = IF(
  @has_pengajuan_id = 0,
  'ALTER TABLE manajemen_surat ADD COLUMN pengajuan_id VARCHAR(50) NULL AFTER mahasiswa_id',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_bimbingan_id = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manajemen_surat' AND COLUMN_NAME = 'bimbingan_id'
);
SET @migration_sql = IF(
  @has_bimbingan_id = 0,
  'ALTER TABLE manajemen_surat ADD COLUMN bimbingan_id VARCHAR(50) NULL AFTER pengajuan_id',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_template_version = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manajemen_surat' AND COLUMN_NAME = 'template_version'
);
SET @migration_sql = IF(
  @has_template_version = 0,
  'ALTER TABLE manajemen_surat ADD COLUMN template_version VARCHAR(50) NULL AFTER file_url',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

-- Konversi SK Pembimbing lama menjadi arsip Nota Tugas dan tautkan ke
-- bimbingan/pengajuan yang sudah ada. Surat izin riset dan rekomendasi sidang
-- dipertahankan sebagai arsip database, tetapi tidak lagi ditampilkan aplikasi.
UPDATE manajemen_surat
SET jenis = 'nota_tugas',
    perihal = 'Nota Tugas Pembimbing Skripsi',
    template_version = COALESCE(template_version, 'nota-tugas-v1')
WHERE jenis = 'sk_pembimbing';

UPDATE manajemen_surat s
JOIN bimbingan b ON b.mahasiswa_id = s.mahasiswa_id
SET s.bimbingan_id = COALESCE(s.bimbingan_id, b.id),
    s.pengajuan_id = COALESCE(s.pengajuan_id, b.pengajuan_id)
WHERE s.jenis = 'nota_tugas';

INSERT INTO manajemen_surat
  (id, no_surat, mahasiswa_id, pengajuan_id, bimbingan_id, jenis, perihal, tanggal, status, template_version)
SELECT
  CONCAT('NT-', LEFT(MD5(p.id), 20)),
  CONCAT('B.MIG-', LEFT(MD5(p.id), 8), '/IAIN-ACEH/NT/', YEAR(CURRENT_DATE)),
  p.mahasiswa_id,
  p.id,
  b.id,
  'nota_tugas',
  'Nota Tugas Pembimbing Skripsi',
  COALESCE(b.tanggal_plotting, CURRENT_DATE),
  'terbit',
  'nota-tugas-v1'
FROM pengajuan_judul p
JOIN bimbingan b ON b.mahasiswa_id = p.mahasiswa_id
WHERE p.status = 'acc'
  AND NOT EXISTS (
    SELECT 1 FROM manajemen_surat s
    WHERE s.jenis = 'nota_tugas' AND s.pengajuan_id = p.id
  );

SET @has_pengajuan_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manajemen_surat' AND INDEX_NAME = 'idx_surat_pengajuan'
);
SET @migration_sql = IF(
  @has_pengajuan_index = 0,
  'ALTER TABLE manajemen_surat ADD INDEX idx_surat_pengajuan (pengajuan_id)',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_bimbingan_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manajemen_surat' AND INDEX_NAME = 'idx_surat_bimbingan'
);
SET @migration_sql = IF(
  @has_bimbingan_index = 0,
  'ALTER TABLE manajemen_surat ADD INDEX idx_surat_bimbingan (bimbingan_id)',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_pengajuan_fk = (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'manajemen_surat'
    AND CONSTRAINT_NAME = 'fk_surat_pengajuan'
);
SET @migration_sql = IF(
  @has_pengajuan_fk = 0,
  'ALTER TABLE manajemen_surat ADD CONSTRAINT fk_surat_pengajuan FOREIGN KEY (pengajuan_id) REFERENCES pengajuan_judul(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_bimbingan_fk = (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'manajemen_surat'
    AND CONSTRAINT_NAME = 'fk_surat_bimbingan'
);
SET @migration_sql = IF(
  @has_bimbingan_fk = 0,
  'ALTER TABLE manajemen_surat ADD CONSTRAINT fk_surat_bimbingan FOREIGN KEY (bimbingan_id) REFERENCES bimbingan(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
