-- ============================================================================
-- SIBIMA — Sistem Informasi Bimbingan Tugas Akhir
-- MySQL Database Schema & Seeding
-- Created: 2026-07-07
-- Description: Complete relational database schema for SIBIMA with 10 tables,
--              foreign key constraints, performance indexes, and initial seed data.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop database if exists and create new
DROP DATABASE IF EXISTS sibimapps_db;
CREATE DATABASE sibimapps_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sibimapps_db;

-- ----------------------------------------------------------------------------
-- 1. Table: fakultas
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS fakultas;
CREATE TABLE fakultas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(20) NOT NULL UNIQUE,
  nama VARCHAR(150) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fakultas_kode (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: prodi
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS prodi;
CREATE TABLE prodi (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fakultas_id INT UNSIGNED NOT NULL,
  kode VARCHAR(20) NOT NULL UNIQUE,
  nama VARCHAR(150) NOT NULL,
  jenjang ENUM('D3', 'S1', 'S2', 'S3') DEFAULT 'S1',
  kaprodi_name VARCHAR(150) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prodi_fakultas FOREIGN KEY (fakultas_id) REFERENCES fakultas(id) ON DELETE CASCADE,
  INDEX idx_prodi_kode (kode),
  INDEX idx_prodi_fakultas (fakultas_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: tahun_ajaran
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS tahun_ajaran;
CREATE TABLE tahun_ajaran (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(20) NOT NULL UNIQUE,
  nama VARCHAR(150) NOT NULL,
  mulai DATE NOT NULL,
  selesai DATE NOT NULL,
  status ENUM('aktif', 'arsip', 'draf') DEFAULT 'draf',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tahun_status (status),
  INDEX idx_tahun_kode (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'admin', 'dosen', 'mahasiswa') NOT NULL,
  status ENUM('aktif', 'nonaktif', 'cuti', 'lulus') DEFAULT 'aktif',
  prodi_id INT UNSIGNED NULL,
  nim VARCHAR(30) UNIQUE NULL,
  nip VARCHAR(50) UNIQUE NULL,
  angkatan VARCHAR(10) NULL,
  phone VARCHAR(30) NULL,
  alamat TEXT NULL,
  avatar VARCHAR(255) NULL,
  kuota_max INT UNSIGNED DEFAULT 10,
  keahlian VARCHAR(255) NULL,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_prodi FOREIGN KEY (prodi_id) REFERENCES prodi(id) ON DELETE SET NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_prodi (prodi_id),
  INDEX idx_users_nim (nim),
  INDEX idx_users_nip (nip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: pengajuan_judul
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pengajuan_judul;
CREATE TABLE pengajuan_judul (
  id VARCHAR(50) PRIMARY KEY,
  mahasiswa_id VARCHAR(50) NOT NULL,
  prodi_id INT UNSIGNED NULL,
  judul TEXT NOT NULL,
  bidang VARCHAR(150) NOT NULL,
  status ENUM('menunggu', 'acc', 'ditolak') DEFAULT 'menunggu',
  tanggal DATE NOT NULL,
  dosen_usulan1_id VARCHAR(50) NULL,
  dosen_usulan2_id VARCHAR(50) NULL,
  catatan TEXT NULL,
  dokumen VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pengajuan_mhs FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pengajuan_prodi FOREIGN KEY (prodi_id) REFERENCES prodi(id) ON DELETE SET NULL,
  CONSTRAINT fk_pengajuan_dosen1 FOREIGN KEY (dosen_usulan1_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pengajuan_dosen2 FOREIGN KEY (dosen_usulan2_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pengajuan_mhs (mahasiswa_id),
  INDEX idx_pengajuan_status (status),
  INDEX idx_pengajuan_prodi (prodi_id),
  INDEX idx_pengajuan_dosen1 (dosen_usulan1_id),
  INDEX idx_pengajuan_dosen2 (dosen_usulan2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: bimbingan (Plotting Resmi Dosen Pembimbing)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS bimbingan;
CREATE TABLE bimbingan (
  id VARCHAR(50) PRIMARY KEY,
  mahasiswa_id VARCHAR(50) NOT NULL UNIQUE,
  pengajuan_id VARCHAR(50) NULL,
  dosen_pembimbing1_id VARCHAR(50) NOT NULL,
  dosen_pembimbing2_id VARCHAR(50) NULL,
  status_bimbingan ENUM('pengajuan_judul', 'menunggu_plotting', 'bimbingan_berjalan', 'sempro', 'sidang', 'selesai') DEFAULT 'bimbingan_berjalan',
  no_sk VARCHAR(100) NULL,
  tanggal_plotting DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bimbingan_mhs FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bimbingan_pengajuan FOREIGN KEY (pengajuan_id) REFERENCES pengajuan_judul(id) ON DELETE SET NULL,
  CONSTRAINT fk_bimbingan_dosen1 FOREIGN KEY (dosen_pembimbing1_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bimbingan_dosen2 FOREIGN KEY (dosen_pembimbing2_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bimbingan_mhs (mahasiswa_id),
  INDEX idx_bimbingan_dosen1 (dosen_pembimbing1_id),
  INDEX idx_bimbingan_dosen2 (dosen_pembimbing2_id),
  INDEX idx_bimbingan_status (status_bimbingan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table: logbook_sesi
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS logbook_sesi;
CREATE TABLE logbook_sesi (
  id VARCHAR(50) PRIMARY KEY,
  bimbingan_id VARCHAR(50) NOT NULL,
  mahasiswa_id VARCHAR(50) NOT NULL,
  dosen_id VARCHAR(50) NOT NULL,
  pertemuan INT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  topik VARCHAR(255) NOT NULL,
  bab VARCHAR(100) NOT NULL,
  status ENUM('menunggu_review', 'revisi', 'disetujui') DEFAULT 'menunggu_review',
  dokumen VARCHAR(255) NULL,
  catatan_mahasiswa TEXT NULL,
  catatan_dosen TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_logbook_bimbingan FOREIGN KEY (bimbingan_id) REFERENCES bimbingan(id) ON DELETE CASCADE,
  CONSTRAINT fk_logbook_mhs FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_logbook_dosen FOREIGN KEY (dosen_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_logbook_bimbingan (bimbingan_id),
  INDEX idx_logbook_mhs (mahasiswa_id),
  INDEX idx_logbook_dosen (dosen_id),
  INDEX idx_logbook_status (status),
  INDEX idx_logbook_pertemuan (pertemuan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table: manajemen_surat
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS manajemen_surat;
CREATE TABLE manajemen_surat (
  id VARCHAR(50) PRIMARY KEY,
  no_surat VARCHAR(100) NOT NULL UNIQUE,
  mahasiswa_id VARCHAR(50) NOT NULL,
  jenis ENUM('sk_pembimbing', 'ijin_riset', 'siap_sidang', 'lainnya') DEFAULT 'sk_pembimbing',
  perihal VARCHAR(255) NOT NULL,
  tanggal DATE NOT NULL,
  status ENUM('draf', 'menunggu_ttd', 'terbit', 'arsip') DEFAULT 'terbit',
  file_url VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_surat_mhs FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_surat_mhs (mahasiswa_id),
  INDEX idx_surat_jenis (jenis),
  INDEX idx_surat_status (status),
  INDEX idx_surat_no (no_surat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table: konfigurasi_sistem
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS konfigurasi_sistem;
CREATE TABLE konfigurasi_sistem (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  key_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Table: audit_log
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_log;
CREATE TABLE audit_log (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NULL,
  user_name VARCHAR(150) NULL,
  role VARCHAR(50) NULL,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50) NULL,
  details TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================

-- 1. Seed Fakultas
INSERT INTO fakultas (id, kode, nama) VALUES
(1, 'FST', 'Fakultas Sains dan Teknologi'),
(2, 'FEB', 'Fakultas Ekonomi dan Bisnis'),
(3, 'FPS', 'Fakultas Pascasarjana');

-- 2. Seed Prodi
INSERT INTO prodi (id, fakultas_id, kode, nama, jenjang, kaprodi_name) VALUES
(1, 1, 'IF', 'Teknik Informatika', 'S1', 'Dr. Budi Santoso, M.Kom'),
(2, 1, 'SI', 'Sistem Informasi', 'S1', 'Rina Wati, M.Cs.'),
(3, 1, 'TE', 'Teknik Elektro', 'S1', 'Siti Aminah, S.T., M.T.'),
(4, 1, 'SD', 'Sains Data', 'S1', 'Prof. Dr. Hendra Gunawan'),
(5, 3, 'MIF', 'Magister Informatika', 'S2', 'Prof. Dr. Hendra Gunawan');

-- 3. Seed Tahun Ajaran
INSERT INTO tahun_ajaran (id, kode, nama, mulai, selesai, status) VALUES
(1, '20252', 'Semester Genap 2025/2026', '2026-02-01', '2026-07-31', 'aktif'),
(2, '20251', 'Semester Ganjil 2025/2026', '2025-08-01', '2026-01-31', 'arsip'),
(3, '20242', 'Semester Genap 2024/2025', '2025-02-01', '2025-07-31', 'arsip');

-- 4. Seed Users
-- Catatan: Password untuk SEMUA user di bawah ini adalah "password"
-- Hash Bcrypt: $2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci
INSERT INTO users (id, name, email, password, role, status, prodi_id, nim, nip, angkatan, phone, alamat, keahlian, kuota_max) VALUES
('u1', 'Superadmin Sistem', 'superadmin@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'superadmin', 'aktif', NULL, NULL, '197001011995011001', NULL, '081111111111', 'Gedung Rektorat Lt. 4', NULL, 10),
('u2', 'Admin Prodi Informatika', 'admin@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'admin', 'aktif', 1, NULL, '198002022005011002', NULL, '082222222222', 'Gedung FST Lt. 2', NULL, 10),
('u3', 'Dr. Budi Santoso, M.Kom', 'dosen@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'dosen', 'aktif', 1, NULL, '197505152000121001', NULL, '083333333333', 'Gedung Dosen Lt. 3 No. 301', 'Kecerdasan Buatan (AI & ML), Sains Data', 10),
('u4', 'Siti Aminah, S.T., M.T.', 'siti.aminah@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'dosen', 'aktif', 1, NULL, '198203102008012002', NULL, '084444444444', 'Gedung Dosen Lt. 3 No. 305', 'Rekayasa Perangkat Lunak, Cloud Computing', 10),
('u5', 'Ahmad Rizki Pratama', 'mahasiswa@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101050', NULL, '2022', '081234567890', 'Jl. Perintis Kemerdekaan Km. 10, Tamalanrea, Makassar', NULL, 10),
('u6', 'Dewi Lestari', 'dewi.lestari@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101055', NULL, '2022', '085555555555', 'Jl. Sahabat No. 12, Makassar', NULL, 10),
('u7', 'Bambang Pamungkas', 'bambang@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101052', NULL, '2022', '086666666666', 'Jl. Tamalanrea Raya No. 45, Makassar', NULL, 10);

-- 5. Seed Pengajuan Judul
INSERT INTO pengajuan_judul (id, mahasiswa_id, prodi_id, judul, bidang, status, tanggal, dosen_usulan1_id, dosen_usulan2_id, catatan, dokumen) VALUES
('PEN-2026-001', 'u5', 1, 'Implementasi Algoritma Deep Learning untuk Deteksi Dini Penyakit Tanaman Padi Menggunakan Convolutional Neural Network', 'Kecerdasan Buatan (AI & ML)', 'acc', '2026-07-02', 'u3', 'u4', 'Judul sangat relevan dan disetujui.', 'Proposal_Skripsi_1905101050.pdf'),
('PEN-2026-002', 'u7', 1, 'Sistem Rekomendasi Pemilihan Mata Kuliah Pilihan Berdasarkan Transkrip Nilai Menggunakan Collaborative Filtering', 'Sains Data & Analitik', 'acc', '2026-06-15', 'u3', NULL, 'Topik menarik, dilanjutkan ke tahap plotting.', 'Proposal_Skripsi_1905101052.pdf'),
('PEN-2026-004', 'u6', 1, 'Pengembangan Aplikasi Mobile untuk Pelayanan Kesehatan Ibu dan Anak Berbasis Cloud Architecture', 'Rekayasa Perangkat Lunak', 'menunggu', '2026-07-03', 'u4', NULL, NULL, 'Proposal_Skripsi_1905101055.pdf');

-- 6. Seed Bimbingan (Plotting)
INSERT INTO bimbingan (id, mahasiswa_id, pengajuan_id, dosen_pembimbing1_id, dosen_pembimbing2_id, status_bimbingan, no_sk, tanggal_plotting) VALUES
('BIM-001', 'u5', 'PEN-2026-001', 'u3', 'u4', 'bimbingan_berjalan', '104/UN.FST/SK-PEMB/2026', '2026-07-03'),
('BIM-002', 'u7', 'PEN-2026-002', 'u3', NULL, 'bimbingan_berjalan', '105/UN.FST/SK-PEMB/2026', '2026-06-20');

-- 7. Seed Logbook Sesi
INSERT INTO logbook_sesi (id, bimbingan_id, mahasiswa_id, dosen_id, pertemuan, tanggal, topik, bab, status, dokumen, catatan_mahasiswa, catatan_dosen) VALUES
('sesi-1', 'BIM-001', 'u5', 'u3', 1, '2026-06-18', 'Penyelarasan Judul, Latar Belakang, & Rumusan Masalah Bab 1', 'Bab 1 - Pendahuluan', 'disetujui', 'Draf_Bab1_v3.pdf', 'Perdana konsultasi judul resmi yang telah di-SK-kan oleh prodi.', 'Latar belakang sudah cukup jelas. Lanjutkan ke perumusan hipotesis dan kajian pustaka Bab 2.'),
('sesi-2', 'BIM-001', 'u5', 'u3', 2, '2026-06-25', 'Review Bab 2: Kajian Pustaka & Tabel Literatur Terkait', 'Bab 2 - Kajian Pustaka', 'revisi', 'Draf_Bab2_v1.pdf', 'Menyerahkan draf Bab 2 berisi 15 literatur jurnal internasional terbaru.', 'Tabel perbandingan literatur perlu diperbaiki. Tambahkan kolom kelebihan dan kelemahan dari setiap metode sebelumnya.'),
('sesi-3', 'BIM-001', 'u5', 'u3', 3, '2026-07-03', 'Pembahasan Bab 3: Metodologi Penelitian & Pemodelan Arsitektur AI', 'Bab 3 - Metodologi', 'disetujui', 'Draf_Bab3_v2.pdf', 'Konsultasi mengenai pemodelan arsitektur CNN dan pembagian persentase data latih vs data uji.', 'Arsitektur CNN sudah sesuai. Lanjutkan untuk pengumpulan dataset dan uji coba latih model.');

-- 8. Seed Manajemen Surat
INSERT INTO manajemen_surat (id, no_surat, mahasiswa_id, jenis, perihal, tanggal, status, file_url) VALUES
('SK-2026-001', '104/UN.FST/SK-PEMB/2026', 'u5', 'sk_pembimbing', 'SK Penetapan Dosen Pembimbing Skripsi Semester Genap', '2026-07-03', 'terbit', '/storage/surat/SK_Pembimbing_1905101050.pdf'),
('SK-2026-002', '105/UN.FST/SK-PEMB/2026', 'u7', 'sk_pembimbing', 'SK Penetapan Dosen Pembimbing Skripsi Semester Genap', '2026-07-03', 'terbit', '/storage/surat/SK_Pembimbing_1905101052.pdf');

-- 9. Seed Konfigurasi Sistem
INSERT INTO konfigurasi_sistem (key_name, key_value, description) VALUES
('maxKuotaDosen', '10', 'Batas maksimal kuota mahasiswa bimbingan per dosen'),
('minSesiSidang', '8', 'Syarat minimal sesi pertemuan bimbingan untuk ACC sidang'),
('maxFileSize', '10', 'Batas maksimal ukuran file upload dalam MB'),
('allowedExtensions', '.pdf,.doc,.docx', 'Daftar ekstensi file dokumen yang diizinkan'),
('sessionTimeout', '24', 'Waktu kedaluwarsa sesi login JWT dalam jam'),
('enableTte', 'true', 'Aktifkan Tanda Tangan Elektronik (TTE) pada surat resmi'),
('autoVerifyLogbookDays', '7', 'Jumlah hari otomatis verifikasi logbook jika tidak direview dosen'),
('maintenanceMode', 'false', 'Mode perbaikan sistem (true/false)');

-- 10. Seed Audit Log
INSERT INTO audit_log (id, user_id, user_name, role, action, ip_address, details, created_at) VALUES
('log-101', 'u1', 'Superadmin Sistem', 'superadmin', 'UPDATE_CONFIG', '192.168.1.10', 'Mengubah parameter kuota maksimal dosen pembimbing dari 8 menjadi 10.', '2026-07-06 11:45:12'),
('log-102', 'u3', 'Dr. Budi Santoso, M.Kom', 'dosen', 'APPROVE_SESI', '10.15.20.104', 'Menyetujui sesi bimbingan Pertemuan #3 untuk mahasiswa Ahmad Rizki Pratama (1905101050).', '2026-07-06 10:30:05'),
('log-103', 'u2', 'Admin Prodi Informatika', 'admin', 'GENERATE_SK', '192.168.1.25', 'Menerbitkan SK Pembimbing 104/UN.FST/SK-PEMB/2026 untuk mahasiswa Ahmad Rizki Pratama.', '2026-07-06 09:15:40'),
('log-104', 'u5', 'Ahmad Rizki Pratama', 'mahasiswa', 'CREATE_SESI', '114.125.18.90', 'Mengajukan logbook sesi bimbingan Pertemuan #3 dengan dokumen Draf_Bab3_v2.pdf.', '2026-07-06 08:00:15');

SET FOREIGN_KEY_CHECKS = 1;
