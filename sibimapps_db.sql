-- phpMyAdmin SQL Dump
-- version 6.0.0-dev+20260526.9a43c2e222
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 12, 2026 at 04:14 AM
-- Server version: 8.0.30
-- PHP Version: 8.4.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sibimapps_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_log`
--

INSERT INTO `audit_log` (`id`, `user_id`, `user_name`, `role`, `action`, `ip_address`, `details`, `created_at`) VALUES
('log-101', 'u1', 'Superadmin Sistem', 'superadmin', 'UPDATE_CONFIG', '192.168.1.10', 'Mengubah parameter kuota maksimal dosen pembimbing dari 8 menjadi 10.', '2026-07-06 11:45:12'),
('log-102', 'u3', 'Dr. Budi Santoso, M.Kom', 'dosen', 'APPROVE_SESI', '10.15.20.104', 'Menyetujui sesi bimbingan Pertemuan #3 untuk mahasiswa Ahmad Rizki Pratama (1905101050).', '2026-07-06 10:30:05'),
('log-103', 'u2', 'Admin Prodi Informatika', 'admin', 'GENERATE_SK', '192.168.1.25', 'Menerbitkan SK Pembimbing 104/UN.FST/SK-PEMB/2026 untuk mahasiswa Ahmad Rizki Pratama.', '2026-07-06 09:15:40'),
('log-104', 'u5', 'Ahmad Rizki Pratama', 'mahasiswa', 'CREATE_SESI', '114.125.18.90', 'Mengajukan logbook sesi bimbingan Pertemuan #3 dengan dokumen Draf_Bab3_v2.pdf.', '2026-07-06 08:00:15'),
('log-1785893532589', 'u3', 'Dr. Budi Santoso, M.Kom', 'dosen', 'REVIEW_SESI', '::1', 'Dosen Dr. Budi Santoso, M.Kom mereview sesi bimbingan ID sesi-2 dengan status: DISETUJUI.', '2026-08-05 08:32:12'),
('log-1785978428341', 'u2', 'Admin Prodi Informatika', 'admin', 'VERIFY_PENGAJUAN', '::1', 'Memverifikasi pengajuan judul (ID: PEN-2026-004) dengan status: ACC.', '2026-08-06 08:07:08'),
('log-1786346329521', '', 'Bintangin', 'mahasiswa', 'CREATE_PENGAJUAN', '::1', 'Mahasiswa Bintangin mengajukan judul skripsi: \"Perancangan dan Implementasi Sistem Informasi Mana...\".', '2026-08-10 14:18:49'),
('log-1786350810657', 'admin-prodi-2', 'Admin Prodi Sistem Informasi', 'admin', 'VERIFY_PENGAJUAN', '::1', 'Memverifikasi pengajuan judul (ID: PEN-1786346329519-513) dengan status: ACC.', '2026-08-10 15:33:30');

-- --------------------------------------------------------

--
-- Table structure for table `bimbingan`
--

CREATE TABLE `bimbingan` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mahasiswa_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pengajuan_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dosen_pembimbing1_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dosen_pembimbing2_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_bimbingan` enum('pengajuan_judul','menunggu_plotting','bimbingan_berjalan','sempro','sidang','selesai') COLLATE utf8mb4_unicode_ci DEFAULT 'bimbingan_berjalan',
  `no_sk` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal_plotting` date NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bimbingan`
--

INSERT INTO `bimbingan` (`id`, `mahasiswa_id`, `pengajuan_id`, `dosen_pembimbing1_id`, `dosen_pembimbing2_id`, `status_bimbingan`, `no_sk`, `tanggal_plotting`, `created_at`, `updated_at`) VALUES
('BIM-001', 'u5', 'PEN-2026-001', 'u3', 'u4', 'bimbingan_berjalan', '104/UN.FST/SK-PEMB/2026', '2026-07-03', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
('BIM-002', 'u7', 'PEN-2026-002', 'u3', NULL, 'bimbingan_berjalan', '105/UN.FST/SK-PEMB/2026', '2026-06-20', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
('BIM-1785978428258-405', 'u6', 'PEN-2026-004', 'u4', 'u3', 'bimbingan_berjalan', 'B.8428337/IAIN-ACEH/IF/NT/VIII/2026', '2026-08-06', '2026-08-06 08:07:08', '2026-08-06 08:07:08'),
('BIM-1786350810474-349', '', 'PEN-1786346329519-513', 'u3', 'u4', 'bimbingan_berjalan', 'B.0810643/IAIN-ACEH/SI/NT/VIII/2026', '2026-08-10', '2026-08-10 15:33:30', '2026-08-10 15:33:30');

-- --------------------------------------------------------

--
-- Table structure for table `fakultas`
--

CREATE TABLE `fakultas` (
  `id` int UNSIGNED NOT NULL,
  `kode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fakultas`
--

INSERT INTO `fakultas` (`id`, `kode`, `nama`, `created_at`, `updated_at`) VALUES
(1, 'FST', 'Fakultas Sains dan Teknologi', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(2, 'FEB', 'Fakultas Ekonomi dan Bisnis', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(3, 'FPS', 'Fakultas Pascasarjana', '2026-07-07 14:10:38', '2026-07-07 14:10:38');

-- --------------------------------------------------------

--
-- Table structure for table `konfigurasi_sistem`
--

CREATE TABLE `konfigurasi_sistem` (
  `id` int UNSIGNED NOT NULL,
  `key_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `konfigurasi_sistem`
--

INSERT INTO `konfigurasi_sistem` (`id`, `key_name`, `key_value`, `description`, `updated_at`) VALUES
(1, 'maxKuotaDosen', '10', 'Batas maksimal kuota mahasiswa bimbingan per dosen', '2026-07-07 14:10:39'),
(2, 'minSesiSidang', '8', 'Syarat minimal sesi pertemuan bimbingan untuk ACC sidang', '2026-07-07 14:10:39'),
(3, 'maxFileSize', '10', 'Batas maksimal ukuran file upload dalam MB', '2026-07-07 14:10:39'),
(4, 'allowedExtensions', '.pdf,.doc,.docx', 'Daftar ekstensi file dokumen yang diizinkan', '2026-07-07 14:10:39'),
(5, 'sessionTimeout', '24', 'Waktu kedaluwarsa sesi login JWT dalam jam', '2026-07-07 14:10:39'),
(6, 'enableTte', 'true', 'Aktifkan Tanda Tangan Elektronik (TTE) pada surat resmi', '2026-07-07 14:10:39'),
(7, 'autoVerifyLogbookDays', '7', 'Jumlah hari otomatis verifikasi logbook jika tidak direview dosen', '2026-07-07 14:10:39'),
(8, 'maintenanceMode', 'false', 'Mode perbaikan sistem (true/false)', '2026-07-07 14:10:39'),
(9, 'minSesiSempro', '4', 'Syarat minimal sesi bimbingan disetujui untuk mengajukan seminar proposal', '2026-08-05 08:30:48');

-- --------------------------------------------------------

--
-- Table structure for table `logbook_sesi`
--

CREATE TABLE `logbook_sesi` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bimbingan_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mahasiswa_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dosen_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pertemuan` int UNSIGNED NOT NULL,
  `tanggal` date NOT NULL,
  `topik` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bab` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('menunggu_review','revisi','disetujui') COLLATE utf8mb4_unicode_ci DEFAULT 'menunggu_review',
  `dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catatan_mahasiswa` text COLLATE utf8mb4_unicode_ci,
  `catatan_dosen` text COLLATE utf8mb4_unicode_ci,
  `checklist_revisi` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `logbook_sesi`
--

INSERT INTO `logbook_sesi` (`id`, `bimbingan_id`, `mahasiswa_id`, `dosen_id`, `pertemuan`, `tanggal`, `topik`, `bab`, `status`, `dokumen`, `catatan_mahasiswa`, `catatan_dosen`, `checklist_revisi`, `created_at`, `updated_at`) VALUES
('sesi-1', 'BIM-001', 'u5', 'u3', 1, '2026-06-18', 'Penyelarasan Judul, Latar Belakang, & Rumusan Masalah Bab 1', 'Bab 1 - Pendahuluan', 'disetujui', 'Draf_Bab1_v3.pdf', 'Perdana konsultasi judul resmi yang telah di-SK-kan oleh prodi.', 'Latar belakang sudah cukup jelas. Lanjutkan ke perumusan hipotesis dan kajian pustaka Bab 2.', NULL, '2026-07-07 14:10:39', '2026-07-07 14:10:39'),
('sesi-2', 'BIM-001', 'u5', 'u3', 2, '2026-06-25', 'Review Bab 2: Kajian Pustaka & Tabel Literatur Terkait', 'Bab 2 - Kajian Pustaka', 'disetujui', 'Draf_Bab2_v1.pdf', 'Menyerahkan draf Bab 2 berisi 15 literatur jurnal internasional terbaru.', 'Tabel perbandingan literatur perlu diperbaiki. Tambahkan kolom kelebihan dan kelemahan dari setiap metode sebelumnya.', NULL, '2026-07-07 14:10:39', '2026-08-05 08:32:12'),
('sesi-3', 'BIM-001', 'u5', 'u3', 3, '2026-07-03', 'Pembahasan Bab 3: Metodologi Penelitian & Pemodelan Arsitektur AI', 'Bab 3 - Metodologi', 'disetujui', 'Draf_Bab3_v2.pdf', 'Konsultasi mengenai pemodelan arsitektur CNN dan pembagian persentase data latih vs data uji.', 'Arsitektur CNN sudah sesuai. Lanjutkan untuk pengumpulan dataset dan uji coba latih model.', NULL, '2026-07-07 14:10:39', '2026-07-07 14:10:39');

-- --------------------------------------------------------

--
-- Table structure for table `manajemen_surat`
--

CREATE TABLE `manajemen_surat` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_surat` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mahasiswa_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pengajuan_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bimbingan_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis` enum('nota_tugas','sk_pembimbing','ijin_riset','siap_sidang','lainnya') COLLATE utf8mb4_unicode_ci DEFAULT 'nota_tugas',
  `perihal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `status` enum('draf','menunggu_ttd','terbit','arsip') COLLATE utf8mb4_unicode_ci DEFAULT 'terbit',
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `manajemen_surat`
--

INSERT INTO `manajemen_surat` (`id`, `no_surat`, `mahasiswa_id`, `pengajuan_id`, `bimbingan_id`, `jenis`, `perihal`, `tanggal`, `status`, `file_url`, `template_version`, `created_at`, `updated_at`) VALUES
('NT-1785978428337-830', 'B.8428337/IAIN-ACEH/IF/NT/VIII/2026', 'u6', 'PEN-2026-004', 'BIM-1785978428258-405', 'nota_tugas', 'Nota Tugas Pembimbing Skripsi', '2026-08-06', 'terbit', NULL, 'nota-tugas-v1', '2026-08-06 08:07:08', '2026-08-06 08:07:08'),
('NT-1786350810643-911', 'B.0810643/IAIN-ACEH/SI/NT/VIII/2026', '', 'PEN-1786346329519-513', 'BIM-1786350810474-349', 'nota_tugas', 'Nota Tugas Pembimbing Skripsi', '2026-08-10', 'terbit', NULL, 'nota-tugas-v1', '2026-08-10 15:33:30', '2026-08-10 15:33:30'),
('SK-2026-001', '104/UN.FST/SK-PEMB/2026', 'u5', 'PEN-2026-001', 'BIM-001', 'nota_tugas', 'Nota Tugas Pembimbing Skripsi', '2026-07-03', 'terbit', '/storage/surat/SK_Pembimbing_1905101050.pdf', 'nota-tugas-v1', '2026-07-07 14:10:39', '2026-08-05 15:22:26'),
('SK-2026-002', '105/UN.FST/SK-PEMB/2026', 'u7', 'PEN-2026-002', 'BIM-002', 'nota_tugas', 'Nota Tugas Pembimbing Skripsi', '2026-07-03', 'terbit', '/storage/surat/SK_Pembimbing_1905101052.pdf', 'nota-tugas-v1', '2026-07-07 14:10:39', '2026-08-05 15:22:26');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','success','warning','danger') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `created_at`, `updated_at`) VALUES
('notif-1786350810660-98251', '', 'success', 'Judul Skripsi Disetujui', 'Judul Anda telah disetujui dan dosen pembimbing telah ditetapkan.', '/mahasiswa/pengajuan', 0, '2026-08-10 15:33:30', '2026-08-10 15:33:30');

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan_judul`
--

CREATE TABLE `pengajuan_judul` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mahasiswa_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prodi_id` int UNSIGNED DEFAULT NULL,
  `judul` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `bidang` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latar_belakang` text COLLATE utf8mb4_unicode_ci,
  `status` enum('menunggu','revisi','acc','ditolak','dibatalkan') COLLATE utf8mb4_unicode_ci DEFAULT 'menunggu',
  `tanggal` date NOT NULL,
  `dosen_usulan1_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dosen_usulan2_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pengajuan_judul`
--

INSERT INTO `pengajuan_judul` (`id`, `mahasiswa_id`, `prodi_id`, `judul`, `bidang`, `latar_belakang`, `status`, `tanggal`, `dosen_usulan1_id`, `dosen_usulan2_id`, `catatan`, `dokumen`, `created_at`, `updated_at`) VALUES
('PEN-1786346329519-513', '', 2, 'Perancangan dan Implementasi Sistem Informasi Manajemen Pelayanan Berbasis Web untuk Meningkatkan Efisiensi Pengelolaan Data dan Layanan', 'Sistem Informasi & Bisnis', 'Perkembangan teknologi informasi mendorong berbagai instansi dan organisasi untuk meningkatkan efektivitas pengelolaan data dan pelayanan. Namun, proses yang masih dilakukan secara manual sering menimbulkan kendala seperti keterlambatan pengolahan data, kesalahan pencatatan, sulitnya pencarian informasi, serta kurang efisiennya proses penyusunan laporan.\r\n\r\nBerdasarkan permasalahan tersebut, diperlukan sistem informasi manajemen pelayanan berbasis web yang dapat membantu proses pencatatan, penyimpanan, pengolahan, dan penyajian data secara terintegrasi. Rumusan masalah dalam penelitian ini adalah bagaimana merancang dan mengimplementasikan sistem informasi manajemen pelayanan berbasis web yang mampu meningkatkan efisiensi pengelolaan data dan pelayanan.', 'acc', '2026-08-10', 'u3', 'u4', NULL, '/storage/proposal/Laporan_Penelitian_SI-BIMA_-_Bab_I-III-1786346329505-308289609.docx', '2026-08-10 14:18:49', '2026-08-10 15:33:30'),
('PEN-2026-001', 'u5', 1, 'Implementasi Algoritma Deep Learning untuk Deteksi Dini Penyakit Tanaman Padi Menggunakan Convolutional Neural Network', 'Kecerdasan Buatan (AI & ML)', NULL, 'acc', '2026-07-02', 'u3', 'u4', 'Judul sangat relevan dan disetujui.', 'Proposal_Skripsi_1905101050.pdf', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
('PEN-2026-002', 'u7', 1, 'Sistem Rekomendasi Pemilihan Mata Kuliah Pilihan Berdasarkan Transkrip Nilai Menggunakan Collaborative Filtering', 'Sains Data & Analitik', NULL, 'acc', '2026-06-15', 'u3', NULL, 'Topik menarik, dilanjutkan ke tahap plotting.', 'Proposal_Skripsi_1905101052.pdf', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
('PEN-2026-004', 'u6', 1, 'Pengembangan Aplikasi Mobile untuk Pelayanan Kesehatan Ibu dan Anak Berbasis Cloud Architecture', 'Rekayasa Perangkat Lunak', NULL, 'acc', '2026-07-03', 'u4', 'u3', NULL, 'Proposal_Skripsi_1905101055.pdf', '2026-07-07 14:10:38', '2026-08-06 08:07:08');

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan_persetujuan`
--

CREATE TABLE `pengajuan_persetujuan` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bimbingan_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mahasiswa_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` enum('seminar_proposal','sidang_skripsi') COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt` int UNSIGNED NOT NULL DEFAULT '1',
  `status` enum('menunggu','disetujui','ditolak','dibatalkan') COLLATE utf8mb4_unicode_ci DEFAULT 'menunggu',
  `tanggal_pengajuan` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `catatan_mahasiswa` text COLLATE utf8mb4_unicode_ci,
  `dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `persetujuan_dosen`
--

CREATE TABLE `persetujuan_dosen` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pengajuan_persetujuan_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dosen_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `peran` enum('pembimbing_1','pembimbing_2') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('menunggu','disetujui','ditolak') COLLATE utf8mb4_unicode_ci DEFAULT 'menunggu',
  `catatan_dosen` text COLLATE utf8mb4_unicode_ci,
  `tanggal_keputusan` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prodi`
--

CREATE TABLE `prodi` (
  `id` int UNSIGNED NOT NULL,
  `fakultas_id` int UNSIGNED NOT NULL,
  `kode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenjang` enum('D3','S1','S2','S3') COLLATE utf8mb4_unicode_ci DEFAULT 'S1',
  `kaprodi_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `prodi`
--

INSERT INTO `prodi` (`id`, `fakultas_id`, `kode`, `nama`, `jenjang`, `kaprodi_name`, `created_at`, `updated_at`) VALUES
(1, 1, 'IF', 'Teknik Informatika', 'S1', 'Dr. Budi Santoso, M.Kom', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(2, 1, 'SI', 'Sistem Informasi', 'S1', 'Rina Wati, M.Cs.', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(3, 1, 'TE', 'Teknik Elektro', 'S1', 'Siti Aminah, S.T., M.T.', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(4, 1, 'SD', 'Sains Data', 'S1', 'Prof. Dr. Hendra Gunawan', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(5, 3, 'MIF', 'Magister Informatika', 'S2', 'Prof. Dr. Hendra Gunawan', '2026-07-07 14:10:38', '2026-07-07 14:10:38');

-- --------------------------------------------------------

--
-- Table structure for table `tahun_ajaran`
--

CREATE TABLE `tahun_ajaran` (
  `id` int UNSIGNED NOT NULL,
  `kode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mulai` date NOT NULL,
  `selesai` date NOT NULL,
  `status` enum('aktif','arsip','draf') COLLATE utf8mb4_unicode_ci DEFAULT 'draf',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tahun_ajaran`
--

INSERT INTO `tahun_ajaran` (`id`, `kode`, `nama`, `mulai`, `selesai`, `status`, `created_at`, `updated_at`) VALUES
(1, '20252', 'Semester Genap 2025/2026', '2026-02-01', '2026-07-31', 'aktif', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(2, '20251', 'Semester Ganjil 2025/2026', '2025-08-01', '2026-01-31', 'arsip', '2026-07-07 14:10:38', '2026-07-07 14:10:38'),
(3, '20242', 'Semester Genap 2024/2025', '2025-02-01', '2025-07-31', 'arsip', '2026-07-07 14:10:38', '2026-07-07 14:10:38');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','admin','dosen','mahasiswa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('aktif','nonaktif','cuti','lulus') COLLATE utf8mb4_unicode_ci DEFAULT 'aktif',
  `prodi_id` int UNSIGNED DEFAULT NULL,
  `nim` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `angkatan` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kuota_max` int UNSIGNED DEFAULT '10',
  `keahlian` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `prodi_id`, `nim`, `nip`, `angkatan`, `phone`, `alamat`, `avatar`, `kuota_max`, `keahlian`, `last_login`, `created_at`, `updated_at`) VALUES
('', 'Bintangin', 'bintangin@gmail.com', '$2a$12$uR..VMh.9cliyQpcOrjnk.18uN.SUORz/9JQFWIyPCv7ZpMqdTk6O', 'mahasiswa', 'aktif', 2, '0701222090', NULL, '2022', NULL, NULL, NULL, 10, NULL, '2026-08-11 13:47:31', '2026-08-10 14:16:41', '2026-08-11 13:47:31'),
('admin-prodi-2', 'Admin Prodi Sistem Informasi', 'admin.si@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'admin', 'aktif', 2, NULL, NULL, NULL, NULL, 'Fakultas Sains dan Teknologi - Program Studi Sistem Informasi', NULL, 10, NULL, '2026-08-11 13:46:13', '2026-08-10 15:22:13', '2026-08-11 13:46:13'),
('u1', 'Superadmin Sistem', 'superadmin@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'superadmin', 'aktif', NULL, NULL, '197001011995011001', NULL, '081111111111', 'Gedung Rektorat Lt. 4', NULL, 10, NULL, '2026-08-10 14:20:40', '2026-07-07 14:10:38', '2026-08-10 14:20:40'),
('u2', 'Admin Prodi Informatika', 'admin@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'admin', 'aktif', 1, NULL, '198002022005011002', NULL, '082222222222', 'Gedung FST Lt. 2', NULL, 10, NULL, '2026-08-10 15:19:48', '2026-07-07 14:10:38', '2026-08-10 15:19:48'),
('u3', 'Dr. Budi Santoso, M.Kom', 'dosen@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'dosen', 'aktif', 1, NULL, '197505152000121001', NULL, '083333333333', 'Gedung Dosen Lt. 3 No. 301', NULL, 10, 'Kecerdasan Buatan (AI & ML), Sains Data', '2026-08-06 08:08:05', '2026-07-07 14:10:38', '2026-08-06 08:08:05'),
('u4', 'Siti Aminah, S.T., M.T.', 'siti.aminah@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'dosen', 'aktif', 1, NULL, '198203102008012002', NULL, '084444444444', 'Gedung Dosen Lt. 3 No. 305', NULL, 10, 'Rekayasa Perangkat Lunak, Cloud Computing', '2026-08-11 13:52:56', '2026-07-07 14:10:38', '2026-08-11 13:52:56'),
('u5', 'Ahmad Rizki Pratama', 'mahasiswa@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101050', NULL, '2022', '081234567890', 'Jl. Perintis Kemerdekaan Km. 10, Tamalanrea, Makassar', NULL, 10, NULL, '2026-08-06 08:10:01', '2026-07-07 14:10:38', '2026-08-06 08:10:01'),
('u6', 'Dewi Lestari', 'dewi.lestari@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101055', NULL, '2022', '085555555555', 'Jl. Sahabat No. 12, Makassar', NULL, 10, NULL, '2026-08-05 14:17:27', '2026-07-07 14:10:38', '2026-08-05 14:17:27'),
('u7', 'Bambang Pamungkas', 'bambang@sibima.com', '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci', 'mahasiswa', 'aktif', 1, '1905101052', NULL, '2022', '086666666666', 'Jl. Tamalanrea Raya No. 45, Makassar', NULL, 10, NULL, '2026-07-07 16:57:39', '2026-07-07 14:10:38', '2026-07-07 16:57:39');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user` (`user_id`),
  ADD KEY `idx_audit_action` (`action`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `bimbingan`
--
ALTER TABLE `bimbingan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mahasiswa_id` (`mahasiswa_id`),
  ADD KEY `fk_bimbingan_pengajuan` (`pengajuan_id`),
  ADD KEY `idx_bimbingan_mhs` (`mahasiswa_id`),
  ADD KEY `idx_bimbingan_dosen1` (`dosen_pembimbing1_id`),
  ADD KEY `idx_bimbingan_dosen2` (`dosen_pembimbing2_id`),
  ADD KEY `idx_bimbingan_status` (`status_bimbingan`);

--
-- Indexes for table `fakultas`
--
ALTER TABLE `fakultas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `idx_fakultas_kode` (`kode`);

--
-- Indexes for table `konfigurasi_sistem`
--
ALTER TABLE `konfigurasi_sistem`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key_name` (`key_name`),
  ADD KEY `idx_config_key` (`key_name`);

--
-- Indexes for table `logbook_sesi`
--
ALTER TABLE `logbook_sesi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logbook_bimbingan` (`bimbingan_id`),
  ADD KEY `idx_logbook_mhs` (`mahasiswa_id`),
  ADD KEY `idx_logbook_dosen` (`dosen_id`),
  ADD KEY `idx_logbook_status` (`status`),
  ADD KEY `idx_logbook_pertemuan` (`pertemuan`);

--
-- Indexes for table `manajemen_surat`
--
ALTER TABLE `manajemen_surat`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_surat` (`no_surat`),
  ADD KEY `idx_surat_mhs` (`mahasiswa_id`),
  ADD KEY `idx_surat_jenis` (`jenis`),
  ADD KEY `idx_surat_status` (`status`),
  ADD KEY `idx_surat_no` (`no_surat`),
  ADD KEY `idx_surat_pengajuan` (`pengajuan_id`),
  ADD KEY `idx_surat_bimbingan` (`bimbingan_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_notifications_user_read` (`user_id`,`is_read`);

--
-- Indexes for table `pengajuan_judul`
--
ALTER TABLE `pengajuan_judul`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pengajuan_mhs` (`mahasiswa_id`),
  ADD KEY `idx_pengajuan_status` (`status`),
  ADD KEY `idx_pengajuan_prodi` (`prodi_id`),
  ADD KEY `idx_pengajuan_dosen1` (`dosen_usulan1_id`),
  ADD KEY `idx_pengajuan_dosen2` (`dosen_usulan2_id`);

--
-- Indexes for table `pengajuan_persetujuan`
--
ALTER TABLE `pengajuan_persetujuan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pengajuan_persetujuan_attempt` (`bimbingan_id`,`jenis`,`attempt`),
  ADD KEY `idx_pengajuan_persetujuan_mhs` (`mahasiswa_id`),
  ADD KEY `idx_pengajuan_persetujuan_status` (`status`),
  ADD KEY `idx_pengajuan_persetujuan_jenis` (`jenis`),
  ADD KEY `idx_pengajuan_persetujuan_tanggal` (`tanggal_pengajuan`);

--
-- Indexes for table `persetujuan_dosen`
--
ALTER TABLE `persetujuan_dosen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_persetujuan_dosen` (`pengajuan_persetujuan_id`,`dosen_id`),
  ADD KEY `idx_persetujuan_dosen_user` (`dosen_id`),
  ADD KEY `idx_persetujuan_dosen_status` (`status`);

--
-- Indexes for table `prodi`
--
ALTER TABLE `prodi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `idx_prodi_kode` (`kode`),
  ADD KEY `idx_prodi_fakultas` (`fakultas_id`);

--
-- Indexes for table `tahun_ajaran`
--
ALTER TABLE `tahun_ajaran`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `idx_tahun_status` (`status`),
  ADD KEY `idx_tahun_kode` (`kode`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `nim` (`nim`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_prodi` (`prodi_id`),
  ADD KEY `idx_users_nim` (`nim`),
  ADD KEY `idx_users_nip` (`nip`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `fakultas`
--
ALTER TABLE `fakultas`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `konfigurasi_sistem`
--
ALTER TABLE `konfigurasi_sistem`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `prodi`
--
ALTER TABLE `prodi`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tahun_ajaran`
--
ALTER TABLE `tahun_ajaran`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bimbingan`
--
ALTER TABLE `bimbingan`
  ADD CONSTRAINT `fk_bimbingan_dosen1` FOREIGN KEY (`dosen_pembimbing1_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_bimbingan_dosen2` FOREIGN KEY (`dosen_pembimbing2_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bimbingan_mhs` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bimbingan_pengajuan` FOREIGN KEY (`pengajuan_id`) REFERENCES `pengajuan_judul` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `logbook_sesi`
--
ALTER TABLE `logbook_sesi`
  ADD CONSTRAINT `fk_logbook_bimbingan` FOREIGN KEY (`bimbingan_id`) REFERENCES `bimbingan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_logbook_dosen` FOREIGN KEY (`dosen_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_logbook_mhs` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `manajemen_surat`
--
ALTER TABLE `manajemen_surat`
  ADD CONSTRAINT `fk_surat_bimbingan` FOREIGN KEY (`bimbingan_id`) REFERENCES `bimbingan` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_surat_mhs` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_surat_pengajuan` FOREIGN KEY (`pengajuan_id`) REFERENCES `pengajuan_judul` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pengajuan_judul`
--
ALTER TABLE `pengajuan_judul`
  ADD CONSTRAINT `fk_pengajuan_dosen1` FOREIGN KEY (`dosen_usulan1_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pengajuan_dosen2` FOREIGN KEY (`dosen_usulan2_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pengajuan_mhs` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pengajuan_prodi` FOREIGN KEY (`prodi_id`) REFERENCES `prodi` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pengajuan_persetujuan`
--
ALTER TABLE `pengajuan_persetujuan`
  ADD CONSTRAINT `fk_pengajuan_persetujuan_bimbingan` FOREIGN KEY (`bimbingan_id`) REFERENCES `bimbingan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pengajuan_persetujuan_mhs` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `persetujuan_dosen`
--
ALTER TABLE `persetujuan_dosen`
  ADD CONSTRAINT `fk_persetujuan_dosen_pengajuan` FOREIGN KEY (`pengajuan_persetujuan_id`) REFERENCES `pengajuan_persetujuan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_persetujuan_dosen_user` FOREIGN KEY (`dosen_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `prodi`
--
ALTER TABLE `prodi`
  ADD CONSTRAINT `fk_prodi_fakultas` FOREIGN KEY (`fakultas_id`) REFERENCES `fakultas` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_prodi` FOREIGN KEY (`prodi_id`) REFERENCES `prodi` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
