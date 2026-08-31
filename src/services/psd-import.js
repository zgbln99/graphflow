/**
 * Import szablonu z pliku PSD.
 *
 * Grafik pracuje w Photoshopie, a nie w naszym edytorze warstw. Zamiast
 * przepisywać układ ręcznie, czytamy go prosto z pliku: pozycje, rozmiary,
 * teksty i ich krój. Warstwy przeznaczone do edycji grafik oznacza znakiem „#"
 * w nazwie — reszta jest dekoracją i trafia do jednego, spłaszczonego obrazu.
 *
 * Spłaszczenie robi sam Photoshop (podgląd zapisywany w pliku), więc efekty
 * warstw, tryby mieszania i maski wyglądają dokładnie tak jak w oryginale.
 * Dlatego warstwy z „#" muszą być przed zapisem ukryte — inaczej ich treść
 * wtopiłaby się w tło na stałe.
 */

const { readPsd, initializeCanvas } = require('ag-psd');
const { PNG } = require('pngjs');

// ag-psd sięga po canvas wyłącznie po to, żeby utworzyć bufor pikseli.
// Podstawiamy własny, czysto javascriptowy — VPS nie musi kompilować cairo.
initializeCanvas(undefined, (width, height) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4)
}));

const EDITABLE_MARK = '#';
const MAX_DIMENSION = 8000;

class PsdImportError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'PsdImportError';
    this.status = 400;
    this.hint = hint;
  }
}

/** Nazwa warstwy → klucz pola: bez „#", bez polskich znaków, bez spacji. */
function fieldKey(name) {
  const text = String(name || '').replace(EDITABLE_MARK, '').trim().toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return /^[a-z]/.test(text) ? text : `pole_${text}`.slice(0, 40);
}

/** Etykieta w formularzu — nazwa warstwy bez znaku „#", w oryginalnym brzmieniu. */
function fieldLabel(name) {
  return String(name || '').replace(EDITABLE_MARK, '').trim().slice(0, 80) || 'Pole';
}

function isEditable(layer) {
  return String(layer.name || '').trim().startsWith(EDITABLE_MARK);
}

/** Photoshop trzyma kolor jako składowe 0–255; renderer oczekuje zapisu #rrggbb. */
function toHex(color) {
  if (!color) return '#ffffff';
  const channel = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)))
    .toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

const ALIGNMENTS = { left: 'left', center: 'center', right: 'right', justify: 'left' };

/** Rozkłada drzewo grup na płaską listę warstw, zachowując kolejność rysowania. */
function flatten(children, out = []) {
  (children || []).forEach((layer) => {
    if (layer.children && layer.children.length) {
      // Grupa oznaczona „#" liczy się jako jedna warstwa edytowalna (np. zdjęcie w masce).
      if (isEditable(layer)) out.push(layer);
      else flatten(layer.children, out);
    } else {
      out.push(layer);
    }
  });
  return out;
}

function bounds(layer, psd) {
  const left = Math.round(layer.left ?? 0);
  const top = Math.round(layer.top ?? 0);
  const width = Math.round((layer.right ?? psd.width) - left);
  const height = Math.round((layer.bottom ?? psd.height) - top);
  return { x: left, y: top, w: Math.max(1, width), h: Math.max(1, height) };
}

/**
 * Typ pola zgadujemy z samego pliku, żeby nie zmuszać grafika do nazywania
 * warstw według dodatkowego szyfru:
 *  - warstwa tekstowa → tekst, a gdy w środku są same cyfry → liczba (wyniki),
 *  - warstwa z „logo" lub „herb" w nazwie → logo (mieści się w całości),
 *  - pozostałe warstwy obrazowe → zdjęcie (wypełnia obszar).
 */
function inferKind(layer) {
  if (layer.text) {
    const content = String(layer.text.text || '').trim();
    return /^[0-9\s:\-]+$/.test(content) && content ? 'number' : 'text';
  }
  return /logo|herb|godlo|crest/i.test(String(layer.name || '')) ? 'logo' : 'photo';
}

function textLayerProps(layer, box) {
  const style = layer.text?.style || {};
  const paragraph = layer.text?.paragraphStyle || {};
  return {
    fontSize: Math.round(Math.max(6, Math.min(800, style.fontSize || Math.round(box.h * 0.8)))),
    color: toHex(style.fillColor),
    align: ALIGNMENTS[paragraph.justification] || 'left',
    // Photoshop podaje odstęp międzyliterowy w tysięcznych częściach firetu.
    letterSpacing: Math.round(((style.tracking || 0) / 1000) * (style.fontSize || 0)),
    uppercase: String(layer.text?.text || '') === String(layer.text?.text || '').toUpperCase()
  };
}

/**
 * Składa nieedytowalne warstwy w jeden obraz z przezroczystością.
 *
 * Podgląd zapisany w PSD odpada: Photoshop trzyma go bez kanału alfa, więc
 * miejsce na zdjęcie wyszłoby zamalowane. Składamy więc same warstwy — te mają
 * własną przezroczystość — rysując je od dołu do góry, tak jak robi to program
 * graficzny. Odwzorowujemy krycie warstwy i tryb „zwykły"; efekty i pozostałe
 * tryby mieszania zgłaszamy jako ostrzeżenie, bo ich tu nie policzymy.
 */
function compositeStaticLayers(psd, staticLayers) {
  const width = psd.width;
  const height = psd.height;
  const out = new Uint8ClampedArray(width * height * 4);

  staticLayers.forEach((layer) => {
    if (!layer.imageData) return;
    const alpha = layer.opacity ?? 1;
    if (alpha <= 0) return;

    const src = layer.imageData;
    const offsetX = Math.round(layer.left ?? 0);
    const offsetY = Math.round(layer.top ?? 0);

    for (let y = 0; y < src.height; y += 1) {
      const targetY = y + offsetY;
      if (targetY < 0 || targetY >= height) continue;

      for (let x = 0; x < src.width; x += 1) {
        const targetX = x + offsetX;
        if (targetX < 0 || targetX >= width) continue;

        const from = (y * src.width + x) * 4;
        const srcAlpha = (src.data[from + 3] / 255) * alpha;
        if (srcAlpha <= 0) continue;

        const to = (targetY * width + targetX) * 4;
        const dstAlpha = out[to + 3] / 255;
        const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

        for (let channel = 0; channel < 3; channel += 1) {
          out[to + channel] = (src.data[from + channel] * srcAlpha
            + out[to + channel] * dstAlpha * (1 - srcAlpha)) / outAlpha;
        }
        out[to + 3] = outAlpha * 255;
      }
    }
  });

  const png = new PNG({ width, height });
  png.data = Buffer.from(out);
  return { png: PNG.sync.write(png), pixels: out };
}

/** Czego nie odtworzymy przy składaniu — mówimy wprost, zamiast cicho zmieniać wygląd. */
function unsupportedFeatures(staticLayers) {
  const problems = [];
  staticLayers.forEach((layer) => {
    if (layer.blendMode && layer.blendMode !== 'normal') {
      problems.push(`„${layer.name}" ma tryb mieszania „${layer.blendMode}"`);
    }
    if (layer.effects && Object.keys(layer.effects).length) {
      problems.push(`„${layer.name}" ma efekty warstwy (cień, obrys, poświata)`);
    }
    if (layer.mask) problems.push(`„${layer.name}" ma maskę warstwy`);
  });
  return problems;
}

/**
 * Sprawdza, czy pod warstwą zdjęcia jest przezroczyste tło. Gdyby nie było,
 * spłaszczona grafika zasłoniłaby zdjęcie i szablon wyglądałby na zepsuty,
 * a przyczyna byłaby nie do odgadnięcia z poziomu panelu.
 */
function photoAreaIsTransparent(psd, pixels, box) {
  const width = psd.width;
  const data = pixels;
  const step = Math.max(1, Math.round(Math.min(box.w, box.h) / 12));
  let opaque = 0;
  let checked = 0;

  for (let y = box.y; y < box.y + box.h; y += step) {
    for (let x = box.x; x < box.x + box.w; x += step) {
      if (x < 0 || y < 0 || x >= psd.width || y >= psd.height) continue;
      checked += 1;
      if (data[(y * width + x) * 4 + 3] > 24) opaque += 1;
    }
  }
  return checked === 0 || opaque / checked < 0.5;
}

/**
 * Czyta PSD i buduje z niego szablon.
 * @returns {{ name, width, height, definition, composite, warnings }}
 */
function importTemplate(buffer, { name = 'Szablon z PSD' } = {}) {
  let psd;
  try {
    psd = readPsd(buffer, { useImageData: true, skipThumbnail: true });
  } catch (error) {
    throw new PsdImportError(`Nie udało się odczytać pliku PSD: ${error.message}`);
  }

  if (!psd.width || !psd.height || psd.width > MAX_DIMENSION || psd.height > MAX_DIMENSION) {
    throw new PsdImportError(`Nieobsługiwany rozmiar dokumentu: ${psd.width}×${psd.height}.`);
  }

  const layers = flatten(psd.children);
  const editable = layers.filter(isEditable);
  if (!editable.length) {
    throw new PsdImportError(
      'W pliku nie ma ani jednej warstwy do edycji.',
      'Dopisz „#" na początku nazwy każdej warstwy, którą ma wypełniać social media — np. „#Zdjęcie zawodnika”.'
    );
  }

  const warnings = [];
  const visibleEditable = editable.filter((layer) => !layer.hidden);
  if (visibleEditable.length) {
    warnings.push(
      `Przed zapisem PSD ukryj warstwy do edycji — widoczne zostały wtopione w grafikę: `
      + visibleEditable.map((layer) => fieldLabel(layer.name)).join(', ') + '.'
    );
  }

  const staticLayers = layers.filter((layer) => !isEditable(layer) && !layer.hidden);
  if (!staticLayers.length) {
    throw new PsdImportError(
      'W pliku nie ma żadnej widocznej warstwy z grafiką.',
      'Warstwy z „#" to miejsca do wypełnienia; sama grafika (tło, pasek, ramka) musi zostać widoczna.'
    );
  }

  const unsupported = unsupportedFeatures(staticLayers);
  if (unsupported.length) {
    warnings.push(
      'Nie odtworzymy przy składaniu: ' + unsupported.join('; ')
      + '. Scal te warstwy w Photoshopie (Warstwa → Rasteryzuj → Styl warstwy, potem scal), '
      + 'żeby grafika wyglądała identycznie.'
    );
  }

  const { png: composite, pixels } = compositeStaticLayers(psd, staticLayers);
  const fields = [];
  const templateLayers = [];
  const usedKeys = new Set();

  // Zdjęcia leżą pod spłaszczoną grafiką, teksty i logo nad nią.
  const OVERLAY_Z = 100;
  let photoZ = 1;
  let frontZ = OVERLAY_Z + 1;

  editable.forEach((layer) => {
    const box = bounds(layer, psd);
    const kind = inferKind(layer);

    let key = fieldKey(layer.name);
    while (usedKeys.has(key)) key = `${key}_2`.slice(0, 40);
    usedKeys.add(key);

    fields.push({
      key,
      label: fieldLabel(layer.name),
      type: kind === 'logo' || kind === 'photo' ? 'photo' : kind,
      required: kind === 'photo'
    });

    if (kind === 'photo' || kind === 'logo') {
      if (kind === 'photo' && !photoAreaIsTransparent(psd, pixels, box)) {
        warnings.push(
          `Pod warstwą „${fieldLabel(layer.name)}" jest nieprzezroczyste tło — zdjęcie będzie zasłonięte. `
          + 'Usuń albo ukryj warstwy leżące pod nią.'
        );
      }
      templateLayers.push({
        id: key,
        name: fieldLabel(layer.name),
        type: kind,
        field: key,
        ...box,
        z: kind === 'photo' ? photoZ++ : frontZ++,
        visible: true,
        fit: kind === 'logo' ? 'contain' : 'cover',
        mask: 'rect'
      });
      return;
    }

    templateLayers.push({
      id: key,
      name: fieldLabel(layer.name),
      type: 'text',
      field: key,
      ...box,
      z: frontZ++,
      visible: true,
      ...textLayerProps(layer, box)
    });
  });

  templateLayers.push({
    id: 'psd_grafika',
    name: 'Grafika z PSD',
    type: 'overlay',
    x: 0,
    y: 0,
    w: psd.width,
    h: psd.height,
    z: OVERLAY_Z,
    visible: true,
    locked: true
  });

  return {
    name: String(name).trim().slice(0, 160),
    width: psd.width,
    height: psd.height,
    definition: { fields, layers: templateLayers },
    composite,
    warnings
  };
}

module.exports = { importTemplate, PsdImportError, fieldKey };
