-- Seeder idempotent untuk admin Program Studi Sistem Informasi (prodi_id = 2).
-- Kredensial awal:
--   Email    : admin.si@sibima.com
--   Password : password

START TRANSACTION;

INSERT INTO users (
  id,
  name,
  email,
  password,
  role,
  status,
  prodi_id,
  nim,
  nip,
  angkatan,
  phone,
  alamat,
  keahlian,
  kuota_max
)
SELECT
  'admin-prodi-2',
  'Admin Prodi Sistem Informasi',
  'admin.si@sibima.com',
  '$2a$10$WRHL4IIrcLPwJ6MRH5IYG.LMZ4ygR1hpmz1ir6gn8rZ8cusNO9Nci',
  'admin',
  'aktif',
  p.id,
  NULL,
  NULL,
  NULL,
  NULL,
  'Fakultas Sains dan Teknologi - Program Studi Sistem Informasi',
  NULL,
  10
FROM prodi p
WHERE p.id = 2
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  password = VALUES(password),
  role = VALUES(role),
  status = VALUES(status),
  prodi_id = VALUES(prodi_id),
  nim = VALUES(nim),
  nip = VALUES(nip),
  angkatan = VALUES(angkatan),
  phone = VALUES(phone),
  alamat = VALUES(alamat),
  keahlian = VALUES(keahlian),
  kuota_max = VALUES(kuota_max);

COMMIT;

SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.status,
  u.prodi_id,
  p.nama AS program_studi
FROM users u
JOIN prodi p ON p.id = u.prodi_id
WHERE u.email = 'admin.si@sibima.com';
