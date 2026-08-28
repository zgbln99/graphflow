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
  match: 'Zastal — Anwil',
  editor: 'Edytor grafiki',
  other: 'Inne grafiki',
  social: 'Monitoring social',
  templates: 'Szablony',
  library: 'Biblioteka zdjęć',
  history: 'Historia eksportów',
  settings: 'Ustawienia'
};
const viewContext = {
  match: 'Mecz · 27.09.2026',
  editor: 'Mecz · Final Score'
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
}

document.querySelectorAll('[data-view]').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    showView(el.dataset.view);
  });
});

/* ---------------- Grafiki meczowe ---------------- */
const graphics = [
  { name: 'Matchday', ready: true }, { name: 'Starting Five', ready: true },
  { name: 'Q1', ready: true }, { name: 'Halftime', ready: true },
  { name: 'Q3', ready: false }, { name: 'Final Score', ready: false },
  { name: 'MVP', ready: false }, { name: 'Player Stats', ready: false }
];
const graphicGrid = document.getElementById('graphic-grid');
graphics.forEach((graphic) => {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-xl-3';
  col.innerHTML = `
    <div class="card card-sm cursor-pointer">
      <div class="thumb-45"></div>
      <div class="card-body p-2 d-flex align-items-center justify-content-between">
        <span class="text-truncate">${escapeHTML(graphic.name)}</span>
        <span class="badge ${graphic.ready ? 'bg-green-lt' : 'bg-secondary-lt'}">${graphic.ready ? 'Gotowe' : 'Do zrobienia'}</span>
      </div>
    </div>`;
  col.addEventListener('click', () => {
    state.currentTemplate = graphic.name === 'Final Score' ? 'final' : 'matchday';
    renderEditor();
    showView('editor');
  });
  graphicGrid?.appendChild(col);
});

/* ---------------- Pola dynamiczne szablonu ---------------- */
function renderDynamicFields() {
  const root = document.getElementById('dynamic-fields');
  if (!root) return;
  const template = state.templates.find((item) => item.id === state.currentTemplate);
  const nameNode = document.getElementById('editor-template-name');
  if (nameNode) nameNode.textContent = template.name;
  root.innerHTML = '';

  template.fields.forEach((field) => {
    const wrap = document.createElement('div');
    wrap.className = 'mb-3';
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = field.label;
    wrap.appendChild(label);

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-select';
      field.options.forEach((option) => input.add(new Option(option, option)));
      input.value = field.value;
    } else if (field.type === 'photo') {
      input = document.createElement('button');
      input.type = 'button';
      input.className = 'btn w-100';
      input.textContent = 'Wybierz z folderów meczu';
    } else {
      input = document.createElement('input');
      input.className = 'form-control';
      input.type = field.type === 'number' ? 'number' : 'text';
      input.value = field.value;
    }
    if (input.tagName !== 'BUTTON') {
      input.addEventListener('input', (event) => {
        field.value = event.target.value;
        drawCanvas();
      });
    }
    wrap.appendChild(input);
    root.appendChild(wrap);
  });
}

/* ---------------- Zdjęcia ---------------- */
function photoTile(file, extraClass = '') {
  const col = document.createElement('div');
  col.className = 'col-4';
  col.innerHTML = `<div class="photo-tile ${extraClass}" title="${escapeHTML(file || '')}"></div>`;
  return col;
}

const photoGrid = document.getElementById('photo-grid');
for (let i = 4231; i < 4255; i += 1) {
  const file = 'IMG_' + i;
  const col = photoTile(file);
  col.querySelector('.photo-tile').addEventListener('click', (event) => {
    document.querySelectorAll('#photo-grid .photo-tile').forEach((tile) => tile.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    const template = state.templates.find((item) => item.id === state.currentTemplate);
    const field = template.fields.find((item) => item.type === 'photo');
    if (field) field.value = file;
    drawCanvas();
  });
  photoGrid?.appendChild(col);
}

const libraryGrid = document.getElementById('library-grid');
for (let i = 0; i < 24; i += 1) {
  const col = photoTile('', 'photo-tile-43');
  col.className = 'col-6 col-md-3 col-xl-2';
  libraryGrid?.appendChild(col);
}

/* ---------------- Podgląd na płótnie ---------------- */
function drawCanvas() {
  const canvas = document.getElementById('design-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const template = state.templates.find((item) => item.id === state.currentTemplate);
  const photo = template.fields.find((item) => item.type === 'photo');
  const home = template.fields.find((item) => item.key === 'home_score');
  const away = template.fields.find((item) => item.key === 'away_score');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b0d0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111917';
  ctx.fillRect(70, 110, canvas.width - 140, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6f7a77';
  ctx.font = '16px sans-serif';
  ctx.fillText(photo ? photo.value : 'PHOTO', canvas.width / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(template.name.toUpperCase(), canvas.width / 2, 80);

  if (home && away) {
    ctx.font = 'bold 88px sans-serif';
    ctx.fillText(String(home.value), 165, 585);
    ctx.fillText(String(away.value), 375, 585);
    ctx.fillStyle = '#0d8f4f';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('VS', 270, 575);
  }
  ctx.strokeStyle = '#0d8f4f';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  ctx.fillStyle = '#c9d1ce';
  ctx.font = '14px sans-serif';
  ctx.fillText('27.09.2026 · HALA CRS, ZIELONA GÓRA', canvas.width / 2, 635);
}

function renderEditor() {
  renderDynamicFields();
  drawCanvas();
}

/* ---------------- Szablony i warstwy ---------------- */
function renderTemplates() {
  const list = document.getElementById('template-list');
  if (!list) return;
  list.innerHTML = '';
  state.templates.forEach((template) => {
    const row = document.createElement('a');
    row.href = '#';
    row.className = 'list-group-item list-group-item-action d-flex align-items-center'
      + (template.id === state.currentTemplate ? ' active' : '');
    row.innerHTML = `
      <div class="flex-fill">
        <div>${escapeHTML(template.name)}</div>
        <div class="text-secondary small">${escapeHTML(template.category)} · ${escapeHTML(template.size)}</div>
      </div>
      ${icon('chevron', 'text-secondary')}`;
    row.addEventListener('click', (event) => {
      event.preventDefault();
      state.currentTemplate = template.id;
      state.selectedLayer = template.layers[0]?.id;
      renderTemplates();
      renderEditor();
    });
    list.appendChild(row);
  });
  renderLayers();
}

function renderLayers() {
  const template = state.templates.find((item) => item.id === state.currentTemplate);
  const root = document.getElementById('layers-list');
  if (!root) return;
  root.innerHTML = '';
  [...template.layers].sort((a, b) => b.z - a.z).forEach((layer) => {
    const row = document.createElement('a');
    row.href = '#';
    row.className = 'list-group-item list-group-item-action d-flex align-items-center'
      + (layer.id === state.selectedLayer ? ' active' : '');
    row.innerHTML = `
      <span class="text-secondary me-2">${icon('grip')}</span>
      <div class="flex-fill">
        <div>${escapeHTML(layer.name)}</div>
        <div class="text-secondary small">${escapeHTML(layer.type)}${layer.field ? ' · ' + escapeHTML(layer.field) : ''}</div>
      </div>
      <span class="text-secondary">${icon(layer.locked ? 'lock' : 'eye')}</span>`;
    row.addEventListener('click', (event) => {
      event.preventDefault();
      state.selectedLayer = layer.id;
      renderLayers();
    });
    root.appendChild(row);
  });
  renderLayerProps();
}

function renderLayerProps() {
  const template = state.templates.find((item) => item.id === state.currentTemplate);
  const layer = template.layers.find((item) => item.id === state.selectedLayer);
  const root = document.getElementById('layer-properties');
  if (!root) return;
  if (!layer) {
    root.innerHTML = '<p class="text-secondary mb-0">Wybierz warstwę z listy.</p>';
    return;
  }
  root.innerHTML = `
    <div class="mb-3"><label class="form-label">Nazwa</label>
      <input class="form-control" id="lp-name" value="${escapeHTML(layer.name)}"></div>
    <div class="mb-3"><label class="form-label">Typ</label>
      <select class="form-select" id="lp-type">
        ${['background', 'photo', 'text', 'overlay', 'logo', 'shape']
          .map((type) => `<option ${type === layer.type ? 'selected' : ''}>${type}</option>`).join('')}
      </select></div>
    <div class="mb-3"><label class="form-label">Warstwa (z-index)</label>
      <input class="form-control" type="number" id="lp-z" value="${layer.z}"></div>
    <label class="form-check form-switch">
      <input class="form-check-input" type="checkbox" id="lp-visible" ${layer.visible ? 'checked' : ''}>
      <span class="form-check-label">Widoczna</span></label>
    <label class="form-check form-switch">
      <input class="form-check-input" type="checkbox" id="lp-locked" ${layer.locked ? 'checked' : ''}>
      <span class="form-check-label">Zablokowana dla social media</span></label>
    ${layer.type === 'photo' ? `
      <label class="form-check form-switch">
        <input class="form-check-input" type="checkbox" checked>
        <span class="form-check-label">Kadrowanie w masce</span></label>
      <div class="mt-3"><label class="form-label">Tryb dopasowania</label>
        <select class="form-select"><option>cover</option><option>contain</option></select></div>` : ''}`;

  root.querySelector('#lp-name').oninput = (event) => { layer.name = event.target.value; };
  root.querySelector('#lp-type').onchange = (event) => { layer.type = event.target.value; renderLayers(); };
  root.querySelector('#lp-z').oninput = (event) => { layer.z = Number(event.target.value); renderLayers(); };
  root.querySelector('#lp-visible').onchange = (event) => { layer.visible = event.target.checked; };
  root.querySelector('#lp-locked').onchange = (event) => { layer.locked = event.target.checked; };
}

document.getElementById('add-layer')?.addEventListener('click', () => {
  const template = state.templates.find((item) => item.id === state.currentTemplate);
  const id = 'layer_' + Date.now();
  template.layers.push({ id, name: 'Nowa warstwa', type: 'photo', locked: false, visible: true, z: template.layers.length + 1 });
  state.selectedLayer = id;
  renderLayers();
});

document.getElementById('create-template')?.addEventListener('click', () => {
  const id = 'template_' + Date.now();
  state.templates.push({
    id, name: 'Nowy szablon', category: 'Mecz', size: '1080×1350', fields: [],
    layers: [
      { id: 'overlay', name: 'Overlay PNG', type: 'overlay', locked: true, visible: true, z: 2 },
      { id: 'photo', name: 'Zdjęcie', type: 'photo', locked: false, visible: true, z: 1 }
    ]
  });
  state.currentTemplate = id;
  state.selectedLayer = 'photo';
  renderTemplates();
});

/* ---------------- Inne grafiki i historia ---------------- */
const otherGrid = document.getElementById('other-grid');
['Urodziny', 'Transfer', 'Nowy sponsor', 'Komunikat klubowy', 'MVP miesiąca', 'Kontuzja'].forEach((name) => {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-xl-3';
  col.innerHTML = `
    <div class="card card-sm cursor-pointer">
      <div class="thumb-1610"></div>
      <div class="card-body p-2">
        <div class="text-truncate">${escapeHTML(name)}</div>
        <div class="text-secondary small">Szablon dynamiczny</div>
      </div>
    </div>`;
  otherGrid?.appendChild(col);
});

const historyBody = document.getElementById('history-body');
[
  ['Final Score', 'Zastal — Anwil', '27.09.2026 19:32', 'PNG 1080×1350'],
  ['Halftime', 'Zastal — Anwil', '27.09.2026 18:45', 'PNG 1080×1920'],
  ['Matchday', 'Zastal — Anwil', '27.09.2026 12:10', 'PNG 1080×1350'],
  ['Urodziny', 'Piotr Nowak', '26.09.2026 08:00', 'PNG 1080×1080']
].forEach((row) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><span class="d-block rounded border" style="width:44px;height:32px"></span></td>
    <td>${escapeHTML(row[0])}</td>
    <td class="text-secondary">${escapeHTML(row[1])}</td>
    <td class="text-secondary text-nowrap">${escapeHTML(row[2])}</td>
    <td class="text-secondary">${escapeHTML(row[3])}</td>
    <td class="text-secondary">${escapeHTML(document.querySelector('.navbar-vertical .flex-fill .text-truncate')?.textContent.trim() || 'Użytkownik')}</td>`;
  historyBody?.appendChild(tr);
});

renderTemplates();
renderEditor();


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
