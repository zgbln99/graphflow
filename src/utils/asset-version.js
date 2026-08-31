/**
 * Znacznik wersji plików statycznych.
 *
 * Ręczne podbijanie "?v=" w widokach kończyło się tym, że po wdrożeniu
 * przeglądarka trzymała starą wersję skryptu i nowe przyciski nie działały.
 * Znacznik liczymy z czasu modyfikacji pliku — zmienia się sam przy każdym
 * wdrożeniu, w którym plik faktycznie się zmienił.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', '..', 'public');
// W produkcji pliki nie zmieniają się w trakcie życia procesu (pm2 restartuje
// aplikację po wdrożeniu), więc wystarczy policzyć znacznik raz.
const cache = process.env.NODE_ENV === 'production' ? new Map() : null;

function stamp(relativePath) {
  try {
    const stats = fs.statSync(path.join(publicDir, relativePath.replace(/^\//, '')));
    return Math.round(stats.mtimeMs).toString(36);
  } catch {
    return '0';
  }
}

function asset(relativePath) {
  if (!cache) return `${relativePath}?v=${stamp(relativePath)}`;
  if (!cache.has(relativePath)) cache.set(relativePath, `${relativePath}?v=${stamp(relativePath)}`);
  return cache.get(relativePath);
}

module.exports = asset;
