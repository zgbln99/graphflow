/* ZASTAL MARKETING CENTER — logika interfejsu.
   Markup generowany tu korzysta z komponentów Tabler (karty, listy, formularze),
   żeby widoki budowane w JS wyglądały tak samo jak te renderowane po stronie serwera.
   Dane są nadal demonstracyjne — do podmiany na API. */

/* ---------------- Model demonstracyjny ---------------- */
const state = {
  templates: [
    {
      id: 'final', name: 'Final Score', category: 'Mecz', size: '1080×1350',
      fields: [
        { key: 'home_score', label: 'Wynik Zastal', type: 'number', value: 92 },
        { key: 'away_score', label: 'Wynik Anwil', type: 'number', value: 81 },
        { key: 'status', label: 'Status', type: 'select', value: 'FINAL', options: ['Q1', 'HALFTIME', 'Q3', 'FINAL', 'OT'] },
        { key: 'photo', label: 'Zdjęcie', type: 'photo', value: 'IMG_4231' }
      ],
      layers: [
        { id: 'overlay', name: 'Overlay PNG', type: 'overlay', locked: true, visible: true, z: 5 },
        { id: 'away', name: 'Wynik gości', type: 'text', field: 'away_score', locked: false, visible: true, z: 4 },
        { id: 'home', name: 'Wynik gospodarzy', type: 'text', field: 'home_score', locked: false, visible: true, z: 3 },
        { id: 'photo', name: 'Zdjęcie', type: 'photo', field: 'photo', locked: false, visible: true, z: 2, fit: 'cover', mask: true },
        { id: 'bg', name: 'Tło', type: 'background', locked: true, visible: true, z: 1 }
      ]
    },
    {
      id: 'matchday', name: 'Matchday', category: 'Mecz', size: '1080×1350',
      fields: [
        { key: 'photo', label: 'Zdjęcie', type: 'photo', value: 'IMG_4232' },
        { key: 'date', label: 'Data', type: 'text', value: '27.09.2026' }
      ],
      layers: [
        { id: 'overlay', name: 'Overlay PNG', type: 'overlay', locked: true, visible: true, z: 3 },
        { id: 'photo', name: 'Zdjęcie', type: 'photo', field: 'photo', locked: false, visible: true, z: 2 },
        { id: 'bg', name: 'Tło', type: 'background', locked: true, visible: true, z: 1 }
      ]
    },
    {
      id: 'birthday', name: 'Urodziny', category: 'Inne', size: '1080×1350',
      fields: [
        { key: 'player_name', label: 'Zawodnik', type: 'text', value: 'Jan Kowalski' },
        { key: 'photo', label: 'Zdjęcie', type: 'photo', value: 'IMG_4250' }
      ],
      layers: [
        { id: 'name', name: 'Imię i nazwisko', type: 'text', field: 'player_name', locked: false, visible: true, z: 4 },
        { id: 'overlay', name: 'Overlay PNG', type: 'overlay', locked: true, visible: true, z: 3 },
        { id: 'photo', name: 'Zdjęcie', type: 'photo', field: 'photo', locked: false, visible: true, z: 2 }
      ]
    }
  ],
  currentTemplate: 'final',
  selectedLayer: 'photo'
};

const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
}[char]));

const icon = (name, extra = '') => `<svg class="icon ${extra}"><use href="#i-${name}"></use></svg>`;

/* ---------------- Przełączanie widoków ---------------- */
const views = [...document.querySelectorAll('.view')];
const pageTitle = document.getElementById('page-title');
const eyebrow = document.getElementById('eyebrow');
const seasonLabel = eyebrow ? eyebrow.textContent.trim() : '';

const viewLabels = {
  dashboard: 'Dashboard',
  matches: 'Mecze',
  match: 'Mecz',
  editor: 'Edytor grafiki',
  other: 'Inne grafiki',
  social: 'Monitoring social',
  templates: 'Szablony',
  library: 'Biblioteka zdjęć',
  history: 'Historia eksportów',
  settings: 'Ustawienia'
};
const viewContext = {
  editor: 'Edytor grafiki'
};

function showView(name) {
  views.forEach((view) => view.classList.remove('active-view'));
  document.getElementById('view-' + name)?.classList.add('active-view');
  document.querySelectorAll('.navbar-nav .nav-item').forEach((item) => {
    item.classList.toggle('active', Boolean(item.querySelector(`[data-view="${name}"]`)));
  });
  if (pageTitle) pageTitle.textContent = viewLabels[name] || name;
  if (eyebrow) eyebrow.textContent = viewContext[name] || seasonLabel;
  document.querySelector('.page-body')?.scrollTo({ top: 0 });
  if (name === 'social') loadSocialView();
  if (name === 'matches' && !matchesLoaded) loadMatches();
  if (name === 'templates' && !templates.length) loadTemplates().catch(() => {});
  if (name === 'other') loadOtherTemplates().catch(() => {});
  if (name === 'history') loadHistory().catch(() => {});
  if (name === 'library' && !foldersLoaded) loadFolders();
}

document.querySelectorAll('[data-view]').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    showView(el.dataset.view);
  });
});

/* ================= Sezony i mecze (prawdziwe dane z API) ================= */

const isAdmin = document.body.dataset.role === 'admin';

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error || 'Operacja nie powiodła się.');
    error.field = payload.field;
    throw error;
  }
  return payload;
}

const MATCH_STATUS = {
  planned: { label: 'Zaplanowany', badge: 'bg-secondary-lt' },
  live: { label: 'Na żywo', badge: 'bg-red-lt' },
  finished: { label: 'Rozegrany', badge: 'bg-green-lt' },
  cancelled: { label: 'Odwołany', badge: 'bg-secondary-lt' }
};
const CLUB_NAME = (document.body.dataset.club || 'Zastal').toLowerCase();

function formatDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? { date: `${m[3]}.${m[2]}.${m[1]}`, time: `${m[4]}:${m[5]}`, input: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` } : null;
}

function teamMarkup(name) {
  const club = String(name || '').toLowerCase().includes(CLUB_NAME);
  return `<span class="${club ? 'text-green' : ''}">${escapeHTML(name)}</span>`;
}

/* ---- lista meczów ---- */
const matchesBody = document.getElementById('matches-body');
const matchesEmpty = document.getElementById('matches-empty');
const matchSearch = document.getElementById('match-search');
const matchStatusFilter = document.getElementById('match-status-filter');
let matchesLoaded = false;

async function loadMatches() {
  if (!matchesBody) return;
  const params = new URLSearchParams();
  if (matchSearch?.value.trim()) params.set('q', matchSearch.value.trim());
  if (matchStatusFilter?.value) params.set('status', matchStatusFilter.value);
  const season = document.getElementById('season-switch')?.value;
  if (season) params.set('season', season);

  try {
    const { matches } = await api('/api/matches?' + params.toString());
    renderMatches(matches);
    matchesLoaded = true;
  } catch (error) {
    matchesBody.innerHTML = '';
    showMatchesMessage(error.message);
  }
}

function showMatchesMessage(message) {
  if (!matchesEmpty) return;
  matchesEmpty.textContent = message;
  matchesEmpty.classList.toggle('d-none', !message);
}

function renderMatches(matches) {
  if (!matches.length) {
    matchesBody.innerHTML = '';
    showMatchesMessage(matchSearch?.value || matchStatusFilter?.value
      ? 'Żaden mecz nie pasuje do filtrów.'
      : 'Brak meczów w tym sezonie.');
    return;
  }
  showMatchesMessage('');
  matchesBody.innerHTML = matches.map((match) => {
    const when = formatDate(match.match_date);
    const status = MATCH_STATUS[match.status] || MATCH_STATUS.planned;
    const score = (match.home_score === null || match.away_score === null)
      ? '<span class="text-secondary">— : —</span>'
      : `<span class="fw-bold">${match.home_score} : ${match.away_score}</span>`;
    const context = [match.venue, match.round_name].filter(Boolean).join(' · ');
    return `<tr data-match-id="${match.id}">
      <td>
        <div>${teamMarkup(match.home_team)} <span class="text-secondary">—</span> ${teamMarkup(match.away_team)}</div>
        ${context ? `<div class="text-secondary small">${escapeHTML(context)}</div>` : ''}
      </td>
      <td class="text-nowrap">${when ? when.date : '—'}<div class="text-secondary small">${when ? when.time : ''}</div></td>
      <td>${score}</td>
      <td><span class="badge ${status.badge}">${status.label}</span></td>
      <td class="text-secondary text-nowrap">${match.materials_ready} / ${match.materials_total}</td>
      ${isAdmin ? `<td>
        <div class="btn-list flex-nowrap">
          <button class="btn btn-icon btn-sm" type="button" data-match-edit="${match.id}" data-bs-toggle="modal" data-bs-target="#match-modal" aria-label="Edytuj mecz">
            ${icon('edit')}
          </button>
          <button class="btn btn-icon btn-sm" type="button" data-match-delete="${match.id}" aria-label="Usuń mecz">
            ${icon('trash')}
          </button>
        </div>
      </td>` : ''}
    </tr>`;
  }).join('');
}

let searchTimer;
matchSearch?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadMatches, 250);
});
matchStatusFilter?.addEventListener('change', loadMatches);

/* ---- formularz meczu ---- */
// Tabler dołącza Bootstrapa, ale nie wystawia go jako window.bootstrap — modale
// otwieramy atrybutami data-bs-*, a zamykamy klikając ukryty przycisk zamknięcia.
function hideModal(modalEl) {
  modalEl?.querySelector('[data-bs-dismiss="modal"]')?.click();
}

const matchModalEl = document.getElementById('match-modal');
const matchForm = document.getElementById('match-form');
const matchFormError = document.getElementById('match-form-error');

function setFormError(box, message) {
  if (!box) return;
  box.textContent = message || '';
  box.classList.toggle('d-none', !message);
}

function fillMatchForm(match) {
  if (!matchForm) return;
  matchForm.reset();
  setFormError(matchFormError, '');
  matchForm.elements.id.value = match?.id || '';
  document.getElementById('match-modal-title').textContent = match ? 'Edytuj mecz' : 'Nowy mecz';

  if (match) {
    matchForm.elements.home_team.value = match.home_team || '';
    matchForm.elements.away_team.value = match.away_team || '';
    matchForm.elements.match_date.value = formatDate(match.match_date)?.input || '';
    matchForm.elements.season_id.value = match.season_id;
    matchForm.elements.competition.value = match.competition || '';
    matchForm.elements.round_name.value = match.round_name || '';
    matchForm.elements.venue.value = match.venue || '';
    matchForm.elements.status.value = match.status;
    matchForm.elements.home_score.value = match.home_score ?? '';
    matchForm.elements.away_score.value = match.away_score ?? '';
  }
}

// Formularz wypełniamy w momencie otwierania modalu — wiemy wtedy, który
// przycisk go otworzył (nowy mecz czy edycja konkretnego wiersza).
matchModalEl?.addEventListener('show.bs.modal', async (event) => {
  const trigger = event.relatedTarget;
  const editId = trigger?.dataset?.matchEdit;
  fillMatchForm(null);
  document.getElementById('match-modal-title').textContent = editId ? 'Edytuj mecz' : 'Nowy mecz';
  if (!editId) return;
  try {
    const { match } = await api('/api/matches/' + editId);
    fillMatchForm(match);
  } catch (error) {
    setFormError(matchFormError, error.message);
  }
});

// Kliknięcie wiersza (poza przyciskami) otwiera centrum meczu.
matchesBody?.addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  const row = event.target.closest('[data-match-id]');
  if (row) openMatch(row.dataset.matchId);
});

document.addEventListener('click', async (event) => {
  const deleteBtn = event.target.closest('[data-match-delete]');
  if (deleteBtn) {
    const row = deleteBtn.closest('tr');
    const label = row?.querySelector('td')?.textContent.trim() || 'ten mecz';
    if (!confirm(`Usunąć ${label}? Operacji nie można cofnąć.`)) return;
    try {
      await api('/api/matches/' + deleteBtn.dataset.matchDelete, { method: 'DELETE' });
      loadMatches();
    } catch (error) { showMatchesMessage(error.message); }
  }
});

matchForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.getElementById('match-submit');
  const data = Object.fromEntries(new FormData(matchForm).entries());
  const id = data.id;
  delete data.id;

  submit.disabled = true;
  setFormError(matchFormError, '');
  try {
    await api(id ? '/api/matches/' + id : '/api/matches', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    });
    hideModal(matchModalEl);
    if (document.getElementById('view-dashboard')?.classList.contains('active-view')) {
      window.location.reload();
    } else {
      loadMatches();
    }
  } catch (error) {
    setFormError(matchFormError, error.message);
    if (error.field && matchForm.elements[error.field]) matchForm.elements[error.field].focus();
  } finally {
    submit.disabled = false;
  }
});

/* ---- sezony ---- */
const seasonsBody = document.getElementById('seasons-body');
const seasonModalEl = document.getElementById('season-modal');
const seasonForm = document.getElementById('season-form');
const seasonFormError = document.getElementById('season-form-error');

async function loadSeasons() {
  if (!seasonsBody) return;
  const { seasons } = await api('/api/seasons');
  seasonsBody.innerHTML = seasons.map((season) => `
    <tr>
      <td>${escapeHTML(season.name)}</td>
      <td class="text-secondary text-nowrap">
        ${season.starts_on ? escapeHTML(season.starts_on) : '—'} – ${season.ends_on ? escapeHTML(season.ends_on) : '—'}
      </td>
      <td class="text-secondary">${season.match_count}</td>
      <td>${season.is_active
        ? '<span class="badge bg-green-lt">Aktywny</span>'
        : '<button class="btn btn-sm" type="button" data-season-activate="' + season.id + '">Ustaw jako aktywny</button>'}</td>
      <td>
        <div class="btn-list flex-nowrap">
          <button class="btn btn-icon btn-sm" type="button" data-season-edit='${escapeHTML(JSON.stringify(season))}' data-bs-toggle="modal" data-bs-target="#season-modal" aria-label="Edytuj sezon">${icon('edit')}</button>
          <button class="btn btn-icon btn-sm" type="button" data-season-delete="${season.id}" aria-label="Usuń sezon">${icon('trash')}</button>
        </div>
      </td>
    </tr>`).join('');
}

seasonModalEl?.addEventListener('show.bs.modal', (event) => {
  const raw = event.relatedTarget?.dataset?.seasonEdit;
  seasonForm?.reset();
  setFormError(seasonFormError, '');
  if (!seasonForm) return;
  if (!raw) {
    seasonForm.elements.id.value = '';
    document.getElementById('season-modal-title').textContent = 'Nowy sezon';
    return;
  }
  const season = JSON.parse(raw);
  seasonForm.elements.id.value = season.id;
  seasonForm.elements.name.value = season.name;
  seasonForm.elements.starts_on.value = season.starts_on || '';
  seasonForm.elements.ends_on.value = season.ends_on || '';
  document.getElementById('season-modal-title').textContent = 'Edytuj sezon';
});

document.addEventListener('click', async (event) => {
  const activate = event.target.closest('[data-season-activate]');
  if (activate) {
    await api('/api/seasons/' + activate.dataset.seasonActivate + '/activate', { method: 'POST' });
    window.location.reload();
    return;
  }
  const remove = event.target.closest('[data-season-delete]');
  if (remove) {
    if (!confirm('Usunąć ten sezon?')) return;
    try {
      await api('/api/seasons/' + remove.dataset.seasonDelete, { method: 'DELETE' });
      loadSeasons();
    } catch (error) { alert(error.message); }
  }
});

seasonForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(seasonForm).entries());
  const id = data.id;
  delete data.id;
  setFormError(seasonFormError, '');
  try {
    await api(id ? '/api/seasons/' + id : '/api/seasons', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    });
    hideModal(seasonModalEl);
    window.location.reload();
  } catch (error) {
    setFormError(seasonFormError, error.message);
  }
});

document.getElementById('season-switch')?.addEventListener('change', async (event) => {
  try {
    await api('/api/seasons/' + event.target.value + '/activate', { method: 'POST' });
    window.location.reload();
  } catch (error) { alert(error.message); }
});

if (seasonsBody) loadSeasons().catch(() => {});

/* ================= Szablony: pola, warstwy, pliki, podgląd ================= */

const FIELD_TYPE_LABELS = {
  text: 'Tekst', textarea: 'Tekst wielolinijkowy', number: 'Liczba',
  select: 'Lista wyboru', date: 'Data', photo: 'Zdjęcie'
};
const LAYER_TYPE_LABELS = {
  background: 'Tło', photo: 'Zdjęcie', text: 'Tekst',
  overlay: 'Overlay', logo: 'Logo', shape: 'Kształt'
};

const canEditTemplates = ['admin', 'designer'].includes(document.body.dataset.role);
const templateList = document.getElementById('template-list');
const templateForm = document.getElementById('template-form');
const templateFields = document.getElementById('template-fields');
const templateFormError = document.getElementById('template-form-error');
const layerList = document.getElementById('layer-list');
const layerProps = document.getElementById('layer-props');
const assetList = document.getElementById('asset-list');
const previewCanvas = document.getElementById('template-preview');

let templates = [];
let currentTemplate = null;       // pełny szablon z zasobami
let workingLayers = [];           // warstwy w trakcie edycji
let selectedLayerId = null;

/* ---- pola dynamiczne ---- */

function fieldRow(field = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'card card-sm mb-2';
  wrap.dataset.field = '1';
  wrap.innerHTML = `
    <div class="card-body p-2">
      <div class="row g-2 align-items-end">
        <div class="col-md-3">
          <label class="form-label small mb-1">Klucz</label>
          <input class="form-control form-control-sm" data-f="key" value="${escapeHTML(field.key || '')}"
                 placeholder="home_score" maxlength="40">
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Etykieta</label>
          <input class="form-control form-control-sm" data-f="label" value="${escapeHTML(field.label || '')}"
                 placeholder="Wynik gospodarzy" maxlength="80">
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1">Typ</label>
          <select class="form-select form-select-sm" data-f="type">
            ${Object.entries(FIELD_TYPE_LABELS).map(([value, label]) =>
              `<option value="${value}" ${field.type === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1">Domyślnie</label>
          <input class="form-control form-control-sm" data-f="default" value="${escapeHTML(field.default || '')}">
        </div>
        <div class="col-md-1">
          <label class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" data-f="required" ${field.required ? 'checked' : ''}>
            <span class="form-check-label small">Wym.</span>
          </label>
        </div>
        <div class="col-md-1 text-end">
          <div class="btn-list flex-nowrap justify-content-end">
            <button class="btn btn-icon btn-sm" type="button" data-field-up aria-label="Przesuń w górę">${icon('up')}</button>
            <button class="btn btn-icon btn-sm" type="button" data-field-down aria-label="Przesuń w dół">${icon('down')}</button>
            <button class="btn btn-icon btn-sm" type="button" data-field-remove aria-label="Usuń pole">${icon('trash')}</button>
          </div>
        </div>
        <div class="col-12 ${field.type === 'select' ? '' : 'd-none'}" data-options-wrap>
          <label class="form-label small mb-1">Opcje listy (jedna w wierszu)</label>
          <textarea class="form-control form-control-sm" rows="3" data-f="options">${escapeHTML((field.options || []).join('\n'))}</textarea>
        </div>
      </div>
    </div>`;

  wrap.querySelector('[data-f=type]').addEventListener('change', (event) => {
    wrap.querySelector('[data-options-wrap]').classList.toggle('d-none', event.target.value !== 'select');
    refreshPreview();
  });
  wrap.querySelector('[data-field-remove]').addEventListener('click', () => { wrap.remove(); refreshPreview(); });
  wrap.querySelector('[data-field-up]').addEventListener('click', () => {
    const previous = wrap.previousElementSibling;
    if (previous) wrap.parentNode.insertBefore(wrap, previous);
  });
  wrap.querySelector('[data-field-down]').addEventListener('click', () => {
    const next = wrap.nextElementSibling;
    if (next) wrap.parentNode.insertBefore(next, wrap);
  });
  wrap.addEventListener('input', refreshPreview);
  return wrap;
}

function collectFields() {
  return [...templateFields.querySelectorAll('[data-field]')].map((row) => {
    const get = (name) => row.querySelector(`[data-f=${name}]`);
    return {
      key: get('key').value,
      label: get('label').value,
      type: get('type').value,
      default: get('default').value,
      required: get('required').checked,
      options: get('options').value.split('\n').map((line) => line.trim()).filter(Boolean)
    };
  });
}

/* ---- warstwy ---- */

function renderLayerList() {
  if (!layerList) return;
  const ordered = [...workingLayers].sort((a, b) => b.z - a.z); // na górze listy to, co na wierzchu
  layerList.innerHTML = ordered.length ? ordered.map((layer) => `
    <div class="list-group-item d-flex align-items-center gap-2 ${layer.id === selectedLayerId ? 'active' : ''}"
         data-layer="${layer.id}" style="cursor:pointer">
      <button class="btn btn-icon btn-sm" type="button" data-layer-visible="${layer.id}"
              aria-label="Widoczność">${icon(layer.visible ? 'eye' : 'lock')}</button>
      <div class="flex-fill text-truncate">
        <div class="text-truncate">${escapeHTML(layer.name)}</div>
        <div class="text-secondary small">${LAYER_TYPE_LABELS[layer.type]} · z=${layer.z}${layer.field ? ' · ' + escapeHTML(layer.field) : ''}</div>
      </div>
      <button class="btn btn-icon btn-sm" type="button" data-layer-up="${layer.id}" aria-label="Wyżej">${icon('up')}</button>
      <button class="btn btn-icon btn-sm" type="button" data-layer-down="${layer.id}" aria-label="Niżej">${icon('down')}</button>
      <button class="btn btn-icon btn-sm" type="button" data-layer-remove="${layer.id}" aria-label="Usuń">${icon('trash')}</button>
    </div>`).join('')
    : '<div class="list-group-item text-secondary">Brak warstw.</div>';
}

function layerInput(label, key, value, attrs = '') {
  return `<div class="col-6 col-md-4">
    <label class="form-label small mb-1">${label}</label>
    <input class="form-control form-control-sm" data-l="${key}" value="${escapeHTML(String(value ?? ''))}" ${attrs}>
  </div>`;
}

function renderLayerProps() {
  if (!layerProps) return;
  const layer = workingLayers.find((item) => item.id === selectedLayerId);
  if (!layer) {
    layerProps.innerHTML = '<div class="text-secondary small">Wybierz warstwę z listy.</div>';
    return;
  }

  const fieldOptions = collectFields()
    .filter((field) => (layer.type === 'photo' ? field.type === 'photo' : field.type !== 'photo'))
    .map((field) => `<option value="${escapeHTML(field.key)}" ${layer.field === field.key ? 'selected' : ''}>${escapeHTML(field.label)} (${escapeHTML(field.key)})</option>`)
    .join('');

  const assetOptions = (currentTemplate?.assets || [])
    .map((asset) => `<option value="${asset.id}" ${Number(layer.asset_id) === asset.id ? 'selected' : ''}>${escapeHTML(asset.kind)} · ${escapeHTML(asset.object_key.split('/').pop())}</option>`)
    .join('');

  layerProps.innerHTML = `
    <div class="row g-2">
      <div class="col-12">
        <label class="form-label small mb-1">Nazwa warstwy</label>
        <input class="form-control form-control-sm" data-l="name" value="${escapeHTML(layer.name)}" maxlength="80">
      </div>
      ${layerInput('X', 'x', layer.x, 'type="number"')}
      ${layerInput('Y', 'y', layer.y, 'type="number"')}
      ${layerInput('Kolejność (z)', 'z', layer.z, 'type="number" min="0" max="999"')}
      ${layerInput('Szerokość', 'w', layer.w, 'type="number" min="1"')}
      ${layerInput('Wysokość', 'h', layer.h, 'type="number" min="1"')}
      ${layerInput('Obrót', 'rotation', layer.rotation, 'type="number" min="-360" max="360"')}
      <div class="col-6 col-md-4">
        <label class="form-label small mb-1">Krycie</label>
        <input class="form-range" type="range" min="0" max="1" step="0.05" data-l="opacity" value="${layer.opacity}">
      </div>
      <div class="col-6 col-md-4">
        <label class="form-check form-switch mt-4">
          <input class="form-check-input" type="checkbox" data-l="locked" ${layer.locked ? 'checked' : ''}>
          <span class="form-check-label small">Zablokowana</span>
        </label>
      </div>

      ${(layer.type === 'text' || layer.type === 'photo') ? `
        <div class="col-12">
          <label class="form-label small mb-1">Pole formularza</label>
          <select class="form-select form-select-sm" data-l="field">
            <option value="">— brak —</option>${fieldOptions}
          </select>
        </div>` : ''}

      ${(layer.type === 'overlay' || layer.type === 'logo' || layer.type === 'background') ? `
        <div class="col-12">
          <label class="form-label small mb-1">Plik szablonu</label>
          <select class="form-select form-select-sm" data-l="asset_id">
            <option value="">— brak —</option>${assetOptions}
          </select>
        </div>` : ''}

      ${layer.type === 'photo' ? `
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Dopasowanie</label>
          <select class="form-select form-select-sm" data-l="fit">
            <option value="cover" ${layer.fit === 'cover' ? 'selected' : ''}>Wypełnij</option>
            <option value="contain" ${layer.fit === 'contain' ? 'selected' : ''}>Zmieść</option>
          </select>
        </div>
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Maska</label>
          <select class="form-select form-select-sm" data-l="mask">
            <option value="rect" ${layer.mask === 'rect' ? 'selected' : ''}>Prostokąt</option>
            <option value="circle" ${layer.mask === 'circle' ? 'selected' : ''}>Koło</option>
          </select>
        </div>
        ${layerInput('Zaokrąglenie', 'radius', layer.radius, 'type="number" min="0"')}` : ''}

      ${layer.type === 'text' ? `
        ${layerInput('Rozmiar', 'fontSize', layer.fontSize, 'type="number" min="6" max="800"')}
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Grubość</label>
          <select class="form-select form-select-sm" data-l="fontWeight">
            ${[400, 500, 600, 700].map((weight) => `<option value="${weight}" ${layer.fontWeight === weight ? 'selected' : ''}>${weight}</option>`).join('')}
          </select>
        </div>
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Wyrównanie</label>
          <select class="form-select form-select-sm" data-l="align">
            <option value="left" ${layer.align === 'left' ? 'selected' : ''}>Do lewej</option>
            <option value="center" ${layer.align === 'center' ? 'selected' : ''}>Do środka</option>
            <option value="right" ${layer.align === 'right' ? 'selected' : ''}>Do prawej</option>
          </select>
        </div>
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Kolor</label>
          <input class="form-control form-control-color form-control-sm" type="color" data-l="color" value="${layer.color || '#ffffff'}">
        </div>
        <div class="col-6 col-md-4">
          <label class="form-check form-switch mt-4">
            <input class="form-check-input" type="checkbox" data-l="uppercase" ${layer.uppercase ? 'checked' : ''}>
            <span class="form-check-label small">WERSALIKI</span>
          </label>
        </div>
        <div class="col-12">
          <label class="form-label small mb-1">Tekst stały (gdy nie podpięto pola)</label>
          <input class="form-control form-control-sm" data-l="text" value="${escapeHTML(layer.text || '')}" maxlength="300">
        </div>` : ''}

      ${(layer.type === 'background' || layer.type === 'shape') ? `
        <div class="col-6 col-md-4">
          <label class="form-label small mb-1">Kolor</label>
          <input class="form-control form-control-color form-control-sm" type="color" data-l="color" value="${layer.color || '#111111'}">
        </div>
        ${layerInput('Zaokrąglenie', 'radius', layer.radius, 'type="number" min="0"')}` : ''}
    </div>`;

  layerProps.querySelectorAll('[data-l]').forEach((input) => {
    const handler = () => {
      const key = input.dataset.l;
      let value = input.type === 'checkbox' ? input.checked : input.value;
      if (['x', 'y', 'z', 'w', 'h', 'rotation', 'fontSize', 'fontWeight', 'radius'].includes(key)) value = Number(value) || 0;
      if (key === 'opacity') value = Number(value);
      if (key === 'asset_id') value = value ? Number(value) : null;
      layer[key] = value;
      if (['name', 'z'].includes(key)) renderLayerList();
      refreshPreview();
    };
    input.addEventListener(input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input', handler);
  });
}

layerList?.addEventListener('click', (event) => {
  const visible = event.target.closest('[data-layer-visible]');
  const up = event.target.closest('[data-layer-up]');
  const down = event.target.closest('[data-layer-down]');
  const remove = event.target.closest('[data-layer-remove]');
  const row = event.target.closest('[data-layer]');

  const find = (id) => workingLayers.find((layer) => layer.id === id);

  if (visible) {
    const layer = find(visible.dataset.layerVisible);
    layer.visible = !layer.visible;
  } else if (up) {
    find(up.dataset.layerUp).z += 1;
  } else if (down) {
    const layer = find(down.dataset.layerDown);
    layer.z = Math.max(0, layer.z - 1);
  } else if (remove) {
    workingLayers = workingLayers.filter((layer) => layer.id !== remove.dataset.layerRemove);
    if (selectedLayerId === remove.dataset.layerRemove) selectedLayerId = null;
  } else if (row) {
    selectedLayerId = row.dataset.layer;
  } else {
    return;
  }
  renderLayerList();
  renderLayerProps();
  refreshPreview();
});

document.getElementById('layer-add')?.addEventListener('click', () => {
  const type = document.getElementById('layer-type').value;
  const width = Number(templateForm.elements.width.value) || 1080;
  const height = Number(templateForm.elements.height.value) || 1350;
  const maxZ = workingLayers.reduce((max, layer) => Math.max(max, layer.z), 0);
  const layer = {
    id: 'l' + Math.random().toString(36).slice(2, 9),
    name: LAYER_TYPE_LABELS[type],
    type, z: maxZ + 1, visible: true, locked: false, opacity: 1,
    x: 0, y: 0, w: width, h: height, rotation: 0, field: null, asset_id: null
  };
  if (type === 'photo') Object.assign(layer, { fit: 'cover', mask: 'rect', radius: 0 });
  if (type === 'text') Object.assign(layer, { color: '#ffffff', fontSize: 96, fontWeight: 700, align: 'left', lineHeight: 1.1, letterSpacing: 0, uppercase: false, text: '' });
  if (type === 'background' || type === 'shape') Object.assign(layer, { color: type === 'background' ? '#0b0d0d' : '#0d8f4f', radius: 0 });

  workingLayers.push(layer);
  selectedLayerId = layer.id;
  renderLayerList();
  renderLayerProps();
  refreshPreview();
});

/* ---- pliki szablonu ---- */

function renderAssets() {
  if (!assetList) return;
  const assets = currentTemplate?.assets || [];
  assetList.innerHTML = assets.length ? assets.map((asset) => `
    <div class="col-6 col-md-4">
      <div class="card card-sm">
        <div class="thumb-1610" style="background-image:url('${escapeHTML(asset.object_key)}');background-size:contain;background-position:center;background-repeat:no-repeat"></div>
        <div class="card-body p-2 d-flex align-items-center">
          <div class="flex-fill text-truncate">
            <div class="text-truncate small">${escapeHTML(asset.object_key.split('/').pop())}</div>
            <div class="text-secondary small">${escapeHTML(asset.kind)}</div>
          </div>
          <button class="btn btn-icon btn-sm" type="button" data-asset-delete="${asset.id}" aria-label="Usuń plik">${icon('trash')}</button>
        </div>
      </div>
    </div>`).join('')
    : '<div class="col-12 text-secondary small">Szablon nie ma jeszcze żadnych plików.</div>';
}

assetList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-asset-delete]');
  if (!button || !confirm('Usunąć ten plik z szablonu?')) return;
  try {
    await api('/api/assets/' + button.dataset.assetDelete, { method: 'DELETE' });
    currentTemplate.assets = currentTemplate.assets.filter((asset) => asset.id !== Number(button.dataset.assetDelete));
    workingLayers.forEach((layer) => {
      if (Number(layer.asset_id) === Number(button.dataset.assetDelete)) layer.asset_id = null;
    });
    renderAssets();
    renderLayerProps();
    refreshPreview();
  } catch (error) { setFormError(templateFormError, error.message); }
});

document.getElementById('asset-file')?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file || !currentTemplate?.id) return;
  const form = new FormData();
  form.append('file', file);
  form.append('kind', document.getElementById('asset-kind').value);
  setFormError(templateFormError, '');
  try {
    const response = await fetch('/api/templates/' + currentTemplate.id + '/assets', { method: 'POST', body: form });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || 'Nie udało się wgrać pliku.');
    currentTemplate.assets = [...(currentTemplate.assets || []), payload.asset];
    renderAssets();
    renderLayerProps();
    refreshPreview();
  } catch (error) {
    setFormError(templateFormError, error.message);
  } finally {
    event.target.value = '';
  }
});

/* ---- podgląd ---- */

let previewTimer;
function refreshPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(drawPreview, 120);
}

async function drawPreview() {
  if (!previewCanvas || !templateForm || templateForm.closest('.d-none')) return;
  const width = Number(templateForm.elements.width.value) || 1080;
  const height = Number(templateForm.elements.height.value) || 1350;
  const maxWidth = 420;
  const scale = Math.min(1, maxWidth / width);

  previewCanvas.width = Math.round(width * scale);
  previewCanvas.height = Math.round(height * scale);
  document.getElementById('preview-size').textContent = `${width} × ${height} px`;

  // Wartości podglądowe: etykiety pól tekstowych, żeby grafik widział rozmieszczenie.
  // Pola zdjęć zostają puste — wtedy renderer rysuje obrys maski wyznaczonej przez grafika.
  const values = {};
  collectFields().forEach((field) => {
    if (field.type === 'photo') return;
    values[field.key] = field.default || field.label;
  });

  await window.ZmcRenderer.render(
    previewCanvas,
    { width, height, definition: { layers: workingLayers } },
    values,
    currentTemplate?.assets || [],
    { placeholders: true }
  );
}

/* ---- lista i zapis szablonu ---- */

function renderTemplateList() {
  if (!templateList) return;
  document.getElementById('template-list-empty')?.classList.toggle('d-none', templates.length > 0);
  templateList.innerHTML = templates.map((template) => `
    <a href="#" class="list-group-item list-group-item-action d-flex align-items-center${template.id === currentTemplate?.id ? ' active' : ''}"
       data-template="${template.id}">
      <div class="flex-fill">
        <div>${escapeHTML(template.name)}</div>
        <div class="text-secondary small">
          ${template.category === 'match' ? 'Meczowy' : 'Inny'} · ${template.width}×${template.height} ·
          ${template.field_count} ${template.field_count === 1 ? 'pole' : 'pól'}
        </div>
      </div>
      ${icon('chevron', 'text-secondary')}
    </a>`).join('');
}

function showTemplateEditor(template) {
  const editor = document.getElementById('template-editor');
  const empty = document.getElementById('template-editor-empty');
  const actions = document.getElementById('template-editor-actions');
  if (!templateForm) return;

  currentTemplate = template ? { ...template, assets: template.assets || [] } : null;
  workingLayers = template ? JSON.parse(JSON.stringify(template.definition.layers || [])) : [];
  selectedLayerId = workingLayers[0]?.id || null;

  setFormError(templateFormError, '');
  editor.classList.remove('d-none');
  empty?.classList.add('d-none');
  document.getElementById('template-editor-title').textContent = template ? template.name : 'Nowy szablon';

  templateForm.elements.id.value = template?.id || '';
  templateForm.elements.name.value = template?.name || '';
  templateForm.elements.category.value = template?.category || 'match';
  templateForm.elements.width.value = template?.width || 1080;
  templateForm.elements.height.value = template?.height || 1350;

  templateFields.innerHTML = '';
  (template?.definition?.fields || []).forEach((field) => templateFields.appendChild(fieldRow(field)));

  actions.innerHTML = template && canEditTemplates
    ? `<button class="btn btn-icon btn-sm" type="button" id="template-delete" aria-label="Usuń szablon">${icon('trash')}</button>`
    : '';
  document.getElementById('template-delete')?.addEventListener('click', async () => {
    if (!confirm(`Usunąć szablon „${template.name}”?`)) return;
    try {
      await api('/api/templates/' + template.id, { method: 'DELETE' });
      await loadTemplates();
      hideTemplateEditor();
    } catch (error) { setFormError(templateFormError, error.message); }
  });

  renderTemplateList();
  renderLayerList();
  renderLayerProps();
  renderAssets();
  refreshPreview();
}

function hideTemplateEditor() {
  currentTemplate = null;
  workingLayers = [];
  document.getElementById('template-editor')?.classList.add('d-none');
  document.getElementById('template-editor-empty')?.classList.remove('d-none');
  document.getElementById('template-editor-title').textContent = 'Wybierz szablon';
  document.getElementById('template-editor-actions').innerHTML = '';
  renderTemplateList();
}

async function loadTemplates() {
  if (!templateList) return;
  const payload = await api('/api/templates');
  templates = payload.templates;
  renderTemplateList();
  fillMaterialTemplateSelect();
}

templateList?.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-template]');
  if (!link) return;
  event.preventDefault();
  try {
    const { template } = await api('/api/templates/' + link.dataset.template);
    showTemplateEditor(template);
  } catch (error) { setFormError(templateFormError, error.message); }
});

document.getElementById('template-new')?.addEventListener('click', () => showTemplateEditor(null));
document.getElementById('template-cancel')?.addEventListener('click', hideTemplateEditor);
document.getElementById('template-add-field')?.addEventListener('click', () => {
  templateFields.appendChild(fieldRow({ type: 'text' }));
  renderLayerProps();
});
templateForm?.querySelectorAll('[name=width],[name=height]').forEach((input) => {
  input.addEventListener('input', refreshPreview);
});

templateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = templateForm.elements.id.value;
  const body = {
    name: templateForm.elements.name.value,
    category: templateForm.elements.category.value,
    width: templateForm.elements.width.value,
    height: templateForm.elements.height.value,
    definition: { fields: collectFields(), layers: workingLayers }
  };
  setFormError(templateFormError, '');
  try {
    const { template } = await api(id ? '/api/templates/' + id : '/api/templates', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body)
    });
    await loadTemplates();
    const full = await api('/api/templates/' + template.id);
    showTemplateEditor(full.template);
  } catch (error) {
    setFormError(templateFormError, error.message);
  }
});

/* ================= Materiały meczowe ================= */

const MATERIAL_STATUS = {
  todo: { label: 'Do zrobienia', badge: 'bg-secondary-lt' },
  ready: { label: 'Gotowe', badge: 'bg-green-lt' },
  published: { label: 'Opublikowane', badge: 'bg-azure-lt' }
};
const ROLE_LABELS = { admin: 'Administrator', designer: 'Grafik', social: 'Social media', photographer: 'Fotograf' };
const canEditMaterials = ['admin', 'designer'].includes(document.body.dataset.role);
const canSetStatus = ['admin', 'designer', 'social'].includes(document.body.dataset.role);

const materialsBody = document.getElementById('materials-body');
const materialError = document.getElementById('material-error');
let currentMatch = null;

function fillMaterialTemplateSelect() {
  const select = document.getElementById('material-template');
  if (!select) return;
  const matchTemplates = templates.filter((template) => template.category === 'match');
  select.innerHTML = matchTemplates.length
    ? matchTemplates.map((template) => `<option value="${template.id}">${escapeHTML(template.name)}</option>`).join('')
    : '<option value="">Brak szablonów meczowych</option>';
}

async function openMatch(matchId) {
  try {
    const { match } = await api('/api/matches/' + matchId);
    currentMatch = match;
    const when = formatDate(match.match_date);
    const label = `${match.home_team} — ${match.away_team}`;
    document.getElementById('match-detail-title').textContent = label;
    // Pasek górny nazywa faktycznie otwarty mecz, a nie wpis z listy etykiet.
    viewLabels.match = label;
    viewContext.match = when ? `Mecz · ${when.date}` : 'Mecz';
    document.getElementById('match-detail-grid').innerHTML = [
      ['Termin', when ? `${when.date} · ${when.time}` : '—'],
      ['Hala', match.venue || '—'],
      ['Rozgrywki', match.competition || '—'],
      ['Kolejka', match.round_name || '—'],
      ['Sezon', match.season_name],
      ['Wynik', (match.home_score === null || match.away_score === null) ? '—' : `${match.home_score} : ${match.away_score}`]
    ].map(([title, value]) => `
      <div class="datagrid-item">
        <div class="datagrid-title">${title}</div>
        <div class="datagrid-content">${escapeHTML(String(value))}</div>
      </div>`).join('');
    await loadMaterials();
    showView('match');
  } catch (error) {
    showMatchesMessage(error.message);
  }
}

async function loadMaterials() {
  if (!materialsBody || !currentMatch) return;
  const { materials } = await api('/api/matches/' + currentMatch.id + '/materials');
  document.getElementById('materials-empty')?.classList.toggle('d-none', materials.length > 0);
  materialsBody.innerHTML = materials.map((item) => {
    const status = MATERIAL_STATUS[item.status] || MATERIAL_STATUS.todo;
    const deadline = formatDate(item.deadline_at);
    const statusCell = canSetStatus
      ? `<select class="form-select form-select-sm" data-material-status="${item.id}">
           ${Object.entries(MATERIAL_STATUS).map(([value, meta]) =>
             `<option value="${value}" ${item.status === value ? 'selected' : ''}>${meta.label}</option>`).join('')}
         </select>`
      : `<span class="badge ${status.badge}">${status.label}</span>`;
    return `<tr>
      <td>
        <div>${escapeHTML(item.template_name)}</div>
        ${item.note ? `<div class="text-secondary small">${escapeHTML(item.note)}</div>` : ''}
      </td>
      <td class="text-secondary text-nowrap">${item.width}×${item.height}</td>
      <td class="text-secondary text-nowrap">${deadline ? deadline.date + ' · ' + deadline.time : '—'}</td>
      <td class="text-secondary">${item.owner_role ? ROLE_LABELS[item.owner_role] : '—'}</td>
      <td>${statusCell}</td>
      ${canEditMaterials ? `<td>
        <button class="btn btn-icon btn-sm" type="button" data-material-delete="${item.id}" aria-label="Odepnij materiał">
          ${icon('trash')}
        </button>
      </td>` : ''}
    </tr>`;
  }).join('');
}

document.getElementById('material-add')?.addEventListener('click', async () => {
  if (!currentMatch) return;
  const templateId = document.getElementById('material-template').value;
  if (!templateId) return;
  setFormError(materialError, '');
  try {
    await api('/api/matches/' + currentMatch.id + '/materials', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        deadline_at: document.getElementById('material-deadline').value || null,
        owner_role: document.getElementById('material-owner').value || null
      })
    });
    document.getElementById('material-deadline').value = '';
    await loadMaterials();
  } catch (error) { setFormError(materialError, error.message); }
});

materialsBody?.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-material-status]');
  if (!select) return;
  setFormError(materialError, '');
  try {
    await api('/api/materials/' + select.dataset.materialStatus, {
      method: 'PATCH',
      body: JSON.stringify({ status: select.value })
    });
  } catch (error) { setFormError(materialError, error.message); }
});

materialsBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-material-delete]');
  if (!button) return;
  if (!confirm('Odpiąć ten materiał od meczu?')) return;
  setFormError(materialError, '');
  try {
    await api('/api/materials/' + button.dataset.materialDelete, { method: 'DELETE' });
    await loadMaterials();
  } catch (error) { setFormError(materialError, error.message); }
});


/* ================= Inne grafiki i historia eksportów ================= */

const otherGrid = document.getElementById('other-grid');
async function loadOtherTemplates() {
  if (!otherGrid) return;
  if (!templates.length) await loadTemplates();
  const others = templates.filter((template) => template.category === 'other');
  otherGrid.innerHTML = others.length
    ? others.map((template) => `
        <div class="col-6 col-md-4 col-xl-3">
          <div class="card card-sm">
            <div class="thumb-1610"></div>
            <div class="card-body p-2">
              <div class="text-truncate">${escapeHTML(template.name)}</div>
              <div class="text-secondary small">
                ${template.width}×${template.height} · ${template.field_count} ${template.field_count === 1 ? 'pole' : 'pól'}
              </div>
            </div>
          </div>
        </div>`).join('')
    : `<div class="col-12 text-secondary">
         Nie ma jeszcze szablonów spoza kalendarza meczowego.
         Utwórz szablon z rodzajem „Inny” w bibliotece szablonów.
       </div>`;
}

const historyBody = document.getElementById('history-body');
const historyEmpty = document.getElementById('history-empty');
async function loadHistory() {
  if (!historyBody) return;
  const { exports } = await api('/api/exports');
  historyEmpty?.classList.toggle('d-none', exports.length > 0);
  historyBody.innerHTML = exports.map((item) => {
    const when = formatDate(item.created_at);
    const context = item.home_team ? `${item.home_team} — ${item.away_team}` : 'Poza meczem';
    return `<tr>
      <td><span class="d-block rounded border" style="width:44px;height:32px"></span></td>
      <td>${escapeHTML(item.design_title || item.template_name)}</td>
      <td class="text-secondary">${escapeHTML(context)}</td>
      <td class="text-secondary text-nowrap">${when ? when.date + ' · ' + when.time : '—'}</td>
      <td class="text-secondary">${escapeHTML(item.format.toUpperCase())} ${item.width}×${item.height}</td>
      <td class="text-secondary">${escapeHTML(item.user_name || '—')}</td>
    </tr>`;
  }).join('');
}

/* ---------------- Monitoring social ---------------- */
const socialElements = {
  connection: document.getElementById('social-connection'),
  lastSync: document.getElementById('social-last-sync'),
  followers: document.getElementById('social-followers'),
  postCount: document.getElementById('social-post-count'),
  average: document.getElementById('social-average'),
  engagement: document.getElementById('social-engagement'),
  posts: document.getElementById('social-posts'),
  advice: document.getElementById('social-advice'),
  model: document.getElementById('social-analysis-model'),
  refresh: document.getElementById('social-refresh'),
  analyze: document.getElementById('social-analyze')
};
let socialViewLoaded = false;
let socialIntegrations = null;

const dotByState = {
  ready: 'bg-green', partial: 'bg-yellow', setup: 'bg-yellow',
  error: 'bg-red', loading: 'bg-blue status-dot-animated'
};

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch { return '#'; }
}
const formatSocialNumber = (value) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(Number(value || 0));
const formatSocialDate = (value) => (value
  ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : 'Brak daty');

function setSocialConnection(stateName, title, detail) {
  if (!socialElements.connection) return;
  socialElements.connection.dataset.state = stateName;
  const dot = socialElements.connection.querySelector('.social-connection-dot');
  if (dot) dot.className = 'status-dot me-2 social-connection-dot ' + (dotByState[stateName] || 'bg-secondary');
  const titleNode = socialElements.connection.querySelector('b');
  if (titleNode) titleNode.textContent = title;
  if (socialElements.lastSync) socialElements.lastSync.textContent = detail;
}

function setSocialBusy(button, busy, label) {
  if (!button) return;
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

async function socialRequest(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać danych.');
  return payload;
}

function socialEmpty(title, detail, isError = false) {
  return `<div class="list-group-item">
    <div class="${isError ? 'text-danger' : ''}">${escapeHTML(title)}</div>
    <div class="text-secondary small">${escapeHTML(detail)}</div>
  </div>`;
}

function renderSocialOverview(overview) {
  if (!overview) return;
  socialElements.followers.textContent = overview.page.followers ? formatSocialNumber(overview.page.followers) : '—';
  socialElements.postCount.textContent = formatSocialNumber(overview.posts.length);
  socialElements.average.textContent = formatSocialNumber(overview.averages.interactions);
  socialElements.engagement.textContent = overview.averages.engagementRate === null
    ? '—' : `${formatSocialNumber(overview.averages.engagementRate)}%`;

  if (!overview.posts.length) {
    socialElements.posts.innerHTML = socialEmpty('Brak publikacji', 'Facebook nie zwrócił postów z wybranego okresu.');
    return;
  }

  socialElements.posts.innerHTML = overview.posts.map((post) => {
    const url = safeExternalUrl(post.permalinkUrl);
    const best = post.id === overview.bestPostId;
    return `<div class="list-group-item">
      <div class="row align-items-center g-2">
        <div class="col-auto text-secondary small text-nowrap">${escapeHTML(formatSocialDate(post.createdAt))}</div>
        <div class="col text-truncate">
          <div class="text-truncate">${escapeHTML(post.message.slice(0, 140))}${post.message.length > 140 ? '…' : ''}</div>
          <div class="text-secondary small">
            ${best ? '<span class="badge bg-green-lt me-1">Najlepszy wynik</span>' : ''}
            ${formatSocialNumber(post.reactions)} reakcji · ${formatSocialNumber(post.comments)} kom. · ${formatSocialNumber(post.shares)} udost.
          </div>
        </div>
        <div class="col-auto text-end">
          <div class="fw-bold">${formatSocialNumber(post.interactions)}</div>
          <div class="text-secondary small">interakcji</div>
        </div>
        ${url !== '#' ? `<div class="col-auto"><a class="btn btn-icon btn-ghost-secondary btn-sm" href="${escapeHTML(url)}"
           target="_blank" rel="noopener noreferrer" aria-label="Otwórz post na Facebooku">${icon('external')}</a></div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderSocialAnalysis(analysis) {
  if (!analysis) return;
  socialElements.model.textContent = analysis.model || 'OpenAI';
  const action = analysis.recommendedAction;
  const suggestions = (analysis.suggestions || []).map((item, index) => `
    <div class="list-group-item px-0">
      <div class="text-secondary small text-uppercase">0${index + 1} · ${escapeHTML(item.timing)}</div>
      <div class="fw-medium">${escapeHTML(item.title)}</div>
      <div class="text-secondary small">${escapeHTML(item.concept)}</div>
      <div class="text-secondary small mt-1">${escapeHTML(item.channel)} · ${escapeHTML(item.format)} — ${escapeHTML(item.why)}</div>
    </div>`).join('');
  const observations = (analysis.observations || []).map((item) => `<li>${escapeHTML(item)}</li>`).join('');

  socialElements.advice.innerHTML = `
    <div class="alert alert-success" role="status">
      <div class="text-uppercase small">Najważniejsza rekomendacja</div>
      <div class="fw-bold my-1">${escapeHTML(action.title)}</div>
      <div class="small">${escapeHTML(action.rationale)}</div>
      <div class="small text-secondary mt-2">${escapeHTML(action.publishAt)} · ${escapeHTML(action.format)}</div>
    </div>
    <div class="mb-3">
      <div class="text-secondary small text-uppercase mb-1">Wnioski z profilu</div>
      <p class="mb-1">${escapeHTML(analysis.summary)}</p>
      <ul class="text-secondary small mb-0">${observations}</ul>
    </div>
    <div class="text-secondary small text-uppercase">Kolejne pomysły · okno ${escapeHTML(analysis.timing.bestWindow)}</div>
    <div class="list-group list-group-flush">${suggestions}</div>`;
}

function renderSocialSetup(status) {
  if (!status.facebook.configured) {
    setSocialConnection('setup', 'Facebook niepołączony', 'Dodaj dane strony Meta na serwerze');
    socialElements.posts.innerHTML = socialEmpty('Połącz profil klubowy',
      'Administrator musi dodać identyfikator strony i token dostępu Meta.');
  } else if (!status.openai.configured) {
    setSocialConnection('partial', 'Facebook połączony', 'Brakuje konfiguracji analizy OpenAI');
    socialElements.advice.innerHTML = '<p class="text-secondary mb-0">Analiza OpenAI nieaktywna — po dodaniu klucza API rekomendacje pojawią się tutaj.</p>';
  } else {
    setSocialConnection('ready', 'Integracje aktywne', status.facebook.monitoringEnabled
      ? `Monitoring automatyczny co ${status.facebook.intervalMinutes} min`
      : 'Facebook i OpenAI są gotowe');
  }
}

async function loadSocialOverview() {
  try {
    const payload = await socialRequest('/api/social/overview');
    renderSocialOverview(payload.overview);
    if (payload.analysis) renderSocialAnalysis(payload.analysis);
    setSocialConnection(socialIntegrations?.openai.configured ? 'ready' : 'partial',
      'Dane Facebook aktualne', `Ostatnia synchronizacja: ${formatSocialDate(payload.overview.fetchedAt)}`);
  } catch (error) {
    setSocialConnection('error', 'Nie udało się pobrać Facebooka', error.message);
    socialElements.posts.innerHTML = socialEmpty('Błąd synchronizacji', error.message, true);
  }
}

async function loadSocialView() {
  if (socialViewLoaded || !socialElements.connection) return;
  socialViewLoaded = true;
  try {
    const payload = await socialRequest('/api/social/status');
    socialIntegrations = payload.integrations;
    renderSocialSetup(socialIntegrations);
    if (payload.cache?.overview) renderSocialOverview(payload.cache.overview);
    if (payload.cache?.analysis) renderSocialAnalysis(payload.cache.analysis);
    if (socialIntegrations.facebook.configured) await loadSocialOverview();
  } catch (error) {
    socialViewLoaded = false;
    setSocialConnection('error', 'Integracje niedostępne', error.message);
  }
}

socialElements.refresh?.addEventListener('click', async () => {
  setSocialBusy(socialElements.refresh, true, 'Odświeżam…');
  try {
    const payload = await socialRequest('/api/social/refresh', { method: 'POST', body: '{}' });
    renderSocialOverview(payload.overview);
    setSocialConnection('ready', 'Dane Facebook aktualne', `Ostatnia synchronizacja: ${formatSocialDate(payload.overview.fetchedAt)}`);
  } catch (error) {
    setSocialConnection('error', 'Błąd synchronizacji', error.message);
  } finally {
    setSocialBusy(socialElements.refresh, false);
  }
});

socialElements.analyze?.addEventListener('click', async () => {
  setSocialBusy(socialElements.analyze, true, 'Analizuję…');
  setSocialConnection('loading', 'Analiza w toku', 'OpenAI analizuje ostatnie publikacje');
  try {
    const payload = await socialRequest('/api/social/analyze', { method: 'POST', body: JSON.stringify({ refresh: true }) });
    renderSocialOverview(payload.overview);
    renderSocialAnalysis(payload.analysis);
    setSocialConnection('ready', 'Analiza gotowa', `Wygenerowano: ${formatSocialDate(payload.analysis.generatedAt)}`);
  } catch (error) {
    setSocialConnection('error', 'Analiza nieudana', error.message);
  } finally {
    setSocialBusy(socialElements.analyze, false);
  }
});

/* ================= Magazyn zdjęć (S3 / MEGA S4) ================= */

const FOLDER_ROLE_LABELS = {
  photographer: 'Fotograf',
  selected: 'Wybrane',
  social: 'Social media',
  archive: 'Archiwum',
  custom: 'Inne'
};

const canManageFolders = ['admin', 'designer'].includes(document.body.dataset.role);
const canUploadPhotos = ['admin', 'designer', 'photographer'].includes(document.body.dataset.role);
const canSelectPhotos = ['admin', 'designer', 'social'].includes(document.body.dataset.role);
const canDeletePhotos = ['admin', 'photographer'].includes(document.body.dataset.role);

const lib = {
  list: document.getElementById('folders-list'),
  empty: document.getElementById('folders-empty'),
  grid: document.getElementById('library-grid'),
  gridEmpty: document.getElementById('library-empty'),
  title: document.getElementById('library-title'),
  subtitle: document.getElementById('library-subtitle'),
  footer: document.getElementById('library-footer'),
  error: document.getElementById('library-error'),
  progress: document.getElementById('library-progress'),
  syncBtn: document.getElementById('library-sync'),
  uploadBtn: document.getElementById('library-upload'),
  fileInput: document.getElementById('library-file-input'),
  filter: document.getElementById('library-filter'),
  selectedOnly: document.getElementById('library-selected-only'),
  dropzone: document.getElementById('library-dropzone')
};

let folders = [];
let currentFolder = null;
let photos = [];
let foldersLoaded = false;

function setLibraryError(message) {
  setFormError(lib.error, message);
}

function setLibraryBusy(busy) {
  lib.progress?.classList.toggle('d-none', !busy);
  [lib.syncBtn, lib.uploadBtn].forEach((button) => { if (button) button.disabled = busy; });
}

function folderSubtitle(folder) {
  const parts = [FOLDER_ROLE_LABELS[folder.role] || folder.role];
  if (folder.home_team) parts.push(`${folder.home_team} – ${folder.away_team}`);
  return parts.join(' · ');
}

function renderFolders() {
  if (!lib.list) return;
  lib.empty?.classList.toggle('d-none', folders.length > 0);

  lib.list.innerHTML = folders.map((folder) => `
    <div class="list-group-item list-group-item-action d-flex align-items-center ${currentFolder?.id === folder.id ? 'active' : ''}"
         data-folder-id="${folder.id}" role="button">
      <span class="me-2 text-secondary">${icon('folder')}</span>
      <div class="flex-fill min-w-0">
        <div class="text-truncate">${escapeHTML(folder.name)}</div>
        <div class="text-secondary small text-truncate">${escapeHTML(folderSubtitle(folder))}</div>
      </div>
      <span class="badge bg-secondary-lt ms-2">${Number(folder.photo_count) || 0}</span>
      ${canManageFolders ? `
        <button class="btn btn-icon btn-sm btn-ghost-secondary ms-1" type="button"
                data-folder-edit="${folder.id}" title="Edytuj folder"
                data-bs-toggle="modal" data-bs-target="#folder-modal">${icon('edit')}</button>` : ''}
    </div>
  `).join('');
}

function renderPhotos() {
  if (!lib.grid) return;

  const visible = lib.selectedOnly?.checked ? photos.filter((photo) => Number(photo.is_selected) === 1) : photos;

  if (!currentFolder) {
    lib.grid.innerHTML = '';
    lib.gridEmpty.textContent = 'Wybierz folder, żeby zobaczyć zdjęcia.';
    lib.gridEmpty.classList.remove('d-none');
    lib.footer?.classList.add('d-none');
    return;
  }

  lib.gridEmpty.classList.toggle('d-none', visible.length > 0);
  if (!visible.length) {
    lib.gridEmpty.textContent = photos.length
      ? 'Żadne zdjęcie w tym folderze nie zostało jeszcze wybrane.'
      : 'Folder jest pusty. Przeciągnij tu zdjęcia albo kliknij „Synchronizuj”, jeśli wrzucono je klientem S3.';
  }

  lib.grid.innerHTML = visible.map((photo) => `
    <div class="col-6 col-md-4 col-xl-3">
      <div class="photo-tile photo-tile-43 ${Number(photo.is_selected) === 1 ? 'selected' : ''}"
           data-photo-id="${photo.id}" title="${escapeHTML(photo.file_name)}">
        ${photo.url ? `<img src="${escapeHTML(photo.url)}" alt="${escapeHTML(photo.file_name)}" loading="lazy"
             class="position-absolute top-0 start-0 w-100 h-100 object-cover rounded"
             onerror="this.closest('.photo-tile').classList.add('is-missing')">` : ''}
        <span class="photo-missing-note">Nie ma go już w magazynie — kliknij „Synchronizuj”</span>
        <div class="position-absolute bottom-0 start-0 end-0 p-1 d-flex align-items-center gap-1">
          ${canSelectPhotos ? `
            <button class="btn btn-icon btn-sm ${Number(photo.is_selected) === 1 ? 'btn-primary' : ''}"
                    type="button" data-photo-select="${photo.id}"
                    title="${Number(photo.is_selected) === 1 ? 'Odznacz' : 'Oznacz jako wybrane'}">${icon('check')}</button>` : ''}
          ${canDeletePhotos ? `
            <button class="btn btn-icon btn-sm ms-auto" type="button" data-photo-delete="${photo.id}"
                    title="Usuń z magazynu">${icon('trash')}</button>` : ''}
        </div>
      </div>
      <div class="text-secondary small text-truncate mt-1" title="${escapeHTML(photo.file_name)}">${escapeHTML(photo.file_name)}</div>
    </div>
  `).join('');

  const selected = photos.filter((photo) => Number(photo.is_selected) === 1).length;
  if (lib.footer) {
    lib.footer.classList.remove('d-none');
    lib.footer.textContent = `${photos.length} ${plural(photos.length, 'zdjęcie', 'zdjęcia', 'zdjęć')} w indeksie`
      + ` · ${selected} ${plural(selected, 'wybrane', 'wybrane', 'wybranych')}`
      + ` · bucket ${currentFolder.bucket}/${currentFolder.prefix_path}`;
  }
}

async function loadFolders() {
  if (!lib.list) return;
  try {
    const payload = await api('/api/folders');
    folders = payload.folders;
    foldersLoaded = true;
    if (currentFolder) currentFolder = folders.find((folder) => folder.id === currentFolder.id) || null;
    renderFolders();
  } catch (error) {
    setLibraryError(error.message);
  }
}

async function selectFolder(id) {
  setLibraryError('');
  setLibraryBusy(true);
  try {
    const payload = await api(`/api/folders/${id}/photos`);
    currentFolder = payload.folder;
    photos = payload.photos;
    lib.title.textContent = currentFolder.name;
    lib.subtitle.textContent = `${currentFolder.bucket}/${currentFolder.prefix_path}`;
    lib.syncBtn?.classList.remove('d-none');
    lib.filter?.classList.remove('d-none');
    if (canUploadPhotos && currentFolder.is_upload_enabled) lib.uploadBtn?.classList.remove('d-none');
    else lib.uploadBtn?.classList.add('d-none');
    renderFolders();
    renderPhotos();
  } catch (error) {
    setLibraryError(error.message);
  } finally {
    setLibraryBusy(false);
  }
}

lib.list?.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-folder-edit]');
  if (editButton) return;                                  // modal otworzy się z data-bs-*
  const row = event.target.closest('[data-folder-id]');
  if (row) selectFolder(Number(row.dataset.folderId));
});

lib.selectedOnly?.addEventListener('change', renderPhotos);

lib.syncBtn?.addEventListener('click', async () => {
  if (!currentFolder) return;
  setLibraryError('');
  setLibraryBusy(true);
  try {
    const payload = await api(`/api/folders/${currentFolder.id}/sync`, { method: 'POST', body: '{}' });
    photos = payload.photos;
    renderPhotos();
    await loadFolders();
    if (payload.truncated) {
      setLibraryError('Folder zawiera więcej plików, niż mieści się w jednym odczycie — zawęź prefix.');
    }
  } catch (error) {
    setLibraryError(error.message);
  } finally {
    setLibraryBusy(false);
  }
});

lib.grid?.addEventListener('click', async (event) => {
  const selectButton = event.target.closest('[data-photo-select]');
  const deleteButton = event.target.closest('[data-photo-delete]');
  if (!selectButton && !deleteButton) return;

  setLibraryError('');
  try {
    if (selectButton) {
      const id = Number(selectButton.dataset.photoSelect);
      const photo = photos.find((item) => item.id === id);
      const payload = await api(`/api/photos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_selected: Number(photo.is_selected) !== 1 })
      });
      Object.assign(photo, payload.photo);
      renderPhotos();
      await loadFolders();
      return;
    }

    const id = Number(deleteButton.dataset.photoDelete);
    const photo = photos.find((item) => item.id === id);
    if (!confirm(`Usunąć zdjęcie ${photo.file_name} z magazynu? Operacji nie da się cofnąć.`)) return;
    await api(`/api/photos/${id}?purge=1`, { method: 'DELETE' });
    photos = photos.filter((item) => item.id !== id);
    renderPhotos();
    await loadFolders();
  } catch (error) {
    setLibraryError(error.message);
  }
});

/* ---- wysyłka zdjęć ----
   MEGA S4 nie pozwala ustawić CORS, więc przeglądarka nie może wysłać pliku
   wprost do bucketa — pliki idą przez nasz serwer, partiami, żeby pasek
   postępu pokazywał realny stan, a zerwane połączenie nie cofało całości. */

/** Polska odmiana liczebnika: 1 plik, 2 pliki, 5 plików. */
function plural(count, one, few, many) {
  const n = Math.abs(count);
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

const UPLOAD_BATCH = 5;

function setUploadProgress(done, total) {
  if (!lib.progress) return;
  const bar = lib.progress.querySelector('.progress-bar');
  if (!bar) return;
  if (total === null) {
    bar.className = 'progress-bar progress-bar-indeterminate';
    bar.style.width = '';
    bar.textContent = '';
    return;
  }
  const percent = Math.round(done / total * 100);
  bar.className = 'progress-bar';
  bar.style.width = `${percent}%`;
  bar.textContent = `${done} / ${total}`;
}

/** XHR zamiast fetch — tylko on daje postęp wysyłki. */
function sendBatch(folderId, files, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));

    const request = new XMLHttpRequest();
    request.open('POST', `/api/folders/${folderId}/upload`);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      let payload = {};
      try { payload = JSON.parse(request.responseText); } catch { /* pusta odpowiedź */ }
      if (request.status >= 200 && request.status < 300 && payload.success !== false) return resolve(payload);
      reject(new Error(payload.error || `Serwer odrzucił wysyłkę (HTTP ${request.status}).`));
    });
    request.addEventListener('error', () => reject(new Error('Połączenie przerwane w trakcie wysyłki.')));
    request.send(form);
  });
}

async function uploadFiles(fileList) {
  const all = [...fileList];
  const files = all.filter((file) => file.type.startsWith('image/'));
  const skipped = all.length - files.length;
  if (!currentFolder) return;

  // Pliki inne niż zdjęcia odrzucamy od razu, ale mówimy o tym wprost —
  // po przeciągnięciu całego katalogu łatwo nie zauważyć, że część nie poszła.
  setLibraryError(skipped
    ? `Pominięto ${skipped} ${plural(skipped, 'plik', 'pliki', 'plików')}, ${plural(skipped, 'który nie jest zdjęciem', 'które nie są zdjęciami', 'które nie są zdjęciami')}.`
    : '');
  if (!files.length) return;

  setLibraryBusy(true);
  setUploadProgress(0, files.length);

  let sent = 0;
  try {
    for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
      const batch = files.slice(i, i + UPLOAD_BATCH);
      const payload = await sendBatch(currentFolder.id, batch,
        (ratio) => setUploadProgress(sent + ratio * batch.length, files.length));
      sent += batch.length;
      setUploadProgress(sent, files.length);
      photos = payload.photos;
    }
    renderPhotos();
    await loadFolders();
  } catch (error) {
    // Partie wysłane przed błędem są już w magazynie — pokazujemy je zamiast udawać, że nic się nie stało.
    setLibraryError(sent
      ? `${error.message} Wysłano ${sent} z ${files.length} — pozostałe spróbuj ponownie.`
      : error.message);
    if (sent) await selectFolder(currentFolder.id);
  } finally {
    setLibraryBusy(false);
    setUploadProgress(null, null);
    if (lib.fileInput) lib.fileInput.value = '';
  }
}

lib.uploadBtn?.addEventListener('click', () => lib.fileInput?.click());
lib.fileInput?.addEventListener('change', (event) => uploadFiles(event.target.files));

['dragenter', 'dragover'].forEach((type) => {
  lib.dropzone?.addEventListener(type, (event) => {
    if (!currentFolder || !canUploadPhotos) return;
    event.preventDefault();
    lib.dropzone.classList.add('is-dropping');
  });
});
['dragleave', 'drop'].forEach((type) => {
  lib.dropzone?.addEventListener(type, (event) => {
    event.preventDefault();
    lib.dropzone.classList.remove('is-dropping');
    if (type === 'drop' && currentFolder && canUploadPhotos) uploadFiles(event.dataTransfer.files);
  });
});

/* ---- formularz folderu ---- */

const folderModalEl = document.getElementById('folder-modal');
const folderForm = document.getElementById('folder-form');
const folderFormError = document.getElementById('folder-form-error');

folderModalEl?.addEventListener('show.bs.modal', async (event) => {
  if (!folderForm) return;
  const trigger = event.relatedTarget;
  const editId = trigger?.dataset?.folderEdit ? Number(trigger.dataset.folderEdit) : null;
  const folder = editId ? folders.find((item) => item.id === editId) : null;

  folderForm.reset();
  setFormError(folderFormError, '');
  document.getElementById('folder-modal-title').textContent = folder ? 'Edytuj folder' : 'Nowy folder';
  folderForm.elements.id.value = folder?.id || '';
  folderForm.elements.name.value = folder?.name || '';
  folderForm.elements.prefix_path.value = folder?.prefix_path || '';
  folderForm.elements.role.value = folder?.role || 'custom';
  document.getElementById('folder-upload-enabled').checked = folder ? Number(folder.is_upload_enabled) === 1 : true;

  // Lista meczów jest krótka i zmienia się rzadko — pobieramy ją przy otwarciu.
  try {
    const payload = await api('/api/matches');
    const select = folderForm.elements.match_id;
    select.innerHTML = '<option value="">Bez meczu</option>'
      + payload.matches.map((match) => `<option value="${match.id}">${escapeHTML(`${match.home_team} – ${match.away_team}`)}</option>`).join('');
    select.value = folder?.match_id || '';
  } catch (error) {
    setFormError(folderFormError, error.message);
  }
});

folderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError(folderFormError, '');

  const id = folderForm.elements.id.value;
  const body = {
    name: folderForm.elements.name.value,
    prefix_path: folderForm.elements.prefix_path.value,
    role: folderForm.elements.role.value,
    match_id: folderForm.elements.match_id.value || null,
    is_upload_enabled: document.getElementById('folder-upload-enabled').checked
  };

  try {
    const payload = await api(id ? `/api/folders/${id}` : '/api/folders', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body)
    });
    hideModal(folderModalEl);
    await loadFolders();
    await selectFolder(payload.folder.id);
  } catch (error) {
    setFormError(folderFormError, error.message);
  }
});

/* ---- ustawienia: test połączenia i reguła CORS ---- */

const storageTestBtn = document.getElementById('storage-test-btn');
const storageTestResult = document.getElementById('storage-test-result');

function showStorageResult(kind, html) {
  if (!storageTestResult) return;
  // d-block: Tabler układa treść alertu w wiersz, a komunikat ma być pełnej szerokości.
  storageTestResult.className = `mt-3 alert alert-${kind} d-block`;
  storageTestResult.innerHTML = html;
}

storageTestBtn?.addEventListener('click', async () => {
  storageTestBtn.disabled = true;
  showStorageResult('info', 'Sprawdzam połączenie z magazynem…');
  try {
    const payload = await api('/api/storage/test', { method: 'POST', body: '{}' });
    showStorageResult('success', `Połączono z bucketem <code>${escapeHTML(payload.result.bucket)}</code> (${payload.result.tookMs} ms).`);
  } catch (error) {
    showStorageResult('danger', escapeHTML(error.message));
  } finally {
    storageTestBtn.disabled = false;
  }
});


// Fotograf ma w nagłówku skrót do wysyłki — prowadzi do biblioteki zdjęć.
document.getElementById('new-action')?.addEventListener('click', (event) => {
  if (document.body.dataset.role !== 'photographer') return;
  event.preventDefault();
  showView('library');
});

/* ---- kontrola wersji ----
   Przy każdym wdrożeniu wracało pytanie „czy przeglądarka na pewno ma nowy
   skrypt?". Panel odpowiada na nie sam: porównuje wersję, którą wysłał serwer,
   z wersją skryptu, który faktycznie się wykonuje. */

const APP_BUILD = '2026-08-31-magazyn-3';

(() => {
  const buildEl = document.getElementById('app-build');
  const scriptEl = document.getElementById('app-script');
  const hintEl = document.getElementById('app-build-hint');
  if (!buildEl) return;

  const src = document.querySelector('script[src*="/club/app.js"]')?.getAttribute('src') || '';
  const stamp = src.split('?v=')[1] || 'brak';

  buildEl.textContent = APP_BUILD;
  scriptEl.textContent = stamp;

  if (stamp === 'brak' || /^\d+$/.test(stamp)) {
    hintEl.className = 'd-block text-warning mt-1';
    hintEl.textContent = 'Serwer podaje stary adres skryptu — na serwerze nie ma jeszcze najnowszej wersji. '
      + 'Wykonaj git pull i pm2 restart zastal-marketing-center.';
  }
})();
