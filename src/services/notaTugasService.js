const PDFDocument = require('pdfkit');

const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const indonesiaMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatIndonesianDate = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${Number(match[3])} ${indonesiaMonths[Number(match[2]) - 1]} ${match[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = (type) => dateParts.find((item) => item.type === type)?.value;
  return `${Number(part('day'))} ${indonesiaMonths[Number(part('month')) - 1]} ${part('year')}`;
};

const createNotaTugasRecord = async (db, { mahasiswaId, pengajuanId, bimbinganId }) => {
  const [existing] = await db.query(
    `SELECT id, no_surat FROM manajemen_surat
     WHERE jenis = 'nota_tugas'
       AND (pengajuan_id = ? OR (bimbingan_id = ? AND ? IS NOT NULL))
     ORDER BY created_at DESC LIMIT 1`,
    [pengajuanId, bimbinganId, bimbinganId]
  );
  if (existing.length > 0) return existing[0];

  const [identityRows] = await db.query(
    `SELECT u.name, u.nim, p.kode AS prodi_kode
     FROM users u
     LEFT JOIN prodi p ON u.prodi_id = p.id
     WHERE u.id = ? LIMIT 1`,
    [mahasiswaId]
  );
  if (identityRows.length === 0) throw new Error('Mahasiswa untuk Nota Tugas tidak ditemukan.');

  const now = new Date();
  const jakartaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit'
  }).formatToParts(now);
  const year = Number(jakartaParts.find((item) => item.type === 'year')?.value);
  const month = Number(jakartaParts.find((item) => item.type === 'month')?.value);
  const sequence = `${Date.now()}`.slice(-7);
  const prodiCode = String(identityRows[0].prodi_kode || 'AKD').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const noSurat = `B.${sequence}/IAIN-ACEH/${prodiCode}/NT/${monthRoman[month - 1]}/${year}`;
  const id = `NT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await db.query(
    `INSERT INTO manajemen_surat
     (id, no_surat, mahasiswa_id, pengajuan_id, bimbingan_id, jenis, perihal, tanggal, status, template_version)
     VALUES (?, ?, ?, ?, ?, 'nota_tugas', 'Nota Tugas Pembimbing Skripsi',
             DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')), 'terbit', 'nota-tugas-v1')`,
    [id, noSurat, mahasiswaId, pengajuanId, bimbinganId]
  );
  if (bimbinganId) {
    await db.query('UPDATE bimbingan SET no_sk = ? WHERE id = ?', [noSurat, bimbinganId]);
  }
  return { id, no_surat: noSurat };
};

const getNotaTugasData = async (db, id) => {
  const [rows] = await db.query(
    `SELECT s.id, s.no_surat, s.mahasiswa_id, s.pengajuan_id, s.bimbingan_id,
            s.tanggal, s.status, s.template_version,
            m.name AS mahasiswa_nama, m.nim AS mahasiswa_nim, m.prodi_id,
            pr.nama AS prodi_nama, pr.kode AS prodi_kode, pr.kaprodi_name,
            f.nama AS fakultas_nama,
            p.judul,
            d1.name AS dosen_pembimbing1_nama, d1.nip AS dosen_pembimbing1_nip,
            d2.name AS dosen_pembimbing2_nama, d2.nip AS dosen_pembimbing2_nip
     FROM manajemen_surat s
     JOIN users m ON m.id = s.mahasiswa_id
     LEFT JOIN prodi pr ON pr.id = m.prodi_id
     LEFT JOIN fakultas f ON f.id = pr.fakultas_id
     LEFT JOIN bimbingan b ON b.id = COALESCE(
       s.bimbingan_id,
       (SELECT b2.id FROM bimbingan b2
        WHERE b2.mahasiswa_id = s.mahasiswa_id
        ORDER BY b2.updated_at DESC LIMIT 1)
     )
     LEFT JOIN pengajuan_judul p ON p.id = COALESCE(s.pengajuan_id, b.pengajuan_id)
     LEFT JOIN users d1 ON d1.id = b.dosen_pembimbing1_id
     LEFT JOIN users d2 ON d2.id = b.dosen_pembimbing2_id
     WHERE s.id = ? AND s.jenis = 'nota_tugas'
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const renderNotaTugasHtml = (data) => {
  const facultyName = data.fakultas_nama || 'Fakultas';
  const supervisor2 = data.dosen_pembimbing2_nama
    ? `<tr><td>Dosen Pembimbing 2</td><td>:</td><td><strong>${escapeHtml(data.dosen_pembimbing2_nama)}</strong></td></tr>`
    : '';

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Nota Tugas ${escapeHtml(data.mahasiswa_nim)}</title>
  <style>
    @page { size: A4; margin: 18mm 22mm 20mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.45; }
    .letterhead { text-align: center; padding-bottom: 10px; border-bottom: 4px double #111; margin-bottom: 26px; }
    .ministry { font-size: 11pt; font-weight: 700; letter-spacing: .4px; }
    .institution { font-size: 16pt; font-weight: 800; letter-spacing: .5px; margin-top: 2px; }
    .faculty { font-size: 13pt; font-weight: 700; text-transform: uppercase; }
    .region { font-size: 10pt; margin-top: 2px; }
    h1 { text-align: center; font-size: 15pt; text-decoration: underline; margin: 0; letter-spacing: .8px; }
    .number { text-align: center; margin: 2px 0 28px; }
    p { margin: 0 0 14px; text-align: justify; }
    table { border-collapse: collapse; width: 100%; }
    .assignment { margin: 8px 0 22px 34px; width: calc(100% - 34px); }
    .assignment td { padding: 3px 0; vertical-align: top; }
    .assignment td:first-child { width: 180px; }
    .assignment td:nth-child(2) { width: 18px; }
    .identity { margin: 8px 0 18px; }
    .identity td { padding: 3px 0; vertical-align: top; }
    .identity td:first-child { width: 150px; }
    .identity td:nth-child(2) { width: 18px; }
    .title { margin: 10px 0 22px; text-align: justify; }
    .signature { width: 46%; margin: 34px 0 46px auto; }
    .signature p { margin: 0; text-align: left; }
    .signature .name { margin-top: 58px; font-weight: 700; text-decoration: underline; }
    .copies { margin-top: 20px; font-size: 10.5pt; }
    .copies ol { margin: 3px 0 0 20px; padding: 0; }
  </style>
</head>
<body>
  <header class="letterhead">
    <div class="ministry">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
    <div class="institution">INSTITUT AGAMA ISLAM NEGERI (IAIN) ACEH</div>
    <div class="faculty">${escapeHtml(facultyName)}</div>
    <div class="region">ACEH</div>
  </header>

  <h1>NOTA TUGAS</h1>
  <div class="number">Nomor: ${escapeHtml(data.no_surat)}</div>

  <p>Ketua Program Studi ${escapeHtml(data.prodi_nama || '-')} ${escapeHtml(facultyName)} Institut Agama Islam Negeri (IAIN) Aceh menugaskan:</p>

  <table class="assignment">
    <tr><td>Dosen Pembimbing 1</td><td>:</td><td><strong>${escapeHtml(data.dosen_pembimbing1_nama || '-')}</strong></td></tr>
    ${supervisor2}
  </table>

  <p>Untuk membimbing dalam menyelesaikan proposal dan skripsi mahasiswa di bawah ini:</p>
  <table class="identity">
    <tr><td>Nama</td><td>:</td><td><strong>${escapeHtml(data.mahasiswa_nama)}</strong></td></tr>
    <tr><td>NIM</td><td>:</td><td>${escapeHtml(data.mahasiswa_nim)}</td></tr>
    <tr><td>Program Studi</td><td>:</td><td>${escapeHtml(data.prodi_nama || '-')}</td></tr>
  </table>

  <p class="title">dengan judul skripsi “<strong>${escapeHtml(data.judul || '-')}</strong>”.</p>
  <p>Demikian Nota Tugas ini dibuat dengan sebenarnya untuk dapat digunakan sebagaimana mestinya.</p>

  <section class="signature">
    <p>Aceh, ${escapeHtml(formatIndonesianDate(data.tanggal))}</p>
    <p>An. Dekan</p>
    <p>Ketua Program Studi ${escapeHtml(data.prodi_nama || '')}</p>
    <p class="name">${escapeHtml(data.kaprodi_name || 'Ketua Program Studi')}</p>
  </section>

  <section class="copies">
    <strong>Tembusan:</strong>
    <ol>
      <li>Dekan ${escapeHtml(facultyName)}</li>
      <li>Bagian Akademik ${escapeHtml(facultyName)}</li>
      <li>Dosen Pembimbing</li>
      <li>Yang bersangkutan</li>
    </ol>
  </section>
</body>
</html>`;
};

const generateNotaTugasPdf = (data) => new Promise((resolve, reject) => {
  const document = new PDFDocument({ size: 'A4', margins: { top: 48, right: 62, bottom: 48, left: 62 }, info: { Title: `Nota Tugas ${data.mahasiswa_nim || ''}`, Author: 'SIBIMA IAIN Aceh' } });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);

  const pageWidth = document.page.width;
  const contentWidth = pageWidth - document.page.margins.left - document.page.margins.right;
  const left = document.page.margins.left;
  const facultyName = data.fakultas_nama || 'Fakultas';

  document.font('Times-Bold').fontSize(10.5).text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', left, 48, { width: contentWidth, align: 'center' });
  document.fontSize(15).text('INSTITUT AGAMA ISLAM NEGERI (IAIN) ACEH', { width: contentWidth, align: 'center' });
  document.fontSize(12.5).text(String(facultyName).toUpperCase(), { width: contentWidth, align: 'center' });
  document.font('Times-Roman').fontSize(9).text('ACEH', { width: contentWidth, align: 'center' });
  const lineY = document.y + 8;
  document.moveTo(left, lineY).lineTo(pageWidth - document.page.margins.right, lineY).lineWidth(1.8).stroke();
  document.moveTo(left, lineY + 3).lineTo(pageWidth - document.page.margins.right, lineY + 3).lineWidth(0.6).stroke();

  document.y = lineY + 24;
  document.font('Times-Bold').fontSize(14).text('NOTA TUGAS', { align: 'center', underline: true });
  document.font('Times-Roman').fontSize(11).text(`Nomor: ${data.no_surat || '-'}`, { align: 'center' });
  document.moveDown(1.6);

  document.fontSize(11.5).text(
    `Ketua Program Studi ${data.prodi_nama || '-'} ${facultyName} Institut Agama Islam Negeri (IAIN) Aceh menugaskan:`,
    { align: 'justify', lineGap: 2 }
  );
  document.moveDown(0.7);

  const writeKeyValue = (label, value, indent = 28) => {
    const y = document.y;
    document.font('Times-Roman').text(label, left + indent, y, { width: 145, continued: false });
    document.text(':', left + indent + 148, y, { width: 10 });
    document.font('Times-Bold').text(value || '-', left + indent + 164, y, { width: contentWidth - indent - 164 });
    document.y = Math.max(document.y, y + 18);
    document.x = left;
  };

  writeKeyValue('Dosen Pembimbing 1', data.dosen_pembimbing1_nama);
  if (data.dosen_pembimbing2_nama) writeKeyValue('Dosen Pembimbing 2', data.dosen_pembimbing2_nama);
  document.moveDown(0.6);

  document.x = left;
  document.font('Times-Roman').fontSize(11.5).text('Untuk membimbing dalam menyelesaikan proposal dan skripsi mahasiswa di bawah ini:', { align: 'justify' });
  document.moveDown(0.6);
  writeKeyValue('Nama', data.mahasiswa_nama, 0);
  writeKeyValue('NIM', data.mahasiswa_nim, 0);
  writeKeyValue('Program Studi', data.prodi_nama, 0);
  document.moveDown(0.5);

  document.font('Times-Roman').fontSize(11.5).text('dengan judul skripsi ', { continued: true });
  document.font('Times-Bold').text(`"${data.judul || '-'}".`, { align: 'justify', lineGap: 2 });
  document.moveDown(1);
  document.font('Times-Roman').text('Demikian Nota Tugas ini dibuat dengan sebenarnya untuk dapat digunakan sebagaimana mestinya.', { align: 'justify', lineGap: 2 });

  const signatureX = pageWidth - document.page.margins.right - 225;
  const signatureY = Math.max(document.y + 30, 490);
  document.font('Times-Roman').fontSize(11).text(`Aceh, ${formatIndonesianDate(data.tanggal)}`, signatureX, signatureY, { width: 225 });
  document.text('An. Dekan', signatureX, document.y, { width: 225 });
  document.text(`Ketua Program Studi ${data.prodi_nama || ''}`, signatureX, document.y, { width: 225 });
  document.y += 56;
  document.font('Times-Bold').text(data.kaprodi_name || 'Ketua Program Studi', signatureX, document.y, { width: 225, underline: true });

  const copiesY = Math.max(document.y + 38, 650);
  document.font('Times-Bold').fontSize(10).text('Tembusan:', left, copiesY);
  document.font('Times-Roman').fontSize(10);
  [
    `1. Dekan ${facultyName}`,
    `2. Bagian Akademik ${facultyName}`,
    '3. Dosen Pembimbing',
    '4. Yang bersangkutan'
  ].forEach((line) => document.text(line, left + 10, document.y + 1));

  document.end();
});

module.exports = {
  createNotaTugasRecord,
  getNotaTugasData,
  renderNotaTugasHtml,
  generateNotaTugasPdf
};
