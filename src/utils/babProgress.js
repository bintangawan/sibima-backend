const BAB_DEFINITIONS = [
  { number: 1, value: 'Bab 1 - Pendahuluan', label: 'Bab 1 - Pendahuluan' },
  { number: 2, value: 'Bab 2 - Kajian Pustaka', label: 'Bab 2 - Kajian Pustaka' },
  { number: 3, value: 'Bab 3 - Metodologi', label: 'Bab 3 - Metodologi' },
  { number: 4, value: 'Bab 4 - Hasil & Pembahasan', label: 'Bab 4 - Hasil & Pembahasan' },
  { number: 5, value: 'Bab 5 - Penutup', label: 'Bab 5 - Penutup' }
];

const parseBabNumber = (bab) => {
  const match = String(bab || '').match(/^Bab\s+([1-5])\b/i);
  return match ? Number(match[1]) : null;
};

const buildBabProgress = (sessions = []) => {
  const latestByBab = new Map();

  [...sessions]
    .sort((a, b) => Number(b.pertemuan || 0) - Number(a.pertemuan || 0))
    .forEach((session) => {
      const number = parseBabNumber(session.bab);
      if (number && !latestByBab.has(number)) latestByBab.set(number, session);
    });

  return BAB_DEFINITIONS.map((definition, index) => {
    const latest = latestByBab.get(definition.number) || null;
    const allPreviousApproved = BAB_DEFINITIONS
      .slice(0, index)
      .every((previousDefinition) => latestByBab.get(previousDefinition.number)?.status === 'disetujui');
    return {
      ...definition,
      status: latest?.status || 'belum_dimulai',
      latest_session_id: latest?.id || null,
      latest_pertemuan: latest ? Number(latest.pertemuan) : null,
      unlocked: index === 0 || allPreviousApproved
    };
  });
};

const getBabProgress = async (db, bimbinganId) => {
  const [sessions] = await db.query(
    `SELECT id, bab, status, pertemuan
     FROM logbook_sesi
     WHERE bimbingan_id = ?
     ORDER BY pertemuan DESC`,
    [bimbinganId]
  );
  return buildBabProgress(sessions);
};

module.exports = {
  BAB_DEFINITIONS,
  parseBabNumber,
  buildBabProgress,
  getBabProgress
};
