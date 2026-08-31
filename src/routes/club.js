const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const Database = require('../config/database');
const {
  IntegrationError,
  getIntegrationStatus,
  fetchFacebookOverview,
  analyzeFacebookOverview,
  getCachedState
} = require('../services/social-intelligence');
const repo = require('../services/club-repository');
const storage = require('../services/storage');
const psdImport = require('../services/psd-import');

const router = express.Router();
const db = Database.getInstance();

const brandingDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'branding');
fs.mkdirSync(brandingDir, { recursive: true });

// Katalog przelotowy: pliki leżą tu tylko na czas strumieniowania do bucketa.
const tmpDir = path.join(os.tmpdir(), 'zmc-uploads');
fs.mkdirSync(tmpDir, { recursive: true });

// Pliki szablonów sprzed przeniesienia do magazynu leżą jeszcze tutaj —
// katalog zostaje, żeby stare szablony dalej się rysowały.
const templateDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'templates');
fs.mkdirSync(templateDir, { recursive: true });

const uploadTemplateAsset = multer({
  storage: multer.diskStorage({ destination: tmpDir }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Dozwolone formaty: PNG, JPG, WEBP, SVG.'));
    cb(null, true);
  }
});

const upload = multer({
  storage: multer.diskStorage({ destination: tmpDir }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Dozwolone formaty: PNG, JPG, WEBP, SVG.'));
    cb(null, true);
  }
});

function requireAuth(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') return next();
  return res.status(403).send('Brak uprawnień.');
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.session?.user?.role)) return next();
    return res.status(403).json({ success: false, error: 'Brak uprawnień do tej operacji.' });
  };
}

// Błędy walidacji z repozytorium wracają jako 400 z nazwą pola, żeby formularz
// mógł podświetlić konkretny input; reszta idzie do globalnej obsługi błędów.
function handleRepoError(res, next, error) {
  if (error instanceof repo.ValidationError) {
    return res.status(error.status || 400).json({ success: false, error: error.message, field: error.field });
  }
  // Błędy magazynu niosą własny status (503 = brak konfiguracji, 502 = problem po stronie S3).
  if (error instanceof storage.StorageError) {
    return res.status(error.status || 502).json({ success: false, error: error.message, code: error.code });
  }
  return next(error);
}

function integrationErrorResponse(res, error) {
  const status = error instanceof IntegrationError ? error.status : 500;
  return res.status(status).json({
    success: false,
    code: error.code || 'SOCIAL_INTEGRATION_ERROR',
    error: error.message || 'Nie udało się pobrać danych integracji.'
  });
}

async function getSetting(key, fallback = null) {
  const row = await db.fetch(
    'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
    [key]
  );
  return row?.setting_value || fallback;
}

async function getBranding() {
  return {
    logoUrl: brandingLogoUrl(await getSetting('brand_logo_url')),
    // Nazwa klubu służy do wyróżnienia naszej drużyny w parze meczowej.
    clubName: await getSetting('club_name', 'Zastal')
  };
}

router.get('/login', async (req, res, next) => {
  try {
    if (req.session?.user?.id) return res.redirect('/');
    const branding = await getBranding();
    res.render('club/login', {
      title: 'Logowanie — ZASTAL MARKETING CENTER',
      error: null,
      branding
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const branding = await getBranding();

    if (!email || !password) {
      return res.status(400).render('club/login', {
        title: 'Logowanie — ZASTAL MARKETING CENTER',
        error: 'Podaj adres e-mail i hasło.',
        branding
      });
    }

    const user = await db.fetch(
      `SELECT id, email, password_hash, display_name, role, is_active
       FROM cg_users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).render('club/login', {
        title: 'Logowanie — ZASTAL MARKETING CENTER',
        error: 'Nieprawidłowy e-mail lub hasło.',
        branding
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      };
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect('/');
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('zmc_session');
    res.redirect('/login');
  });
});

/**
 * Logo klubu leży w magazynie razem z resztą plików. W bazie zapisujemy klucz
 * z przedrostkiem „s3:", a przeglądarce podajemy adres naszej trasy — dzięki
 * temu bucket zostaje prywatny, a ekran logowania i tak pokazuje logo.
 */
function brandingLogoUrl(settingValue) {
  if (!settingValue) return null;
  return settingValue.startsWith('s3:') ? '/branding/logo' : settingValue;
}

async function removeOldLogo(settingValue) {
  if (!settingValue) return;
  if (settingValue.startsWith('s3:')) {
    await storage.deleteObject(settingValue.slice(3)).catch(() => {});
    return;
  }
  if (settingValue.startsWith('/uploads/branding/')) {
    const oldPath = path.join(brandingDir, path.basename(settingValue));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
}

/**
 * Logo pokazuje się także na ekranie logowania, więc trasa jest dostępna bez
 * sesji. Trzymamy plik w pamięci procesu — to jeden mały obrazek, a bez tego
 * każde wejście na stronę logowania pukałoby do magazynu.
 */
let logoCache = null;

router.get('/branding/logo', async (req, res, next) => {
  try {
    const value = await getSetting('brand_logo_url');
    if (!value?.startsWith('s3:')) return res.status(404).end();

    const key = value.slice(3);
    if (!logoCache || logoCache.key !== key) {
      const object = await storage.getObjectStream(key);
      const chunks = [];
      for await (const chunk of object.body) chunks.push(chunk);
      logoCache = {
        key,
        body: Buffer.concat(chunks),
        contentType: object.contentType || storage.contentTypeFor(key)
      };
    }

    res.set({ 'Content-Type': logoCache.contentType, 'Cache-Control': 'public, max-age=300' });
    res.end(logoCache.body);
  } catch (err) { next(err); }
});

router.post('/admin/branding/logo', requireAuth, requireAdmin, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nie wybrano pliku.' });

    const key = `${storage.PREFIXES.branding}${Date.now().toString(36)}-${storage.safeFileName(req.file.originalname)}`;
    await storage.putObject(key, fs.createReadStream(req.file.path), {
      contentType: req.file.mimetype,
      contentLength: req.file.size
    });

    // W bazie trzymamy klucz w magazynie; adres do wyświetlenia składa getBranding().
    const logoUrl = `s3:${key}`;
    const current = await db.fetch(
      'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
      ['brand_logo_url']
    );

    await removeOldLogo(current?.setting_value);

    await db.query(
      `INSERT INTO cg_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      ['brand_logo_url', logoUrl]
    );

    logoCache = null;
    res.json({ success: true, logoUrl: brandingLogoUrl(logoUrl) });
  } catch (err) {
    handleRepoError(res, next, err);
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

router.delete('/admin/branding/logo', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const current = await db.fetch(
      'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
      ['brand_logo_url']
    );

    await removeOldLogo(current?.setting_value);
    logoCache = null;

    await db.query(
      'UPDATE cg_settings SET setting_value = NULL WHERE setting_key = ?',
      ['brand_logo_url']
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/api/social/status', requireAuth, (req, res) => {
  res.json({
    success: true,
    integrations: getIntegrationStatus(),
    cache: getCachedState()
  });
});

router.get('/api/social/overview', requireAuth, async (req, res) => {
  try {
    const overview = await fetchFacebookOverview();
    res.json({ success: true, overview, analysis: getCachedState().analysis });
  } catch (error) {
    integrationErrorResponse(res, error);
  }
});

router.post('/api/social/refresh', requireAuth, async (req, res) => {
  try {
    const overview = await fetchFacebookOverview({ force: true });
    res.json({ success: true, overview, analysis: getCachedState().analysis });
  } catch (error) {
    integrationErrorResponse(res, error);
  }
});

router.post('/api/social/analyze', requireAuth, async (req, res) => {
  try {
    const result = await analyzeFacebookOverview({ forceOverview: Boolean(req.body?.refresh) });
    res.json({ success: true, ...result });
  } catch (error) {
    integrationErrorResponse(res, error);
  }
});

/* ------------------------------- sezony i mecze ------------------------------ */

router.get('/api/seasons', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, seasons: await repo.listSeasons() });
  } catch (err) { next(err); }
});

router.post('/api/seasons', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.status(201).json({ success: true, season: await repo.createSeason(req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.patch('/api/seasons/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.json({ success: true, season: await repo.updateSeason(req.params.id, req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.post('/api/seasons/:id/activate', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.json({ success: true, season: await repo.activateSeason(req.params.id) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/seasons/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await repo.deleteSeason(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

router.get('/api/matches', requireAuth, async (req, res, next) => {
  try {
    const matches = await repo.listMatches({
      seasonId: req.query.season || null,
      status: req.query.status || null,
      search: req.query.q || null
    });
    res.json({ success: true, matches });
  } catch (err) { next(err); }
});

router.get('/api/matches/:id', requireAuth, async (req, res, next) => {
  try {
    const match = await repo.getMatch(req.params.id);
    if (!match) return res.status(404).json({ success: false, error: 'Nie znaleziono meczu.' });
    res.json({ success: true, match });
  } catch (err) { next(err); }
});

router.post('/api/matches', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.status(201).json({ success: true, match: await repo.createMatch(req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.patch('/api/matches/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.json({ success: true, match: await repo.updateMatch(req.params.id, req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/matches/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await repo.deleteMatch(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/* ---------------------------- szablony i materiały --------------------------- */

router.get('/api/templates', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, templates: await repo.listTemplates({ category: req.query.category || null }) });
  } catch (err) { next(err); }
});

router.get('/api/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const template = await repo.getTemplate(req.params.id, { withAssets: true });
    if (!template) return res.status(404).json({ success: false, error: 'Nie znaleziono szablonu.' });
    res.json({ success: true, template });
  } catch (err) { next(err); }
});

router.post('/api/templates', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    const template = await repo.createTemplate(req.body || {}, req.session.user.id);
    res.status(201).json({ success: true, template });
  } catch (err) { handleRepoError(res, next, err); }
});

router.patch('/api/templates/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    res.json({ success: true, template: await repo.updateTemplate(req.params.id, req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/templates/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    await repo.deleteTemplate(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

router.get('/api/matches/:id/materials', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, materials: await repo.getMatchMaterials(req.params.id) });
  } catch (err) { next(err); }
});

router.post('/api/matches/:id/materials', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    const material = await repo.addMatchMaterial(req.params.id, req.body || {});
    res.status(201).json({ success: true, material });
  } catch (err) { handleRepoError(res, next, err); }
});

// Social media oznacza materiał jako gotowy, ale nie zmienia terminów ani przypisań.
router.patch('/api/materials/:id', requireAuth, requireRole('admin', 'designer', 'social'), async (req, res, next) => {
  try {
    const payload = req.session.user.role === 'social'
      ? { status: (req.body || {}).status }
      : (req.body || {});
    res.json({ success: true, material: await repo.updateMatchMaterial(req.params.id, payload) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/materials/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    await repo.deleteMatchMaterial(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Buduje szablon z zawartości pliku PSD.
 *
 * @param buffer      zawartość pliku
 * @param fileName    nazwa źródłowa (do nazwy szablonu i etykiet)
 * @param sourceKey   klucz pliku PSD w magazynie, jeśli już tam leży
 * @param sourceStream funkcja zwracająca strumień do zapisania pliku w magazynie
 */
async function buildTemplateFromPsd({ buffer, fileName, category, userId, sourceKey = null, sourceStream = null }) {
  const parsed = psdImport.importTemplate(buffer, {
    name: path.basename(fileName, path.extname(fileName))
  });

  const uploadedKeys = [];
  try {
    // Nazwę bierzemy z pliku, więc kolizja nie jest winą użytkownika —
    // dokładamy numer zamiast odsyłać go z błędem.
    const template = await createTemplateWithFreeName({
      name: parsed.name,
      category: category === 'other' ? 'other' : 'match',
      width: parsed.width,
      height: parsed.height,
      definition: parsed.definition
    }, userId);

    const stamp = Date.now().toString(36);
    const overlayKey = `${storage.PREFIXES.templates}${template.id}/${stamp}-grafika.png`;
    await storage.putObject(overlayKey, parsed.composite, {
      contentType: 'image/png',
      contentLength: parsed.composite.length
    });
    uploadedKeys.push(overlayKey);

    // Plik źródłowy zostaje w magazynie — bez niego powrót do oryginału
    // znaczyłby szukanie po dyskach grafika. Gdy już tam leży, nie kopiujemy go.
    let psdKey = sourceKey;
    if (!psdKey && sourceStream) {
      psdKey = `${storage.PREFIXES.templates}${template.id}/${stamp}-${storage.safeFileName(fileName)}`;
      const { stream, size } = sourceStream();
      await storage.putObject(psdKey, stream, {
        contentType: 'image/vnd.adobe.photoshop',
        contentLength: size
      });
      uploadedKeys.push(psdKey);
    }
    if (psdKey) {
      await repo.addTemplateAsset(template.id, {
        kind: 'source',
        objectKey: psdKey,
        metadata: { originalName: fileName }
      });
    }

    const asset = await repo.addTemplateAsset(template.id, {
      kind: 'overlay',
      objectKey: overlayKey,
      metadata: { source: 'psd', originalName: fileName }
    });

    // Warstwa nakładki wskazuje na dopiero co utworzony plik.
    await repo.updateTemplate(template.id, {
      definition: {
        ...parsed.definition,
        layers: parsed.definition.layers.map((layer) => (layer.id === 'psd_grafika'
          ? { ...layer, asset_id: asset.id }
          : layer))
      }
    });

    return {
      // Z zasobami, żeby podgląd zaraz po imporcie pokazał grafikę, a nie ramkę „brak pliku".
      template: await repo.getTemplate(template.id, { withAssets: true }),
      warnings: parsed.warnings,
      summary: { fields: parsed.definition.fields.length, size: `${parsed.width}×${parsed.height}` }
    };
  } catch (error) {
    // Nieudany import nie ma zostawiać śmieci w magazynie.
    uploadedKeys.forEach((key) => storage.deleteObject(key).catch(() => {}));
    throw error;
  }
}

function psdErrorResponse(res, next, error) {
  if (error instanceof psdImport.PsdImportError) {
    return res.status(error.status).json({ success: false, error: error.message, hint: error.hint });
  }
  return handleRepoError(res, next, error);
}

async function createTemplateWithFreeName(payload, userId) {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const name = attempt === 1 ? payload.name : `${payload.name} (${attempt})`;
    try {
      return await repo.createTemplate({ ...payload, name: name.slice(0, 160) }, userId);
    } catch (error) {
      const taken = error instanceof repo.ValidationError && error.field === 'name';
      if (!taken || attempt === 20) throw error;
    }
  }
}

/**
 * Import szablonu z PSD. Układ, pozycje i kroje czytamy prosto z pliku grafika,
 * a spłaszczoną grafikę zapisujemy jako jeden obraz nakładki. Warstwy oznaczone
 * „#" stają się polami formularza dla social mediów.
 */
/**
 * Import z magazynu — droga podstawowa.
 *
 * Pliki PSD ważą setki megabajtów, a strona stoi za pośrednikiem, który tnie
 * duże żądania. Grafik wrzuca więc plik do katalogu „psd/" klientem S3
 * z pulpitu, a tutaj tylko wybiera, który zamienić w szablon.
 */
router.get('/api/psd/files', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    res.json({
      success: true,
      prefix: storage.PREFIXES.psd,
      // Próg podajemy razem z listą, żeby za duży plik dało się rozpoznać
      // przed kliknięciem, a nie dopiero po nieudanej próbie.
      maxFileSize: psdImport.maxFileSize(),
      files: await storage.listPsdFiles()
    });
  } catch (err) { handleRepoError(res, next, err); }
});

router.post('/api/psd/import-from-storage', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  let tmpPath = null;
  try {
    const key = storage.normalizeKey(req.body?.key || '');
    if (!key.startsWith(storage.PREFIXES.psd) || !/\.psd$/i.test(key)) {
      return res.status(400).json({ success: false, error: 'Wskaż plik PSD z katalogu magazynu.' });
    }

    // Rozmiar sprawdzamy przed pobraniem, żeby nie ściągać na próżno pliku,
    // którego i tak nie przetworzymy.
    const head = await storage.headObject(key);
    psdImport.checkFileSize(head.size);

    // Plik zapisujemy najpierw na dysk, a dopiero potem wczytujemy w całości.
    // Zbieranie kawałków w tablicy i sklejanie ich zajmowałoby w szczycie
    // dwukrotność rozmiaru pliku — przy PSD rzędu kilkuset megabajtów to
    // wystarczało, żeby zabrakło pamięci.
    tmpPath = path.join(tmpDir, `psd-${Date.now().toString(36)}`);
    const object = await storage.getObjectStream(key);
    await pipeline(object.body, fs.createWriteStream(tmpPath));

    const result = await buildTemplateFromPsd({
      buffer: fs.readFileSync(tmpPath),
      fileName: key.split('/').pop(),
      category: req.body?.category,
      userId: req.session.user.id,
      sourceKey: key
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    psdErrorResponse(res, next, err);
  } finally {
    if (tmpPath) fs.unlink(tmpPath, () => {});
  }
});

/* ---- wysyłka PSD z przeglądarki, kawałek po kawałku ----
   Plik dzielimy po stronie przeglądarki i składamy w buckecie, więc rozmiar
   przestaje mieć znaczenie: żadne pojedyncze żądanie nie zbliża się do limitu
   pośrednika, a serwer nie odkłada całego pliku na dysk.
*/

// Trwające wysyłki, żeby nikt nie dopisał części do cudzego pliku.
const psdUploads = new Map();
const UPLOAD_TTL_MS = 60 * 60 * 1000;

function forgetStaleUploads() {
  const now = Date.now();
  psdUploads.forEach((upload, id) => {
    if (now - upload.startedAt <= UPLOAD_TTL_MS) return;
    storage.abortMultipart(upload.key, upload.uploadId);
    psdUploads.delete(id);
  });
}

router.post('/api/psd/upload/start', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    forgetStaleUploads();

    const fileName = String(req.body?.fileName || '');
    if (!/\.psd$/i.test(fileName)) {
      return res.status(400).json({ success: false, error: 'Wybierz plik z rozszerzeniem .psd.' });
    }

    const key = `${storage.PREFIXES.psd}${storage.safeFileName(fileName)}`;
    const started = await storage.startMultipart(key, { contentType: 'image/vnd.adobe.photoshop' });

    const id = `${req.session.user.id}-${Date.now().toString(36)}`;
    psdUploads.set(id, {
      userId: req.session.user.id,
      key: started.key,
      uploadId: started.uploadId,
      parts: [],
      startedAt: Date.now()
    });

    res.json({ success: true, id, partSize: started.partSize });
  } catch (err) { handleRepoError(res, next, err); }
});

router.post('/api/psd/upload/part', requireAuth, requireRole('admin', 'designer'),
  receivePsdPart, async (req, res, next) => {
    const upload = psdUploads.get(String(req.body?.id));
    try {
      if (!upload || upload.userId !== req.session.user.id) {
        return res.status(404).json({ success: false, error: 'Wysyłka wygasła — zacznij od nowa.' });
      }
      if (!req.file) return res.status(400).json({ success: false, error: 'Brak części pliku.' });

      const partNumber = Number(req.body.partNumber);
      if (!Number.isInteger(partNumber) || partNumber < 1) {
        return res.status(400).json({ success: false, error: 'Nieprawidłowy numer części.' });
      }

      const part = await storage.uploadPart(
        upload.key, upload.uploadId, partNumber, fs.readFileSync(req.file.path)
      );
      upload.parts = upload.parts.filter((item) => item.PartNumber !== partNumber).concat(part);
      res.json({ success: true, partNumber });
    } catch (err) {
      handleRepoError(res, next, err);
    } finally {
      if (req.file) fs.unlink(req.file.path, () => {});
    }
  });

router.post('/api/psd/upload/finish', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  const upload = psdUploads.get(String(req.body?.id));
  try {
    if (!upload || upload.userId !== req.session.user.id) {
      return res.status(404).json({ success: false, error: 'Wysyłka wygasła — zacznij od nowa.' });
    }
    if (!upload.parts.length) {
      return res.status(400).json({ success: false, error: 'Nie wysłano żadnej części pliku.' });
    }

    const key = await storage.completeMultipart(upload.key, upload.uploadId, upload.parts);
    psdUploads.delete(String(req.body.id));
    res.json({ success: true, key, fileName: key.split('/').pop() });
  } catch (err) {
    if (upload) {
      await storage.abortMultipart(upload.key, upload.uploadId);
      psdUploads.delete(String(req.body.id));
    }
    handleRepoError(res, next, err);
  }
});

router.post('/api/psd/upload/abort', requireAuth, requireRole('admin', 'designer'), async (req, res) => {
  const id = String(req.body?.id);
  const upload = psdUploads.get(id);
  if (upload && upload.userId === req.session.user.id) {
    await storage.abortMultipart(upload.key, upload.uploadId);
    psdUploads.delete(id);
  }
  res.json({ success: true });
});

router.post('/api/templates/:id/assets', requireAuth, requireRole('admin', 'designer'),
  uploadTemplateAsset.single('file'), async (req, res, next) => {
    const file = req.file;
    try {
      if (!file) return res.status(400).json({ success: false, error: 'Nie wybrano pliku.' });

      const key = `${storage.PREFIXES.templates}${Number(req.params.id)}`
        + `/${Date.now().toString(36)}-${storage.safeFileName(file.originalname)}`;
      await storage.putObject(key, fs.createReadStream(file.path), {
        contentType: file.mimetype,
        contentLength: file.size
      });

      const asset = await repo.addTemplateAsset(req.params.id, {
        kind: req.body.kind || 'overlay',
        objectKey: key,
        metadata: { originalName: file.originalname, size: file.size }
      });
      res.status(201).json({ success: true, asset });
    } catch (err) {
      handleRepoError(res, next, err);
    } finally {
      if (file) fs.unlink(file.path, () => {});
    }
  });

/**
 * Plik szablonu podany z naszej domeny. Tak samo jak przy zdjęciach: płótno
 * musi dostać obraz z tego samego adresu, inaczej nie da się go wyeksportować.
 * Starsze pliki leżą jeszcze lokalnie — obsługujemy oba źródła.
 */
router.get('/api/assets/:id/file', requireAuth, async (req, res, next) => {
  try {
    const asset = await repo.getTemplateAsset(req.params.id);
    if (!asset) return res.status(404).send('Nie znaleziono pliku.');

    if (asset.object_key.startsWith('/uploads/')) {
      return res.sendFile(path.join(__dirname, '..', '..', 'public', asset.object_key.replace(/^\//, '')));
    }

    const object = await storage.getObjectStream(asset.object_key);
    res.set({
      'Content-Type': object.contentType || storage.contentTypeFor(asset.object_key),
      'Cache-Control': 'private, max-age=3600',
      ...(object.contentLength ? { 'Content-Length': object.contentLength } : {})
    });
    object.body.on('error', next);
    object.body.pipe(res);
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/assets/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    const asset = await repo.deleteTemplateAsset(req.params.id);
    if (asset.object_key.startsWith('/uploads/templates/')) {
      fs.unlink(path.join(templateDir, path.basename(asset.object_key)), () => {});
    } else {
      await storage.deleteObject(asset.object_key).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/* ============================ MAGAZYN ZDJĘĆ (S3 / MEGA S4) ============================ */

// Ile plików naraz przyjmujemy w jednym żądaniu. Fotograf zrzuca całą kartę,
// ale przeglądarka wysyła to partiami — dzięki temu pasek postępu ma sens,
// a jedno zerwane połączenie nie unieważnia całej wysyłki.
const MAX_UPLOAD_BATCH = 20;
const MAX_PHOTO_SIZE = 60 * 1024 * 1024;

const uploadPsdPart = multer({
  storage: multer.diskStorage({ destination: tmpDir }),
  // Część jest z definicji mała; zapas na wypadek innego rozmiaru po stronie przeglądarki.
  limits: { fileSize: 32 * 1024 * 1024, files: 1 }
});

function receivePsdPart(req, res, next) {
  uploadPsdPart.single('chunk')(req, res, (error) => {
    if (!error) return next();
    if (req.file) fs.unlink(req.file.path, () => {});
    return handleRepoError(res, next, error);
  });
}

// Eksporty leżą w magazynie obok zdjęć, w osobnym katalogu.
const EXPORT_PREFIX = 'eksporty/';
const MAX_EXPORT_SIZE = 40 * 1024 * 1024;

const uploadExport = multer({
  storage: multer.diskStorage({ destination: tmpDir }),
  limits: { fileSize: MAX_EXPORT_SIZE, files: 1 }
});

function receiveExport(req, res, next) {
  uploadExport.single('file')(req, res, (error) => {
    if (!error) return next();
    if (req.file) fs.unlink(req.file.path, () => {});
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Wyeksportowany plik jest za duży.' });
    }
    return handleRepoError(res, next, error);
  });
}

const uploadPhotos = multer({
  storage: multer.diskStorage({ destination: tmpDir }),
  limits: { fileSize: MAX_PHOTO_SIZE, files: MAX_UPLOAD_BATCH },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new repo.ValidationError(`Plik ${file.originalname} nie jest zdjęciem (JPG, PNG, WEBP).`, 'files'));
    }
    cb(null, true);
  }
});

/**
 * Multer zgłasza własne błędy (za duży plik, za dużo plików, zły format).
 * Bez tego opakowania trafiłyby do globalnej obsługi błędów jako 500,
 * a formularz pokazałby „Operacja nie powiodła się" zamiast konkretu.
 */
function receivePhotos(req, res, next) {
  uploadPhotos.array('files', MAX_UPLOAD_BATCH)(req, res, (error) => {
    if (!error) return next();
    (req.files || []).forEach((file) => fs.unlink(file.path, () => {}));

    if (error instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `Maksymalny rozmiar zdjęcia to ${Math.round(MAX_PHOTO_SIZE / 1024 / 1024)} MB.`,
        LIMIT_FILE_COUNT: `Maksymalnie ${MAX_UPLOAD_BATCH} zdjęć w jednej partii.`
      };
      return res.status(400).json({ success: false, error: messages[error.code] || 'Nie udało się odebrać plików.' });
    }
    return handleRepoError(res, next, error);
  });
}

router.get('/api/storage/status', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, storage: storage.getStorageStatus() });
  } catch (err) { next(err); }
});

router.post('/api/storage/test', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.json({ success: true, result: await storage.testConnection() });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Zbiory zdjęć = mecze. Katalog w magazynie powstaje sam przy pierwszym
 * zdjęciu, więc lista pokazuje też mecze, do których nikt jeszcze nic nie wgrał.
 */
router.get('/api/photo-sets', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, sets: await repo.listPhotoSets({ seasonId: req.query.season_id || null }) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.get('/api/photo-sets/:key/photos', requireAuth, async (req, res, next) => {
  try {
    const { folder, match, key } = await repo.resolvePhotoSet(req.params.key);
    if (!folder) return res.json({ success: true, key, match, folder: null, photos: [] });

    const photos = await repo.listPhotos(folder.id, { selectedOnly: req.query.selected === '1' });
    res.json({ success: true, key, match, folder, photos: await withPreviewUrls(photos) });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Synchronizacja z magazynem: bucket jest źródłem prawdy, więc zdjęcia wrzucone
 * klientem S3 z pulpitu pojawiają się tak samo jak te z przeglądarki.
 */
router.post('/api/photo-sets/:key/sync', requireAuth, async (req, res, next) => {
  try {
    const { folder, key } = await repo.resolvePhotoSet(req.params.key, { create: true });
    const listing = await storage.listObjects(folder.prefix_path, { imagesOnly: true });
    const { indexed } = await repo.upsertPhotos(folder.id, listing.objects);
    const removed = await repo.pruneMissingPhotos(folder.id, listing.objects.map((object) => object.key));

    res.json({
      success: true,
      key,
      indexed,
      removed,
      truncated: listing.truncated,
      photos: await withPreviewUrls(await repo.listPhotos(folder.id))
    });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Wysyłka zdjęć do zbioru.
 *
 * MEGA S4 nie pozwala skonfigurować CORS, więc przeglądarka nie może wysłać
 * pliku wprost do bucketa — plik idzie przez nasz serwer. Multer zapisuje go
 * do katalogu tymczasowego, stamtąd strumień trafia do magazynu i plik
 * tymczasowy znika. Klucze dostępu zostają po stronie serwera (§13).
 */
router.post('/api/photo-sets/:key/upload', requireAuth,
  requireRole('admin', 'designer', 'photographer'),
  receivePhotos, async (req, res, next) => {
    const files = req.files || [];
    const cleanup = () => files.forEach((file) => fs.unlink(file.path, () => {}));

    try {
      if (!files.length) return res.status(400).json({ success: false, error: 'Nie wybrano plików.' });
      const { folder, key } = await repo.resolvePhotoSet(req.params.key, { create: true });

      const objects = [];
      for (const file of files) {
        const name = storage.safeFileName(file.originalname);
        // Znacznik czasu chroni przed nadpisaniem pliku o tej samej nazwie z innego aparatu.
        const objectKey = `${folder.prefix_path}${Date.now().toString(36)}-${name}`;

        await storage.putObject(objectKey, fs.createReadStream(file.path), {
          contentType: storage.contentTypeFor(name, file.mimetype),
          contentLength: file.size
        });

        objects.push({
          key: objectKey,
          fileName: objectKey.split('/').pop(),
          size: file.size,
          lastModified: new Date(),
          metadata: { originalName: file.originalname, uploadedBy: req.session.user.id }
        });
      }

      await repo.upsertPhotos(folder.id, objects);
      res.status(201).json({
        success: true,
        key,
        uploaded: objects.length,
        photos: await withPreviewUrls(await repo.listPhotos(folder.id))
      });
    } catch (err) {
      handleRepoError(res, next, err);
    } finally {
      cleanup();
    }
  });

router.patch('/api/photos/:id', requireAuth, requireRole('admin', 'designer', 'social'), async (req, res, next) => {
  try {
    const photo = await repo.setPhotoSelected(req.params.id, Boolean(req.body?.is_selected));
    res.json({ success: true, photo });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/photos/:id', requireAuth, requireRole('admin', 'photographer'), async (req, res, next) => {
  try {
    const photo = await repo.deletePhoto(req.params.id);
    // Domyślnie kasujemy tylko wpis w indeksie; plik znika z bucketa dopiero na wyraźne żądanie.
    if (req.query.purge === '1') await storage.deleteObject(photo.object_key);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/** Podgląd zdjęcia to podpisany adres GET — bucket zostaje prywatny. */
async function withPreviewUrls(photos) {
  if (!storage.isConfigured()) return photos;
  return Promise.all(photos.map(async (photo) => ({
    ...photo,
    url: await storage.presignDownload(photo.object_key)
  })));
}

/**
 * Plik zdjęcia podany z naszej domeny.
 *
 * Podgląd w siatce leci prosto z magazynu podpisanym adresem, ale płótno musi
 * dostać obraz z tej samej domeny: obraz z obcej domeny „zatruwa" canvas i
 * przeglądarka nie pozwala go potem zapisać do pliku. MEGA S4 nie obsługuje
 * CORS, więc nie da się tego obejść nagłówkiem — plik idzie przez serwer.
 */
router.get('/api/photos/:id/file', requireAuth, async (req, res, next) => {
  try {
    const photo = await repo.getPhoto(req.params.id);
    if (!photo) return res.status(404).send('Nie znaleziono zdjęcia.');

    const object = await storage.getObjectStream(photo.object_key);
    res.set({
      'Content-Type': object.contentType || storage.contentTypeFor(photo.object_key),
      'Cache-Control': 'private, max-age=3600',
      ...(object.contentLength ? { 'Content-Length': object.contentLength } : {})
    });
    object.body.on('error', next);
    object.body.pipe(res);
  } catch (err) { handleRepoError(res, next, err); }
});

/* ================================ GRAFIKI ================================ */

router.get('/api/designs', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, designs: await repo.listDesigns({ matchId: req.query.match_id || null }) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.get('/api/designs/:id', requireAuth, async (req, res, next) => {
  try {
    const design = await repo.getDesign(req.params.id);
    if (!design) return res.status(404).json({ success: false, error: 'Nie znaleziono grafiki.' });
    res.json({ success: true, design });
  } catch (err) { handleRepoError(res, next, err); }
});

// Treść grafiki tworzy i zmienia social media — to jego rola w podziale z §29.
router.post('/api/designs', requireAuth, requireRole('admin', 'designer', 'social'), async (req, res, next) => {
  try {
    res.status(201).json({ success: true, design: await repo.createDesign(req.body || {}, req.session.user.id) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.patch('/api/designs/:id', requireAuth, requireRole('admin', 'designer', 'social'), async (req, res, next) => {
  try {
    res.json({ success: true, design: await repo.updateDesign(req.params.id, req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/designs/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    await repo.deleteDesign(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Eksport. Płótno renderuje grafikę w natywnej rozdzielczości szablonu (§15),
 * a gotowy PNG trafia do magazynu i do historii eksportów.
 */
router.post('/api/designs/:id/export', requireAuth, requireRole('admin', 'designer', 'social'),
  receiveExport, async (req, res, next) => {
    const file = req.file;
    try {
      const design = await repo.getDesign(req.params.id);
      if (!design) return res.status(404).json({ success: false, error: 'Nie znaleziono grafiki.' });
      if (!file) return res.status(400).json({ success: false, error: 'Brak pliku eksportu.' });

      // Brakujące pola wychodzą tutaj, a nie przy zapisie — grafikę można odkładać niedokończoną.
      const missing = repo.missingRequiredFields(design.template, design.values);
      if (missing.length) {
        return res.status(400).json({
          success: false,
          error: `Uzupełnij przed eksportem: ${missing.join(', ')}.`
        });
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const key = `${EXPORT_PREFIX}${stamp}/${design.id}-${Date.now().toString(36)}`
        + `-${storage.safeFileName(`${design.title}.png`)}`;

      await storage.putObject(key, fs.createReadStream(file.path), {
        contentType: 'image/png',
        contentLength: file.size
      });

      const record = await repo.recordExport({
        designId: design.id,
        objectKey: key,
        format: 'png',
        width: design.template.width,
        height: design.template.height,
        fileSize: file.size,
        userId: req.session.user.id
      });

      res.status(201).json({
        success: true,
        export: record,
        url: await storage.presignDownload(key, { download: true })
      });
    } catch (err) {
      handleRepoError(res, next, err);
    } finally {
      if (file) fs.unlink(file.path, () => {});
    }
  });

router.get('/api/exports', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, exports: await repo.listExports() });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const branding = await getBranding();
    res.render('club/index', {
      title: 'ZASTAL MARKETING CENTER',
      user: req.session.user,
      branding,
      dashboard: await repo.getDashboard(),
      integrations: getIntegrationStatus(),
      storage: storage.getStorageStatus()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
