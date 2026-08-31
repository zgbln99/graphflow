/**
 * Dostęp do danych klubu: sezony, mecze i dane dashboardu.
 * Jedyne miejsce z zapytaniami SQL dla tych obszarów — trasy i widoki
 * operują na gotowych obiektach.
 */

const Database = require('../config/database');
const storage = require('./storage');

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

const LAYER_TYPES = ['background', 'photo', 'text', 'overlay', 'logo', 'shape'];
const FIT_MODES = ['cover', 'contain'];
const ALIGNMENTS = ['left', 'center', 'right'];
const MASK_SHAPES = ['rect', 'circle'];

// Kroje pisma dostępne w panelu. Klubowy ZT Talk jest domyślny; reszta to
// bezpieczne kroje systemowe, na wypadek grafik spoza identyfikacji wizualnej.
const FONT_FAMILIES = [
  { key: 'talk', label: 'ZT Talk', stack: '"ZT Talk", sans-serif' },
  { key: 'talk-expanded', label: 'ZT Talk Expanded', stack: '"ZT Talk Expanded", "ZT Talk", sans-serif' },
  { key: 'sans', label: 'Bezszeryfowa systemowa', stack: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif' },
  { key: 'serif', label: 'Szeryfowa systemowa', stack: 'Georgia, "Times New Roman", serif' },
  { key: 'mono', label: 'O stałej szerokości', stack: 'ui-monospace, "Courier New", monospace' }
];
const FONT_KEYS = FONT_FAMILIES.map((font) => font.key);

/**
 * Warstwy szablonu. Kolejność rysowania wynika z pola z (rosnąco), więc overlay
 * z przezroczystością można położyć nad zdjęciem — to główny przypadek użycia.
 * Współrzędne są w pikselach szablonu, niezależne od skali podglądu.
 */
function normalizeLayers(rawLayers, { width, height, fieldKeys }) {
  const layers = Array.isArray(rawLayers) ? rawLayers : [];
  const seen = new Set();

  const number = (value, fallback, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  };

  return layers.map((layer, index) => {
    const type = LAYER_TYPES.includes(layer.type) ? layer.type : 'shape';
    const name = String(layer.name || '').trim() || `Warstwa ${index + 1}`;

    let id = String(layer.id || '').trim();
    if (!/^[a-z0-9_-]{1,40}$/i.test(id) || seen.has(id)) id = `l${index + 1}_${Math.random().toString(36).slice(2, 8)}`;
    seen.add(id);

    // Powiązanie z polem dynamicznym — tylko dla warstw, które biorą treść z formularza.
    // Logo jest wśród nich, bo herb rywala zmienia się z meczu na mecz.
    let field = null;
    if (type === 'text' || type === 'photo' || type === 'logo') {
      const key = String(layer.field || '').trim();
      if (key && !fieldKeys.includes(key)) {
        throw new ValidationError(
          `Warstwa „${name}” wskazuje pole „${key}”, którego nie ma w szablonie.`, 'layers'
        );
      }
      field = key || null;
    }

    const base = {
      id,
      name: name.slice(0, 80),
      type,
      z: number(layer.z, index + 1, 0, 999),
      visible: layer.visible !== false,
      locked: Boolean(layer.locked),
      opacity: number(layer.opacity, 1, 0, 1),
      x: Math.round(number(layer.x, 0, -width * 2, width * 3)),
      y: Math.round(number(layer.y, 0, -height * 2, height * 3)),
      w: Math.round(number(layer.w, width, 1, width * 3)),
      h: Math.round(number(layer.h, height, 1, height * 3)),
      rotation: number(layer.rotation, 0, -360, 360),
      field,
      asset_id: layer.asset_id ? Number(layer.asset_id) : null
    };

    if (type === 'photo' || type === 'logo') {
      // Zdjęcie domyślnie wypełnia maskę, logo domyślnie mieści się w całości.
      base.fit = FIT_MODES.includes(layer.fit) ? layer.fit : (type === 'logo' ? 'contain' : 'cover');
      base.mask = MASK_SHAPES.includes(layer.mask) ? layer.mask : 'rect';
      base.radius = Math.round(number(layer.radius, 0, 0, 2000));
    }
    if (type === 'text') {
      base.color = /^#[0-9a-f]{3,8}$/i.test(layer.color || '') ? layer.color : '#ffffff';
      base.fontSize = Math.round(number(layer.fontSize, 64, 6, 800));
      base.fontFamily = FONT_KEYS.includes(layer.fontFamily) || String(layer.fontFamily || '').startsWith('asset:')
        ? layer.fontFamily
        : 'talk';
      base.italic = Boolean(layer.italic);
      base.fontWeight = [400, 500, 600, 700].includes(Number(layer.fontWeight)) ? Number(layer.fontWeight) : 700;
      base.align = ALIGNMENTS.includes(layer.align) ? layer.align : 'left';
      base.lineHeight = number(layer.lineHeight, 1.1, 0.6, 3);
      base.letterSpacing = number(layer.letterSpacing, 0, -20, 60);
      base.uppercase = Boolean(layer.uppercase);
      base.text = layer.text ? String(layer.text).slice(0, 300) : '';
    }
    if (type === 'background' || type === 'shape') {
      base.color = /^#[0-9a-f]{3,8}$/i.test(layer.color || '') ? layer.color : '#111111';
      base.radius = Math.round(number(layer.radius, 0, 0, 2000));
    }

    return base;
  }).sort((a, b) => a.z - b.z);
}

function normalizeDefinition(raw, options = {}) {
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
    layers: normalizeLayers(definition.layers, {
      width: Number(options.width) || 1080,
      height: Number(options.height) || 1350,
      fieldKeys: normalized.map((field) => field.key)
    })
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
    definition: JSON.stringify(normalizeDefinition(payload.definition, {
      width: size(payload.width, 'width', 1080),
      height: size(payload.height, 'height', 1350)
    }))
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

async function getTemplate(id, { withAssets = false } = {}) {
  const template = decorateTemplate(await db.fetch(`
    SELECT id, name, category, width, height, is_active, definition, updated_at
    FROM cg_templates WHERE id = ?
  `, [Number(id)]));
  if (template && withAssets) template.assets = await listTemplateAssets(template.id);
  return template;
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

async function templateUsage(id) {
  const row = await db.fetch(
    'SELECT (SELECT COUNT(*) FROM cg_match_templates WHERE template_id = ?) AS matches,'
    + ' (SELECT COUNT(*) FROM cg_designs WHERE template_id = ?) AS designs',
    [Number(id), Number(id)]
  );
  return { matches: Number(row?.matches) || 0, designs: Number(row?.designs) || 0 };
}

/**
 * Usunięcie szablonu w użyciu jest zablokowane, ale nie na głucho: zwracamy
 * liczby, żeby panel mógł zapytać wprost, czy usunąć razem z materiałami
 * i grafikami. Wcześniej zostawał tylko komunikat, którego nie było gdzie
 * pokazać — i wyglądało to jak przycisk, który nie działa.
 */
async function deleteTemplate(id, { force = false } = {}) {
  const template = await getTemplate(id);
  if (!template) throw new ValidationError('Nie znaleziono szablonu.');

  const used = await templateUsage(id);
  if ((used.matches || used.designs) && !force) {
    const error = new ValidationError('Szablon jest w użyciu.');
    error.usage = used;
    error.status = 409;
    throw error;
  }

  if (force) {
    // Eksporty i materiały znikają razem z grafikami dzięki kluczom obcym.
    await db.delete('cg_designs', 'template_id = ?', [Number(id)]);
    await db.delete('cg_match_templates', 'template_id = ?', [Number(id)]);
  }

  await db.delete('cg_templates', 'id = ?', [Number(id)]);
  return used;
}


/* ------------------------------------------------- zasoby szablonów */

// „source" to plik źródłowy szablonu (PSD) — trzymamy go razem z resztą,
// żeby dało się wrócić do oryginału bez szukania po dyskach grafika.
const ASSET_KINDS = ['overlay', 'background', 'mask', 'font', 'image', 'source'];

/**
 * Pliki szablonu podajemy pod adresem naszej aplikacji, a nie magazynu:
 * obraz z obcej domeny „zatruwa" płótno i uniemożliwia eksport do pliku.
 */
function decorateAsset(asset) {
  if (!asset) return null;
  return {
    ...asset,
    metadata: parseJson(asset.metadata, null),
    url: `/api/assets/${asset.id}/file`
  };
}

/** Czcionki wgrane przy dowolnym szablonie — do wyboru w każdym. */
async function listFonts() {
  const rows = await db.query(`
    SELECT id, template_id, kind, object_key, metadata, created_at
    FROM cg_template_assets WHERE kind = 'font' ORDER BY id
  `);
  return rows.map(decorateAsset);
}

async function listTemplateAssets(templateId) {
  const rows = await db.query(`
    SELECT id, template_id, kind, object_key, metadata, created_at
    FROM cg_template_assets WHERE template_id = ? ORDER BY id
  `, [Number(templateId)]);
  return rows.map(decorateAsset);
}

async function addTemplateAsset(templateId, { kind, objectKey, metadata = null }) {
  const template = await getTemplate(templateId);
  if (!template) throw new ValidationError('Nie znaleziono szablonu.');
  if (!ASSET_KINDS.includes(kind)) throw new ValidationError('Nieznany rodzaj zasobu.', 'kind');

  const id = await db.insert('cg_template_assets', {
    template_id: Number(templateId),
    kind,
    object_key: objectKey,
    metadata: metadata ? JSON.stringify(metadata) : null
  });
  return decorateAsset(await db.fetch(
    'SELECT id, template_id, kind, object_key, metadata FROM cg_template_assets WHERE id = ?', [id]
  ));
}

async function getTemplateAsset(id) {
  return db.fetch('SELECT id, template_id, kind, object_key FROM cg_template_assets WHERE id = ?', [Number(id)]);
}

async function deleteTemplateAsset(id) {
  const asset = await getTemplateAsset(id);
  if (!asset) throw new ValidationError('Nie znaleziono zasobu.');
  await db.delete('cg_template_assets', 'id = ?', [Number(id)]);
  return asset;
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
    SELECT mt.id, mt.template_id, mt.status, mt.deadline_at, mt.owner_role, mt.note, mt.sort_order,
           t.name AS template_name, t.width, t.height, t.category
    FROM cg_match_templates mt
    JOIN cg_templates t ON t.id = mt.template_id
    WHERE mt.match_id = ?
    ORDER BY COALESCE(mt.deadline_at, '2999-01-01'), mt.sort_order, t.name
  `, [Number(matchId)]);
}

/** Ile zdjęć ma mecz — foldery są szczegółem technicznym, licznik nie jest. */
async function getMatchPhotoStats(matchId) {
  if (!matchId) return { total: 0, selected: 0, lastIndexedAt: null };
  const row = await db.fetch(`
    SELECT COUNT(p.id) AS total,
           COALESCE(SUM(p.is_selected), 0) AS selected,
           MAX(p.indexed_at) AS last_indexed_at
    FROM cg_s3_folders f
    LEFT JOIN cg_photo_index p ON p.folder_id = f.id
    WHERE f.match_id = ?
  `, [Number(matchId)]);
  return {
    total: Number(row?.total) || 0,
    selected: Number(row?.selected) || 0,
    lastIndexedAt: row?.last_indexed_at || null
  };
}

/* --------------------------------------------------------------- grafiki */

/**
 * Grafika (design) to szablon plus wartości pól. Układ, czcionki i maski
 * należą do szablonu i grafika ich nie rusza — social media wypełnia wyłącznie
 * treść: teksty, wyniki i zdjęcia (§29).
 *
 * Wartość pola zdjęcia zapisujemy jako { photo_id, crop }, a nie jako adres:
 * adresy podglądu wygasają, a plik w magazynie zostaje.
 */
function normalizeDesignValues(template, raw) {
  const fields = template.definition.fields || [];
  const source = raw && typeof raw === 'object' ? raw : {};
  const values = {};

  fields.forEach((field) => {
    const value = source[field.key];
    if (value === undefined || value === null || value === '') return;

    if (field.type === 'photo') {
      const photoId = Number(value.photo_id ?? value);
      if (!Number.isInteger(photoId) || photoId <= 0) return;
      const crop = value.crop && typeof value.crop === 'object' ? value.crop : {};
      values[field.key] = {
        photo_id: photoId,
        crop: {
          x: clampCrop(crop.x),
          y: clampCrop(crop.y),
          zoom: clampZoom(crop.zoom)
        }
      };
      return;
    }

    if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new ValidationError(`Pole „${field.label}" wymaga liczby.`, field.key);
      values[field.key] = number;
      return;
    }

    if (field.type === 'select' && Array.isArray(field.options) && field.options.length
        && !field.options.includes(String(value))) {
      throw new ValidationError(`Pole „${field.label}" ma nieznaną wartość.`, field.key);
    }

    const text = String(value);
    if (text.length > 2000) throw new ValidationError(`Pole „${field.label}" jest za długie.`, field.key);
    values[field.key] = text;
  });

  return values;
}

/**
 * Pola wymagane sprawdzamy dopiero przy eksporcie. Grafika zaczyna życie pusta
 * i wypełnia się stopniowo — blokowanie zapisu zmusiłoby do wpisania wszystkiego
 * za jednym razem albo do utraty tego, co już wpisano.
 */
function missingRequiredFields(template, values) {
  return (template.definition.fields || [])
    .filter((field) => field.required && (values[field.key] === undefined || values[field.key] === ''))
    .map((field) => field.label);
}

function clampCrop(value) {
  const number = Number(value) || 0;
  return Math.min(Math.max(number, -1), 1);
}

/**
 * Powiększenie zdjęcia w kadrze. Zakres musi być ten sam co w rendererze
 * (public/club/renderer.js), inaczej serwer przyciąłby kadr ustawiony myszą.
 * Wartości poniżej 1 są w porządku — zdjęcie wolno zmniejszyć wewnątrz maski.
 */
function clampZoom(value) {
  const number = Number(value);
  return Math.min(Math.max(Number.isFinite(number) ? number : 1, 0.1), 4);
}

/**
 * Podmienia identyfikatory zdjęć na adresy, spod których płótno je pobierze.
 * Adres wskazuje na naszą aplikację, a nie na magazyn: obraz z innej domeny
 * „zatruwa" płótno i uniemożliwia eksport do pliku.
 */
async function resolveDesignValues(values) {
  const ids = Object.values(values)
    .filter((value) => value && typeof value === 'object' && value.photo_id)
    .map((value) => value.photo_id);
  if (!ids.length) return values;

  const rows = await db.getPool().query(
    'SELECT id, file_name FROM cg_photo_index WHERE id IN (?)', [[...new Set(ids)]]
  ).then(([result]) => result);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const resolved = { ...values };
  Object.entries(resolved).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || !value.photo_id) return;
    const photo = byId.get(value.photo_id);
    resolved[key] = photo
      ? { ...value, url: `/api/photos/${value.photo_id}/file`, file_name: photo.file_name }
      // Zdjęcie zniknęło z indeksu — zostawiamy pole puste zamiast psuć całą grafikę.
      : { ...value, url: null, file_name: null };
  });
  return resolved;
}

function decorateDesign(row) {
  if (!row) return null;
  return { ...row, values: parseJson(row.values_json, {}), state: parseJson(row.state_json, null) };
}

async function listDesigns({ matchId = null, limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const conditions = [];
  const params = [];
  if (matchId !== null && matchId !== undefined && matchId !== '') {
    conditions.push('d.match_id = ?');
    params.push(Number(matchId));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.query(`
    SELECT d.id, d.template_id, d.match_id, d.title, d.updated_at,
           t.name AS template_name, t.category, t.width, t.height,
           m.home_team, m.away_team, m.match_date,
           (SELECT COUNT(*) FROM cg_exports e WHERE e.design_id = d.id) AS export_count
    FROM cg_designs d
    JOIN cg_templates t ON t.id = d.template_id
    LEFT JOIN cg_matches m ON m.id = d.match_id
    ${where}
    ORDER BY d.updated_at DESC
    LIMIT ${safeLimit}
  `, params);
}

async function getDesign(id) {
  const design = decorateDesign(await db.fetch(`
    SELECT d.id, d.template_id, d.match_id, d.title, d.values_json, d.state_json,
           d.created_at, d.updated_at,
           m.home_team, m.away_team, m.match_date
    FROM cg_designs d
    LEFT JOIN cg_matches m ON m.id = d.match_id
    WHERE d.id = ?
  `, [Number(id)]));
  if (!design) return null;

  design.template = await getTemplate(design.template_id, { withAssets: true });
  design.values = await resolveDesignValues(design.values);
  return design;
}

async function createDesign(payload, userId = null) {
  const template = await getTemplate(payload.template_id);
  if (!template) throw new ValidationError('Nie znaleziono szablonu.', 'template_id');
  if (!template.is_active) throw new ValidationError('Ten szablon jest wyłączony.', 'template_id');

  const matchId = payload.match_id ? Number(payload.match_id) : null;
  if (matchId && !(await getMatch(matchId))) throw new ValidationError('Nie znaleziono meczu.', 'match_id');

  const title = String(payload.title || template.name).trim().slice(0, 180);
  if (!title) throw new ValidationError('Podaj nazwę grafiki.', 'title');

  const id = await db.insert('cg_designs', {
    template_id: template.id,
    match_id: matchId,
    title,
    values_json: JSON.stringify(normalizeDesignValues(template, payload.values)),
    created_by: userId
  });
  return getDesign(id);
}

async function updateDesign(id, payload) {
  const current = await db.fetch('SELECT id, template_id, title FROM cg_designs WHERE id = ?', [Number(id)]);
  if (!current) throw new ValidationError('Nie znaleziono grafiki.', 'id');

  const data = {};
  if (payload.title !== undefined) {
    const title = String(payload.title).trim().slice(0, 180);
    if (!title) throw new ValidationError('Podaj nazwę grafiki.', 'title');
    data.title = title;
  }
  if (payload.values !== undefined) {
    const template = await getTemplate(current.template_id);
    data.values_json = JSON.stringify(normalizeDesignValues(template, payload.values));
  }

  if (Object.keys(data).length) await db.update('cg_designs', data, 'id = ?', [Number(id)]);
  return getDesign(id);
}

async function deleteDesign(id) {
  const design = await db.fetch('SELECT id FROM cg_designs WHERE id = ?', [Number(id)]);
  if (!design) throw new ValidationError('Nie znaleziono grafiki.', 'id');
  await db.delete('cg_designs', 'id = ?', [Number(id)]);
}

async function recordExport({ designId, objectKey, format, width, height, fileSize, userId = null }) {
  const id = await db.insert('cg_exports', {
    design_id: Number(designId),
    object_key: objectKey,
    format,
    width: Number(width),
    height: Number(height),
    file_size: fileSize ?? null,
    created_by: userId
  });
  return db.fetch('SELECT id, design_id, object_key, format, width, height, created_at FROM cg_exports WHERE id = ?', [id]);
}

/* --------------------------------------------------- zbiory zdjęć (S3) */

/**
 * Zdjęcia należą do meczu — nie ma podziału na fotografa, wybrane czy archiwum.
 * Jeden mecz to jeden katalog w magazynie; osobny zbiór „poza meczem" zbiera
 * zdjęcia do grafik spoza kalendarza (urodziny, transfery).
 *
 * Katalog w buckecie tworzy się sam przy pierwszym zdjęciu, a jego ścieżka
 * powstaje z danych, które i tak są w bazie: sezon → kolejka → data i drużyny.
 * Dzięki temu magazyn czyta się tak samo jak kalendarz rozgrywek.
 */

const OFF_MATCH_KEY = 'inne';

/** Nazwa → bezpieczny segment ścieżki: bez polskich znaków, spacji i ukośników. */
function slug(value, fallback = '') {
  const text = String(value || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return text || fallback;
}

async function buildPrefix(match) {
  if (!match) {
    const season = await getActiveSeason();
    return `${slug(season?.name, 'sezon')}/poza-meczem/`;
  }
  const segments = [slug(match.season_name, 'sezon')];
  if (match.round_name) segments.push(slug(match.round_name));
  // Data z przodu układa mecze chronologicznie także w kliencie S3 na pulpicie.
  segments.push([
    String(match.match_date || '').slice(0, 10),
    slug(match.home_team, 'gospodarz'),
    slug(match.away_team, 'gosc')
  ].filter(Boolean).join('-'));
  return `${segments.join('/')}/`;
}

/**
 * Zbiory zdjęć do wyboru: mecze sezonu plus zbiór spoza kalendarza.
 * Zwracamy też mecze, które nie mają jeszcze katalogu — dopiero wysyłka
 * pierwszego zdjęcia go zakłada, więc lista nie zależy od stanu magazynu.
 */
async function listPhotoSets({ seasonId = null } = {}) {
  const season = seasonId ? await getSeason(seasonId) : await getActiveSeason();

  const matches = season ? await db.query(`
    SELECT m.id, m.home_team, m.away_team, m.match_date, m.round_name, m.status,
           f.id AS folder_id,
           COUNT(p.id) AS photo_count
    FROM cg_matches m
    LEFT JOIN cg_s3_folders f ON f.match_id = m.id
    LEFT JOIN cg_photo_index p ON p.folder_id = f.id
    WHERE m.season_id = ?
    GROUP BY m.id, f.id
    ORDER BY m.match_date DESC
  `, [season.id]) : [];

  const offMatch = await db.fetch(`
    SELECT f.id AS folder_id, COUNT(p.id) AS photo_count
    FROM cg_s3_folders f
    LEFT JOIN cg_photo_index p ON p.folder_id = f.id
    WHERE f.match_id IS NULL
    GROUP BY f.id
    LIMIT 1
  `);

  return [
    ...matches.map((match) => ({
      key: String(match.id),
      match_id: match.id,
      label: `${match.home_team} – ${match.away_team}`,
      match_date: match.match_date,
      round_name: match.round_name,
      status: match.status,
      folder_id: match.folder_id,
      photo_count: Number(match.photo_count) || 0
    })),
    {
      key: OFF_MATCH_KEY,
      match_id: null,
      label: 'Poza meczem',
      match_date: null,
      round_name: null,
      status: null,
      folder_id: offMatch?.folder_id || null,
      photo_count: Number(offMatch?.photo_count) || 0
    }
  ];
}

async function findFolder({ matchId = null }) {
  return matchId
    ? db.fetch('SELECT * FROM cg_s3_folders WHERE match_id = ? ORDER BY id LIMIT 1', [Number(matchId)])
    : db.fetch('SELECT * FROM cg_s3_folders WHERE match_id IS NULL ORDER BY id LIMIT 1');
}

/**
 * Zbiór zdjęć dla klucza z interfejsu: numer meczu albo „inne".
 * Katalog zakładamy dopiero wtedy, gdy jest potrzebny.
 */
async function resolvePhotoSet(key, { create = false } = {}) {
  const isOffMatch = String(key) === OFF_MATCH_KEY;
  const matchId = isOffMatch ? null : Number(key);
  if (!isOffMatch && !Number.isInteger(matchId)) {
    throw new ValidationError('Nieprawidłowy zbiór zdjęć.', 'key');
  }

  const match = matchId ? await db.fetch(`
    SELECT m.id, m.home_team, m.away_team, m.match_date, m.round_name, s.name AS season_name
    FROM cg_matches m JOIN cg_seasons s ON s.id = m.season_id WHERE m.id = ? LIMIT 1
  `, [matchId]) : null;
  if (matchId && !match) throw new ValidationError('Nie znaleziono meczu.', 'key');

  const existing = await findFolder({ matchId });
  if (existing) return { folder: existing, match, key: String(key) };
  if (!create) return { folder: null, match, key: String(key) };

  const bucket = storage.getBucket();
  if (!bucket) throw new ValidationError('Brak nazwy bucketa — uzupełnij S3_BUCKET w .env.', 'bucket');

  const id = await db.insert('cg_s3_folders', {
    match_id: matchId,
    name: match ? `${match.home_team} – ${match.away_team}` : 'Poza meczem',
    bucket,
    prefix_path: await buildPrefix(match),
    role: 'custom',
    is_upload_enabled: 1
  });
  return { folder: await db.fetch('SELECT * FROM cg_s3_folders WHERE id = ?', [id]), match, key: String(key) };
}

/* ------------------------------------------------------- indeks zdjęć */

async function listPhotos(folderId, { selectedOnly = false, limit = 500 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  const conditions = ['p.folder_id = ?'];
  const params = [Number(folderId)];
  if (selectedOnly) conditions.push('p.is_selected = 1');

  return db.query(`
    SELECT p.id, p.folder_id, p.object_key, p.file_name, p.etag, p.width, p.height,
           p.file_size, p.taken_at, p.thumb_key, p.is_selected, p.metadata, p.indexed_at
    FROM cg_photo_index p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.file_name
    LIMIT ${safeLimit}
  `, params).then((rows) => rows.map((row) => ({ ...row, metadata: parseJson(row.metadata, null) })));
}

async function getPhoto(id) {
  const row = await db.fetch(`
    SELECT p.id, p.folder_id, p.object_key, p.file_name, p.etag, p.width, p.height,
           p.file_size, p.taken_at, p.thumb_key, p.is_selected, p.metadata, p.indexed_at,
           f.bucket, f.prefix_path, f.match_id
    FROM cg_photo_index p
    JOIN cg_s3_folders f ON f.id = p.folder_id
    WHERE p.id = ? LIMIT 1
  `, [Number(id)]);
  return row ? { ...row, metadata: parseJson(row.metadata, null) } : null;
}

/**
 * Zapisuje listę obiektów z bucketa w indeksie. Istniejące wpisy aktualizuje
 * (rozmiar, etag), nowe dodaje — flaga is_selected zawsze zostaje nietknięta.
 */
async function upsertPhotos(folderId, objects = []) {
  const id = Number(folderId);
  if (!objects.length) return { indexed: 0 };

  const CHUNK = 100;
  let indexed = 0;

  for (let i = 0; i < objects.length; i += CHUNK) {
    const chunk = objects.slice(i, i + CHUNK);
    const values = [];
    const params = [];

    chunk.forEach((object) => {
      values.push('(?, ?, ?, ?, ?, ?, ?)');
      params.push(
        id,
        String(object.key).slice(0, 700),
        String(object.fileName || object.key).split('/').pop().slice(0, 255),
        object.etag || null,
        object.size ?? null,
        toMysqlDateTime(object.lastModified) || null,
        JSON.stringify(object.metadata || {})
      );
    });

    const [result] = await db.getPool().query(`
      INSERT INTO cg_photo_index (folder_id, object_key, file_name, etag, file_size, taken_at, metadata)
      VALUES ${values.join(', ')}
      ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        etag = VALUES(etag),
        file_size = VALUES(file_size),
        taken_at = COALESCE(cg_photo_index.taken_at, VALUES(taken_at))
    `, params);
    indexed += result.affectedRows ? chunk.length : 0;
  }

  return { indexed };
}

/** Usuwa z indeksu zdjęcia, których nie ma już w buckecie. */
async function pruneMissingPhotos(folderId, existingKeys = []) {
  const id = Number(folderId);
  if (!existingKeys.length) {
    const [result] = await db.getPool().query('DELETE FROM cg_photo_index WHERE folder_id = ?', [id]);
    return result.affectedRows;
  }
  const [result] = await db.getPool().query(
    'DELETE FROM cg_photo_index WHERE folder_id = ? AND object_key NOT IN (?)',
    [id, existingKeys]
  );
  return result.affectedRows;
}

async function setPhotoSelected(id, isSelected) {
  const photo = await getPhoto(id);
  if (!photo) throw new ValidationError('Nie znaleziono zdjęcia.', 'id');
  await db.update('cg_photo_index', { is_selected: isSelected ? 1 : 0 }, 'id = ?', [Number(id)]);
  return getPhoto(id);
}

async function deletePhoto(id) {
  const photo = await getPhoto(id);
  if (!photo) throw new ValidationError('Nie znaleziono zdjęcia.', 'id');
  await db.delete('cg_photo_index', 'id = ?', [Number(id)]);
  return photo;
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
function buildAlerts({ season, nextMatch, materials, photos }) {
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

  if (photos.total === 0) {
    alerts.push({
      level: 'soon',
      title: 'Mecz bez zdjęć',
      detail: 'Fotograf nie wgrał jeszcze żadnego kadru z tego spotkania.'
    });
  }

  return alerts;
}

async function getDashboard() {
  const seasons = await listSeasons();
  const season = seasons.find((item) => item.is_active) || seasons[0] || null;
  const nextMatch = season ? await getNextMatch(season.id) : null;

  const [materials, photos, exports, offMatch] = await Promise.all([
    getMatchMaterials(nextMatch?.id),
    getMatchPhotoStats(nextMatch?.id),
    getRecentExports(),
    getOffMatchMaterials()
  ]);

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
    alerts: buildAlerts({ season, nextMatch, materials, photos }),
    matchCount: Number(matchCount.total),
    nextMatch,
    materials,
    photos,
    exports,
    offMatch,
    counters: {
      photoCount: photos.total,
      weekExports: Number(weekExports.total),
      materialsReady: readyCount,
      materialsTotal: materials.length
    }
  };
}

module.exports = {
  ValidationError,
  missingRequiredFields,
  listDesigns,
  getDesign,
  createDesign,
  updateDesign,
  deleteDesign,
  recordExport,
  OFF_MATCH_KEY,
  listPhotoSets,
  resolvePhotoSet,
  listPhotos,
  getPhoto,
  upsertPhotos,
  pruneMissingPhotos,
  setPhotoSelected,
  deletePhoto,
  MATCH_STATUSES,
  MATERIAL_STATUSES,
  FIELD_TYPES,
  TEMPLATE_CATEGORIES,
  OWNER_ROLES,
  listExports,
  LAYER_TYPES,
  FONT_FAMILIES,
  ASSET_KINDS,
  listTemplateAssets,
  listFonts,
  addTemplateAsset,
  getTemplateAsset,
  deleteTemplateAsset,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  templateUsage,
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
