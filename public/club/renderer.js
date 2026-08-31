/**
 * Silnik rysujący szablon na płótnie.
 *
 * Ten sam kod obsługuje podgląd i eksport — różni je wyłącznie skala. Rysujemy
 * zawsze w układzie współrzędnych szablonu (np. 1080×1350), a skalowanie robi
 * transformacja płótna. Dzięki temu eksport ma natywną rozdzielczość szablonu
 * niezależnie od wielkości podglądu (§15).
 *
 * Kolejność rysowania wynika z pola z warstwy — overlay z przezroczystością
 * leży nad zdjęciem, zdjęcie nad tłem (§9).
 */
(function (global) {
  'use strict';

  const imageCache = new Map();

  /** Adresem obrazka jest tylko ścieżka, URL albo data: — nie dowolny tekst z formularza. */
  function isImageUrl(value) {
    return typeof value === 'string'
      && (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:'));
  }

  /** Wyciąga adres i kadrowanie z wartości pola zdjęcia. */
  function photoValue(value) {
    if (value && typeof value === 'object') {
      return { url: isImageUrl(value.url) ? value.url : null, crop: value.crop || {} };
    }
    return { url: isImageUrl(value) ? value : null, crop: {} };
  }

  /** Ładuje obrazek raz i trzyma go w pamięci podręcznej. */
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) return imageCache.get(src);

    const promise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
    imageCache.set(src, promise);
    return promise;
  }

  /** Zbiera adresy wszystkich obrazków potrzebnych do narysowania szablonu. */
  function collectSources(template, values, assetsById) {
    const sources = [];
    (template.definition.layers || []).forEach((layer) => {
      if (layer.asset_id && assetsById[layer.asset_id]) sources.push(assetsById[layer.asset_id].object_key);
      if (layer.type === 'photo' && layer.field) {
        const { url } = photoValue(values[layer.field]);
        if (url) sources.push(url);
      }
    });
    return [...new Set(sources)];
  }

  function roundedPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function clipToLayer(ctx, layer) {
    if (layer.mask === 'circle') {
      ctx.beginPath();
      ctx.ellipse(layer.x + layer.w / 2, layer.y + layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
    } else {
      roundedPath(ctx, layer.x, layer.y, layer.w, layer.h, layer.radius || 0);
    }
    ctx.clip();
  }

  /**
   * Wpasowuje obrazek w obszar warstwy. Zwraca prostokąt źródłowy i docelowy
   * z uwzględnieniem kadrowania użytkownika (przesunięcie i powiększenie),
   * które zawsze zostaje w obrębie maski wyznaczonej przez grafika (§11).
   */
  function fitImage(image, layer, crop) {
    const zoom = Math.max(1, Number(crop.zoom) || 1);
    const scale = (layer.fit === 'contain'
      ? Math.min(layer.w / image.width, layer.h / image.height)
      : Math.max(layer.w / image.width, layer.h / image.height)) * zoom;

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    // Przesunięcie w zakresie -1..1 mapujemy na nadmiar obrazu poza maską.
    const offsetX = ((Number(crop.x) || 0) * (drawWidth - layer.w)) / 2;
    const offsetY = ((Number(crop.y) || 0) * (drawHeight - layer.h)) / 2;

    return {
      x: layer.x + (layer.w - drawWidth) / 2 - offsetX,
      y: layer.y + (layer.h - drawHeight) / 2 - offsetY,
      w: drawWidth,
      h: drawHeight
    };
  }

  function drawText(ctx, layer, rawValue) {
    const text = String(rawValue ?? layer.text ?? '');
    if (!text) return;
    const content = layer.uppercase ? text.toUpperCase() : text;

    ctx.fillStyle = layer.color || '#ffffff';
    ctx.font = `${layer.fontWeight || 700} ${layer.fontSize || 64}px "ZT Talk Expanded", "ZT Talk", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = layer.align === 'center' ? 'center' : (layer.align === 'right' ? 'right' : 'left');
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${layer.letterSpacing || 0}px`;

    const anchorX = layer.align === 'center'
      ? layer.x + layer.w / 2
      : (layer.align === 'right' ? layer.x + layer.w : layer.x);

    // Łamanie wierszy do szerokości warstwy — tekst nie wychodzi poza obszar grafika.
    const lineHeight = (layer.fontSize || 64) * (layer.lineHeight || 1.1);
    const lines = [];
    content.split('\n').forEach((paragraph) => {
      let line = '';
      paragraph.split(' ').forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > layer.w && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      lines.push(line);
    });

    lines.forEach((line, index) => ctx.fillText(line, anchorX, layer.y + index * lineHeight));
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function drawPlaceholder(ctx, layer, label) {
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = '500 28px "ZT Talk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, layer.x + layer.w / 2, layer.y + layer.h / 2);
  }

  /**
   * Rysuje szablon na płótnie.
   * @param {HTMLCanvasElement} canvas płótno o wymiarach szablonu (lub przeskalowane)
   * @param {object} template szablon z definition.layers
   * @param {object} values wartości pól dynamicznych (klucz → wartość lub {url, crop})
   * @param {Array} assets zasoby szablonu
   * @param {object} options { placeholders: boolean }
   */
  async function render(canvas, template, values = {}, assets = [], options = {}) {
    const { width, height } = template;
    const ctx = canvas.getContext('2d');
    const assetsById = {};
    assets.forEach((asset) => { assetsById[asset.id] = asset; });

    await Promise.all(collectSources(template, values, assetsById).map(loadImage));

    const scale = canvas.width / width;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const layers = [...(template.definition.layers || [])].sort((a, b) => a.z - b.z);
    for (const layer of layers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      if (layer.rotation) {
        const cx = layer.x + layer.w / 2;
        const cy = layer.y + layer.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      const asset = layer.asset_id ? assetsById[layer.asset_id] : null;
      const assetImage = asset ? await loadImage(asset.object_key) : null;

      if (layer.type === 'background') {
        if (assetImage) {
          ctx.drawImage(assetImage, layer.x, layer.y, layer.w, layer.h);
        } else {
          ctx.fillStyle = layer.color || '#111111';
          roundedPath(ctx, layer.x, layer.y, layer.w, layer.h, layer.radius || 0);
          ctx.fill();
        }
      } else if (layer.type === 'shape') {
        ctx.fillStyle = layer.color || '#111111';
        roundedPath(ctx, layer.x, layer.y, layer.w, layer.h, layer.radius || 0);
        ctx.fill();
      } else if (layer.type === 'photo') {
        const { url, crop } = photoValue(layer.field ? values[layer.field] : null);
        const photo = url ? await loadImage(url) : null;

        ctx.save();
        clipToLayer(ctx, layer);
        if (photo) {
          const box = fitImage(photo, layer, crop);
          ctx.drawImage(photo, box.x, box.y, box.w, box.h);
        } else if (options.placeholders !== false) {
          drawPlaceholder(ctx, layer, layer.name || 'Zdjęcie');
        }
        ctx.restore();
      } else if (layer.type === 'overlay' || layer.type === 'logo') {
        if (assetImage) {
          ctx.drawImage(assetImage, layer.x, layer.y, layer.w, layer.h);
        } else if (options.placeholders !== false) {
          ctx.save();
          roundedPath(ctx, layer.x, layer.y, layer.w, layer.h, 0);
          drawPlaceholder(ctx, layer, `${layer.name} — brak pliku`);
          ctx.restore();
        }
      } else if (layer.type === 'text') {
        drawText(ctx, layer, layer.field ? values[layer.field] : null);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  global.ZmcRenderer = { render, loadImage };
})(window);
