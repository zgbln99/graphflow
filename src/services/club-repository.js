/**
 * Dostęp do danych klubu: sezony, mecze i dane dashboardu.
 * Jedyne miejsce z zapytaniami SQL dla tych obszarów — trasy i widoki
 * operują na gotowych obiektach.
 */

const Database = require('../config/database');

const db = Database.getInstance();

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.status = 400;
  }
}

const MATCH_STATUSES = ['planned', 'live', 'finished', 'cancelled'];

/**
 * Sprowadza datę do formatu MySQL. Przyjmuje wartość z <input type="datetime-local">
 * ("2026-10-04T17:30"), łańcuch z bazy ("2026-10-04 17:30:00") oraz obiekt Date.
 * Zwraca null, gdy wartość jest pusta lub nie da się jej rozpoznać.
 */
function toMysqlDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      + ` ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  const text = String(value).trim().replace('T', ' ');
  const match = text.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(:\d{2})?/);
  if (!match) return null;
  return `${match[1]} ${match[2]}${match[3] || ':00'}`;
}
const MATERIAL_STATUSES = ['todo', 'ready', 'published'];

/* ---------------------------------------------------------------- sezony */

async function listSeasons() {
  return db.query(`
    SELECT s.id, s.name, s.starts_on, s.ends_on, s.is_active,
           COUNT(m.id) AS match_count
    FROM cg_seasons s
    LEFT JOIN cg_matches m ON m.season_id = s.id
    GROUP BY s.id
    ORDER BY s.is_active DESC, COALESCE(s.starts_on, '1900-01-01') DESC, s.id DESC
  `);
}

async function getActiveSeason() {
  return db.fetch(`
    SELECT id, name, starts_on, ends_on, is_active
    FROM cg_seasons
    ORDER BY is_active DESC, COALESCE(starts_on, '1900-01-01') DESC, id DESC
    LIMIT 1
  `);
}

function normalizeSeason(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new ValidationError('Podaj nazwę sezonu.', 'name');
  if (name.length > 64) throw new ValidationError('Nazwa sezonu może mieć maksymalnie 64 znaki.', 'name');

  const startsOn = payload.starts_on ? String(payload.starts_on).slice(0, 10) : null;
  const endsOn = payload.ends_on ? String(payload.ends_on).slice(0, 10) : null;
  if (startsOn && endsOn && endsOn < startsOn) {
    throw new ValidationError('Koniec sezonu nie może wypadać przed jego początkiem.', 'ends_on');
  }
  return { name, starts_on: startsOn, ends_on: endsOn };
}

async function createSeason(payload) {
  const data = normalizeSeason(payload);
  const existing = await db.fetch('SELECT id FROM cg_seasons WHERE name = ? LIMIT 1', [data.name]);
  if (existing) throw new ValidationError('Sezon o tej nazwie już istnieje.', 'name');

  const count = await db.fetch('SELECT COUNT(*) AS total FROM cg_seasons');
  const shouldActivate = payload.is_active === true || Number(count.total) === 0;

  const id = await db.insert('cg_seasons', { ...data, is_active: shouldActivate ? 1 : 0 });
  if (shouldActivate) await activateSeason(id);
  return getSeason(id);
}

async function getSeason(id) {
  return db.fetch('SELECT id, name, starts_on, ends_on, is_active FROM cg_seasons WHERE id = ?', [Number(id)]);
}

async function updateSeason(id, payload) {
  const season = await getSeason(id);
  if (!season) throw new ValidationError('Nie znaleziono sezonu.');
  const data = normalizeSeason(payload);
  const clash = await db.fetch('SELECT id FROM cg_seasons WHERE name = ? AND id <> ? LIMIT 1', [data.name, Number(id)]);
  if (clash) throw new ValidationError('Sezon o tej nazwie już istnieje.', 'name');

  await db.update('cg_seasons', data, 'id = ?', [Number(id)]);
  return getSeason(id);
}

async function activateSeason(id) {
  const season = await getSeason(id);
  if (!season) throw new ValidationError('Nie znaleziono sezonu.');
  await db.query('UPDATE cg_seasons SET is_active = IF(id = ?, 1, 0)', [Number(id)]);
  return getSeason(id);
}

async function deleteSeason(id) {
  const season = await getSeason(id);
  if (!season) throw new ValidationError('Nie znaleziono sezonu.');

  const matches = await db.fetch('SELECT COUNT(*) AS total FROM cg_matches WHERE season_id = ?', [Number(id)]);
  if (Number(matches.total) > 0) {
    throw new ValidationError(
      `Sezon ma przypisane mecze (${matches.total}). Usuń je najpierw albo przenieś do innego sezonu.`
    );
  }

  await db.delete('cg_seasons', 'id = ?', [Number(id)]);
  if (season.is_active) {
    const next = await db.fetch('SELECT id FROM cg_seasons ORDER BY id DESC LIMIT 1');
    if (next) await activateSeason(next.id);
  }
  return true;
}

/* ----------------------------------------------------------------- mecze */

function normalizeMatch(payload) {
  const homeTeam = String(payload.home_team || '').trim();
  const awayTeam = String(payload.away_team || '').trim();
  if (!homeTeam) throw new ValidationError('Podaj gospodarza.', 'home_team');
  if (!awayTeam) throw new ValidationError('Podaj gościa.', 'away_team');

  const seasonId = Number(payload.season_id);
  if (!Number.isInteger(seasonId) || seasonId <= 0) throw new ValidationError('Wybierz sezon.', 'season_id');

  const matchDate = toMysqlDateTime(payload.match_date);
  if (!matchDate) throw new ValidationError('Podaj poprawną datę i godzinę meczu.', 'match_date');

  const status = MATCH_STATUSES.includes(payload.status) ? payload.status : 'planned';
  const toScore = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > 300) {
      throw new ValidationError('Wynik musi być liczbą z zakresu 0–300.', 'score');
    }
    return score;
  };

  return {
    season_id: seasonId,
    home_team: homeTeam.slice(0, 160),
    away_team: awayTeam.slice(0, 160),
    match_date: matchDate,
    venue: payload.venue ? String(payload.venue).trim().slice(0, 255) : null,
    competition: payload.competition ? String(payload.competition).trim().slice(0, 160) : null,
    round_name: payload.round_name ? String(payload.round_name).trim().slice(0, 80) : null,
    home_score: toScore(payload.home_score),
    away_score: toScore(payload.away_score),
    status
  };
}

const MATCH_COLUMNS = `
  m.id, m.season_id, m.home_team, m.away_team, m.match_date, m.venue,
  m.competition, m.round_name, m.home_score, m.away_score, m.status,
  s.name AS season_name
`;

async function listMatches({ seasonId = null, status = null, search = null } = {}) {
  const where = [];
  const params = [];

  if (seasonId) { where.push('m.season_id = ?'); params.push(Number(seasonId)); }
  if (status && MATCH_STATUSES.includes(status)) { where.push('m.status = ?'); params.push(status); }
  if (search) {
    where.push('(m.home_team LIKE ? OR m.away_team LIKE ? OR m.venue LIKE ?)');
    const like = `%${String(search).trim()}%`;
    params.push(like, like, like);
  }

  return db.query(`
    SELECT ${MATCH_COLUMNS},
           (SELECT COUNT(*) FROM cg_match_templates mt WHERE mt.match_id = m.id) AS materials_total,
           (SELECT COUNT(*) FROM cg_match_templates mt WHERE mt.match_id = m.id AND mt.status IN ('ready','published')) AS materials_ready
    FROM cg_matches m
    JOIN cg_seasons s ON s.id = m.season_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.match_date DESC
  `, params);
}

async function getMatch(id) {
  return db.fetch(`
    SELECT ${MATCH_COLUMNS}
    FROM cg_matches m
    JOIN cg_seasons s ON s.id = m.season_id
    WHERE m.id = ?
  `, [Number(id)]);
}

async function createMatch(payload) {
  const data = normalizeMatch(payload);
  const season = await getSeason(data.season_id);
  if (!season) throw new ValidationError('Wybrany sezon nie istnieje.', 'season_id');
  const id = await db.insert('cg_matches', data);
  return getMatch(id);
}

async function updateMatch(id, payload) {
  const current = await getMatch(id);
  if (!current) throw new ValidationError('Nie znaleziono meczu.');
  const data = normalizeMatch({ ...current, ...payload });
  const season = await getSeason(data.season_id);
  if (!season) throw new ValidationError('Wybrany sezon nie istnieje.', 'season_id');
  await db.update('cg_matches', data, 'id = ?', [Number(id)]);
  return getMatch(id);
}

async function deleteMatch(id) {
  const match = await getMatch(id);
  if (!match) throw new ValidationError('Nie znaleziono meczu.');
  await db.delete('cg_matches', 'id = ?', [Number(id)]);
  return true;
}


/* -------------------------------------------------------------- szablony */

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'date', 'photo'];
const TEMPLATE_CATEGORIES = ['match', 'other'];
const OWNER_ROLES = ['admin', 'designer', 'social', 'photographer'];

/** MariaDB zwraca JSON już sparsowany, MySQL bywa różny — przyjmujemy oba. */
function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * Sprawdza definicję szablonu. Pola dynamiczne to sedno aplikacji — aplikacja
 * nie ma żadnych pól wpisanych na stałe, więc walidacja musi być szczelna.
 */
function normalizeDefinition(raw) {
  const definition = parseJson(raw, {}) || {};
  const fields = Array.isArray(definition.fields) ? definition.fields : [];
  const seen = new Set();

  const normalized = fields.map((field, index) => {
    const key = String(field.key || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) {
      throw new ValidationError(
        `Pole ${index + 1}: klucz może zawierać tylko małe litery, cyfry i podkreślenia, i musi zaczynać się od litery.`,
        'fields'
      );
    }
    if (seen.has(key)) throw new ValidationError(`Pole „${key}” występuje dwa razy.`, 'fields');
    seen.add(key);

    const label = String(field.label || '').trim();
    if (!label) throw new ValidationError(`Pole „${key}” nie ma etykiety.`, 'fields');
    if (label.length > 80) throw new ValidationError(`Etykieta pola „${key}” jest za długa.`, 'fields');

    const type = FIELD_TYPES.includes(field.type) ? field.type : 'text';
    const options = type === 'select'
      ? (Array.isArray(field.options) ? field.options : String(field.options || '').split('\n'))
        .map((option) => String(option).trim()).filter(Boolean)
      : [];
    if (type === 'select' && options.length === 0) {
      throw new ValidationError(`Pole „${key}” typu lista musi mieć co najmniej jedną opcję.`, 'fields');
    }

    return {
      key,
      label,
      type,
      required: Boolean(field.required),
      default: field.default === undefined || field.default === null ? '' : String(field.default).slice(0, 500),
      options
    };
  });

  return {
    version: 1,
    fields: normalized,
    // Warstwy uzupełni layer engine; zachowujemy je przy edycji pól.
    layers: Array.isArray(definition.layers) ? definition.layers : []
  };
}

function normalizeTemplate(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new ValidationError('Podaj nazwę szablonu.', 'name');
  if (name.length > 160) throw new ValidationError('Nazwa szablonu może mieć maksymalnie 160 znaków.', 'name');

  const category = TEMPLATE_CATEGORIES.includes(payload.category) ? payload.category : 'match';
  const size = (value, field, fallback) => {
    const number = Number(value ?? fallback);
    if (!Number.isInteger(number) || number < 100 || number > 8000) {
      throw new ValidationError('Wymiar musi być liczbą całkowitą z zakresu 100–8000 pikseli.', field);
    }
    return number;
  };

  return {
    name,
    category,
    width: size(payload.width, 'width', 1080),
    height: size(payload.height, 'height', 1350),
    is_active: payload.is_active === false ? 0 : 1,
    definition: JSON.stringify(normalizeDefinition(payload.definition))
  };
}

function decorateTemplate(row) {
  if (!row) return null;
  const definition = parseJson(row.definition, { fields: [], layers: [] });
  return {
    ...row,
    definition,
    field_count: Array.isArray(definition.fields) ? definition.fields.length : 0
  };
}

async function listTemplates({ category = null } = {}) {
  const where = [];
  const params = [];
  if (category && TEMPLATE_CATEGORIES.includes(category)) { where.push('category = ?'); params.push(category); }

  const rows = await db.query(`
    SELECT id, name, category, width, height, is_active, definition, updated_at
    FROM cg_templates
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY category, name
  `, params);
  return rows.map(decorateTemplate);
}

async function getTemplate(id) {
  return decorateTemplate(await db.fetch(`
    SELECT id, name, category, width, height, is_active, definition, updated_at
    FROM cg_templates WHERE id = ?
  `, [Number(id)]));
}

async function createTemplate(payload, userId = null) {
  const data = normalizeTemplate(payload);
  const clash = await db.fetch('SELECT id FROM cg_templates WHERE name = ? LIMIT 1', [data.name]);
  if (clash) throw new ValidationError('Szablon o tej nazwie już istnieje.', 'name');
  const id = await db.insert('cg_templates', { ...data, created_by: userId });
  return getTemplate(id);
}

async function updateTemplate(id, payload) {
  const current = await getTemplate(id);
  if (!current) throw new ValidationError('Nie znaleziono szablonu.');
  const data = normalizeTemplate({ ...current, ...payload });
  const clash = await db.fetch('SELECT id FROM cg_templates WHERE name = ? AND id <> ? LIMIT 1', [data.name, Number(id)]);
  if (clash) throw new ValidationError('Szablon o tej nazwie już istnieje.', 'name');
  await db.update('cg_templates', data, 'id = ?', [Number(id)]);
  return getTemplate(id);
}

async function deleteTemplate(id) {
  const template = await getTemplate(id);
  if (!template) throw new ValidationError('Nie znaleziono szablonu.');

  const used = await db.fetch(
    'SELECT (SELECT COUNT(*) FROM cg_match_templates WHERE template_id = ?) AS matches,'
    + ' (SELECT COUNT(*) FROM cg_designs WHERE template_id = ?) AS designs',
    [Number(id), Number(id)]
  );
  if (Number(used.matches) > 0 || Number(used.designs) > 0) {
    throw new ValidationError(
      `Szablon jest w użyciu (mecze: ${used.matches}, projekty: ${used.designs}). `
      + 'Odepnij go od meczów albo oznacz jako nieaktywny.'
    );
  }

  await db.delete('cg_templates', 'id = ?', [Number(id)]);
  return true;
}

/* ------------------------------------------------- materiały meczowe */

async function addMatchMaterial(matchId, payload) {
  const match = await getMatch(matchId);
  if (!match) throw new ValidationError('Nie znaleziono meczu.');
  const template = await getTemplate(payload.template_id);
  if (!template) throw new ValidationError('Wybierz szablon.', 'template_id');

  const existing = await db.fetch(
    'SELECT id FROM cg_match_templates WHERE match_id = ? AND template_id = ? LIMIT 1',
    [Number(matchId), template.id]
  );
  if (existing) throw new ValidationError('Ten szablon jest już przypisany do meczu.', 'template_id');

  const last = await db.fetch('SELECT MAX(sort_order) AS max_order FROM cg_match_templates WHERE match_id = ?', [Number(matchId)]);
  const id = await db.insert('cg_match_templates', {
    match_id: Number(matchId),
    template_id: template.id,
    sort_order: Number(last.max_order || 0) + 1,
    status: 'todo',
    deadline_at: toMysqlDateTime(payload.deadline_at),
    owner_role: OWNER_ROLES.includes(payload.owner_role) ? payload.owner_role : null,
    note: payload.note ? String(payload.note).trim().slice(0, 255) : null
  });
  return getMatchMaterial(id);
}

async function getMatchMaterial(id) {
  return db.fetch(`
    SELECT mt.id, mt.match_id, mt.template_id, mt.status, mt.deadline_at, mt.owner_role, mt.note, mt.sort_order,
           t.name AS template_name, t.width, t.height, t.category
    FROM cg_match_templates mt
    JOIN cg_templates t ON t.id = mt.template_id
    WHERE mt.id = ?
  `, [Number(id)]);
}

async function updateMatchMaterial(id, payload) {
  const current = await getMatchMaterial(id);
  if (!current) throw new ValidationError('Nie znaleziono materiału.');

  const data = {};
  if (payload.status !== undefined) {
    if (!MATERIAL_STATUSES.includes(payload.status)) throw new ValidationError('Nieznany status materiału.', 'status');
    data.status = payload.status;
  }
  if (payload.deadline_at !== undefined) data.deadline_at = toMysqlDateTime(payload.deadline_at);
  if (payload.owner_role !== undefined) {
    data.owner_role = OWNER_ROLES.includes(payload.owner_role) ? payload.owner_role : null;
  }
  if (payload.note !== undefined) data.note = payload.note ? String(payload.note).trim().slice(0, 255) : null;
  if (payload.sort_order !== undefined) data.sort_order = Number(payload.sort_order) || 0;

  if (Object.keys(data).length === 0) return current;
  await db.update('cg_match_templates', data, 'id = ?', [Number(id)]);
  return getMatchMaterial(id);
}

async function deleteMatchMaterial(id) {
  const material = await getMatchMaterial(id);
  if (!material) throw new ValidationError('Nie znaleziono materiału.');
  await db.delete('cg_match_templates', 'id = ?', [Number(id)]);
  return true;
}

/* ------------------------------------------------------------- dashboard */

async function getNextMatch(seasonId) {
  if (!seasonId) return null;
  const upcoming = await db.fetch(`
    SELECT ${MATCH_COLUMNS}
    FROM cg_matches m
    JOIN cg_seasons s ON s.id = m.season_id
    WHERE m.season_id = ? AND m.status IN ('planned','live') AND m.match_date >= NOW() - INTERVAL 4 HOUR
    ORDER BY m.match_date ASC
    LIMIT 1
  `, [Number(seasonId)]);
  if (upcoming) return upcoming;

  return db.fetch(`
    SELECT ${MATCH_COLUMNS}
    FROM cg_matches m
    JOIN cg_seasons s ON s.id = m.season_id
    WHERE m.season_id = ?
    ORDER BY m.match_date DESC
    LIMIT 1
  `, [Number(seasonId)]);
}

async function getMatchMaterials(matchId) {
  if (!matchId) return [];
  return db.query(`
    SELECT mt.id, mt.status, mt.deadline_at, mt.owner_role, mt.note, mt.sort_order,
           t.name AS template_name, t.width, t.height, t.category
    FROM cg_match_templates mt
    JOIN cg_templates t ON t.id = mt.template_id
    WHERE mt.match_id = ?
    ORDER BY COALESCE(mt.deadline_at, '2999-01-01'), mt.sort_order, t.name
  `, [Number(matchId)]);
}

async function getMatchFolders(matchId) {
  if (!matchId) return [];
  return db.query(`
    SELECT f.id, f.name, f.role, f.prefix_path,
           COUNT(p.id) AS photo_count,
           MAX(p.indexed_at) AS last_indexed_at
    FROM cg_s3_folders f
    LEFT JOIN cg_photo_index p ON p.folder_id = f.id
    WHERE f.match_id = ?
    GROUP BY f.id
    ORDER BY f.name
  `, [Number(matchId)]);
}

async function getRecentExports(limit = 6) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 50);
  return db.query(`
    SELECT e.id, e.format, e.width, e.height, e.created_at,
           d.title AS design_title,
           t.name AS template_name,
           m.home_team, m.away_team
    FROM cg_exports e
    JOIN cg_designs d ON d.id = e.design_id
    JOIN cg_templates t ON t.id = d.template_id
    LEFT JOIN cg_matches m ON m.id = d.match_id
    ORDER BY e.created_at DESC
    LIMIT ${safeLimit}
  `);
}

/** Pełna historia eksportów dla widoku Historia. */
async function listExports(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return db.query(`
    SELECT e.id, e.format, e.width, e.height, e.created_at,
           d.title AS design_title, t.name AS template_name,
           m.home_team, m.away_team, u.display_name AS user_name
    FROM cg_exports e
    JOIN cg_designs d ON d.id = e.design_id
    JOIN cg_templates t ON t.id = d.template_id
    LEFT JOIN cg_matches m ON m.id = d.match_id
    LEFT JOIN cg_users u ON u.id = e.created_by
    ORDER BY e.created_at DESC
    LIMIT ${safeLimit}
  `);
}

async function getOffMatchMaterials(limit = 6) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 50);
  return db.query(`
    SELECT d.id, d.title, d.updated_at, t.name AS template_name, t.width, t.height
    FROM cg_designs d
    JOIN cg_templates t ON t.id = d.template_id
    WHERE d.match_id IS NULL
    ORDER BY d.updated_at DESC
    LIMIT ${safeLimit}
  `);
}

/**
 * Lista rzeczy wymagających reakcji — wyliczana z danych, nie wpisana na sztywno.
 * Kolejność: zaległe terminy, potem braki w konfiguracji meczu.
 */
function buildAlerts({ season, nextMatch, materials, folders }) {
  const alerts = [];

  if (!season) {
    alerts.push({ level: 'urgent', title: 'Brak sezonu', detail: 'Utwórz sezon, żeby dodawać mecze.' });
    return alerts;
  }

  const overdue = materials.filter((item) => item.status === 'todo' && item.deadline_at
    && new Date(item.deadline_at.replace(' ', 'T')) < new Date());
  overdue.forEach((item) => {
    alerts.push({
      level: 'urgent',
      title: `Zaległy materiał: ${item.template_name}`,
      detail: `Termin minął ${item.deadline_at.slice(0, 16).replace('T', ' ')}`
    });
  });

  if (!nextMatch) {
    alerts.push({ level: 'soon', title: 'Brak nadchodzących meczów', detail: 'Dodaj mecz do aktywnego sezonu.' });
    return alerts;
  }

  if (materials.length === 0) {
    alerts.push({
      level: 'soon',
      title: 'Mecz bez przypisanych grafik',
      detail: 'Przypisz szablony, żeby powstał harmonogram materiałów.'
    });
  }

  if (folders.length === 0) {
    alerts.push({
      level: 'soon',
      title: 'Mecz bez folderów zdjęć',
      detail: 'Bez folderu fotograf nie ma gdzie wrzucić zdjęć.'
    });
  }

  return alerts;
}

async function getDashboard() {
  const seasons = await listSeasons();
  const season = seasons.find((item) => item.is_active) || seasons[0] || null;
  const nextMatch = season ? await getNextMatch(season.id) : null;

  const [materials, folders, exports, offMatch] = await Promise.all([
    getMatchMaterials(nextMatch?.id),
    getMatchFolders(nextMatch?.id),
    getRecentExports(),
    getOffMatchMaterials()
  ]);

  const photoCount = folders.reduce((sum, folder) => sum + Number(folder.photo_count || 0), 0);
  const weekExports = await db.fetch(
    'SELECT COUNT(*) AS total FROM cg_exports WHERE created_at >= NOW() - INTERVAL 7 DAY'
  );
  const matchCount = season
    ? await db.fetch('SELECT COUNT(*) AS total FROM cg_matches WHERE season_id = ?', [season.id])
    : { total: 0 };

  const readyCount = materials.filter((item) => item.status !== 'todo').length;

  return {
    seasons,
    season,
    alerts: buildAlerts({ season, nextMatch, materials, folders }),
    matchCount: Number(matchCount.total),
    nextMatch,
    materials,
    folders,
    exports,
    offMatch,
    counters: {
      photoCount,
      weekExports: Number(weekExports.total),
      materialsReady: readyCount,
      materialsTotal: materials.length
    }
  };
}

module.exports = {
  ValidationError,
  MATCH_STATUSES,
  MATERIAL_STATUSES,
  FIELD_TYPES,
  TEMPLATE_CATEGORIES,
  OWNER_ROLES,
  listExports,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getMatchMaterials,
  getMatchMaterial,
  addMatchMaterial,
  updateMatchMaterial,
  deleteMatchMaterial,
  listSeasons,
  getActiveSeason,
  getSeason,
  createSeason,
  updateSeason,
  activateSeason,
  deleteSeason,
  listMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  getDashboard
};
