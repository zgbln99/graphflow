/**
 * Formatowanie dat i statusów dla widoków klubu.
 * Baza zwraca DATETIME jako 'YYYY-MM-DD HH:MM:SS' (dateStrings), więc rozbijamy
 * łańcuch ręcznie zamiast przez Date — dzięki temu wynik nie zależy od strefy
 * czasowej procesu Node ani przeglądarki.
 */

const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

function parts(value) {
  if (!value) return null;
  const text = String(value).replace('T', ' ');
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return {
    year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
    hour: m[4] ? Number(m[4]) : 0, minute: m[5] ? Number(m[5]) : 0
  };
}

/** '04.10.2026' */
function date(value) {
  const p = parts(value);
  if (!p) return '';
  return `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}.${p.year}`;
}

/** '17:30' */
function time(value) {
  const p = parts(value);
  if (!p) return '';
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** 'niedziela 04.10 · 17:30' */
function dateTime(value) {
  const p = parts(value);
  if (!p) return '';
  const weekday = DAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  return `${weekday} ${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')} · ${time(value)}`;
}

/** Wartość dla <input type="datetime-local"> */
function inputValue(value) {
  const p = parts(value);
  if (!p) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Pełnych dni do meczu; ujemne dla przeszłości, null gdy brak daty. */
function daysUntil(value) {
  const p = parts(value);
  if (!p) return null;
  const target = Date.UTC(p.year, p.month - 1, p.day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

/** 'za 6 dni' / 'dzisiaj' / 'jutro' / '3 dni temu' */
function relativeDays(value) {
  const days = daysUntil(value);
  if (days === null) return '';
  if (days === 0) return 'dzisiaj';
  if (days === 1) return 'jutro';
  if (days === -1) return 'wczoraj';
  if (days > 1) return `za ${days} ${days < 5 ? 'dni' : 'dni'}`;
  return `${Math.abs(days)} dni temu`;
}

const MATCH_STATUS = {
  planned: { label: 'Zaplanowany', badge: 'bg-secondary-lt' },
  live: { label: 'Na żywo', badge: 'bg-red-lt' },
  finished: { label: 'Rozegrany', badge: 'bg-green-lt' },
  cancelled: { label: 'Odwołany', badge: 'bg-secondary-lt' }
};

const MATERIAL_STATUS = {
  todo: { label: 'Do zrobienia', badge: 'bg-secondary-lt' },
  ready: { label: 'Gotowe', badge: 'bg-green-lt' },
  published: { label: 'Opublikowane', badge: 'bg-azure-lt' }
};

const ROLE_LABELS = {
  admin: 'Administrator', designer: 'Grafik', social: 'Social media', photographer: 'Fotograf'
};

function matchStatus(status) {
  return MATCH_STATUS[status] || MATCH_STATUS.planned;
}

function materialStatus(status) {
  return MATERIAL_STATUS[status] || MATERIAL_STATUS.todo;
}

function roleLabel(role) {
  return ROLE_LABELS[role] || '—';
}

/** Czy nazwa drużyny to nasz klub (do wyróżnienia w parze). */
function isClub(team, clubName) {
  if (!team || !clubName) return false;
  return String(team).toLowerCase().includes(String(clubName).toLowerCase());
}

function score(match) {
  if (match.home_score === null || match.away_score === null) return null;
  return `${match.home_score} : ${match.away_score}`;
}

module.exports = {
  date, time, dateTime, inputValue, daysUntil, relativeDays,
  matchStatus, materialStatus, roleLabel, isClub, score
};
