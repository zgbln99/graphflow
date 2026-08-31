const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const os = require('os');
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

const router = express.Router();
const db = Database.getInstance();

const brandingDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'branding');
fs.mkdirSync(brandingDir, { recursive: true });

// Pliki szablonów (overlay, tła, maski) — docelowo trafią do magazynu S3,
// na razie leżą lokalnie i są serwowane statycznie jak logo klubu.
const templateDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'templates');
fs.mkdirSync(templateDir, { recursive: true });

const uploadTemplateAsset = multer({
  storage: multer.diskStorage({
    destination: templateDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
      cb(null, `tpl-${req.params.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Dozwolone formaty: PNG, JPG, WEBP, SVG.'));
    cb(null, true);
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: brandingDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `logo-${Date.now()}${ext}`);
    }
  }),
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
    logoUrl: await getSetting('brand_logo_url'),
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

router.post('/admin/branding/logo', requireAuth, requireAdmin, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nie wybrano pliku.' });

    const logoUrl = `/uploads/branding/${req.file.filename}`;
    const current = await db.fetch(
      'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
      ['brand_logo_url']
    );

    if (current?.setting_value?.startsWith('/uploads/branding/')) {
      const oldFile = path.basename(current.setting_value);
      const oldPath = path.join(brandingDir, oldFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.query(
      `INSERT INTO cg_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      ['brand_logo_url', logoUrl]
    );

    res.json({ success: true, logoUrl });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/branding/logo', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const current = await db.fetch(
      'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
      ['brand_logo_url']
    );

    if (current?.setting_value?.startsWith('/uploads/branding/')) {
      const oldPath = path.join(brandingDir, path.basename(current.setting_value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

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

router.post('/api/templates/:id/assets', requireAuth, requireRole('admin', 'designer'),
  uploadTemplateAsset.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'Nie wybrano pliku.' });
      const asset = await repo.addTemplateAsset(req.params.id, {
        kind: req.body.kind || 'overlay',
        objectKey: `/uploads/templates/${req.file.filename}`,
        metadata: { originalName: req.file.originalname, size: req.file.size }
      });
      res.status(201).json({ success: true, asset });
    } catch (err) {
      if (req.file) fs.unlink(path.join(templateDir, req.file.filename), () => {});
      handleRepoError(res, next, err);
    }
  });

router.delete('/api/assets/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    const asset = await repo.deleteTemplateAsset(req.params.id);
    if (asset.object_key.startsWith('/uploads/templates/')) {
      fs.unlink(path.join(templateDir, path.basename(asset.object_key)), () => {});
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

// Katalog przelotowy: plik leży tu tylko na czas strumieniowania do bucketa.
const photoTmpDir = path.join(os.tmpdir(), 'zmc-uploads');
fs.mkdirSync(photoTmpDir, { recursive: true });

// Eksporty leżą w magazynie obok zdjęć, w osobnym katalogu.
const EXPORT_PREFIX = 'eksporty/';
const MAX_EXPORT_SIZE = 40 * 1024 * 1024;

const uploadExport = multer({
  storage: multer.diskStorage({ destination: photoTmpDir }),
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
  storage: multer.diskStorage({ destination: photoTmpDir }),
  limits: { fileSize: MAX_PHOTO_SIZE, files: MAX_UPLOAD_BATCH },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new repo.ValidationError(`Plik ${file.originalname} nie jest zdjęciem (JPG, PNG, WEBP).`, 'files'));
    }
    cb(null, true);
  }
});

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

router.get('/api/folders', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, folders: await repo.listFolders({ matchId: req.query.match_id || null }) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.post('/api/folders', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    res.status(201).json({ success: true, folder: await repo.createFolder(req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.patch('/api/folders/:id', requireAuth, requireRole('admin', 'designer'), async (req, res, next) => {
  try {
    res.json({ success: true, folder: await repo.updateFolder(req.params.id, req.body || {}) });
  } catch (err) { handleRepoError(res, next, err); }
});

router.delete('/api/folders/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await repo.deleteFolder(req.params.id);
    res.json({ success: true });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Synchronizacja: bucket jest źródłem prawdy. Zdjęcia wrzucone z pulpitu
 * (klientem S3) pojawiają się w panelu dopiero po tej operacji.
 */
router.post('/api/folders/:id/sync', requireAuth, async (req, res, next) => {
  try {
    const folder = await repo.getFolder(req.params.id);
    if (!folder) return res.status(404).json({ success: false, error: 'Nie znaleziono folderu.' });

    const listing = await storage.listObjects(folder.prefix_path, { imagesOnly: true });
    const { indexed } = await repo.upsertPhotos(folder.id, listing.objects);
    const removed = await repo.pruneMissingPhotos(folder.id, listing.objects.map((object) => object.key));

    res.json({
      success: true,
      indexed,
      removed,
      truncated: listing.truncated,
      photos: await withPreviewUrls(await repo.listPhotos(folder.id))
    });
  } catch (err) { handleRepoError(res, next, err); }
});

router.get('/api/folders/:id/photos', requireAuth, async (req, res, next) => {
  try {
    const folder = await repo.getFolder(req.params.id);
    if (!folder) return res.status(404).json({ success: false, error: 'Nie znaleziono folderu.' });

    const photos = await repo.listPhotos(folder.id, { selectedOnly: req.query.selected === '1' });
    res.json({ success: true, folder, photos: await withPreviewUrls(photos) });
  } catch (err) { handleRepoError(res, next, err); }
});

/**
 * Multer zgłasza własne błędy (za duży plik, za dużo plików, zły format).
 * Bez tego opakowania trafiłyby do globalnej obsługi błędów jako 500,
 * a formularz pokazałby "Operacja nie powiodła się" zamiast konkretu.
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

/**
 * Wysyłka zdjęć do magazynu.
 *
 * MEGA S4 nie pozwala skonfigurować CORS, więc przeglądarka nie może wysłać
 * pliku wprost do bucketa — plik idzie przez nasz serwer. Multer zapisuje go
 * do katalogu tymczasowego, stamtąd strumień trafia do magazynu i plik
 * tymczasowy znika. Klucze dostępu zostają po stronie serwera (§13).
 */
router.post('/api/folders/:id/upload', requireAuth,
  requireRole('admin', 'designer', 'photographer'),
  receivePhotos, async (req, res, next) => {
    const files = req.files || [];
    const cleanup = () => files.forEach((file) => fs.unlink(file.path, () => {}));

    try {
      const folder = await repo.getFolder(req.params.id);
      if (!folder) return res.status(404).json({ success: false, error: 'Nie znaleziono folderu.' });
      if (!folder.is_upload_enabled) {
        return res.status(409).json({ success: false, error: 'Wysyłka do tego folderu jest wyłączona.' });
      }
      if (!files.length) return res.status(400).json({ success: false, error: 'Nie wybrano plików.' });

      const objects = [];
      for (const file of files) {
        const name = storage.safeFileName(file.originalname);
        // Znacznik czasu chroni przed nadpisaniem pliku o tej samej nazwie z innego aparatu.
        const key = `${folder.prefix_path}${Date.now().toString(36)}-${name}`;

        await storage.putObject(key, fs.createReadStream(file.path), {
          contentType: storage.contentTypeFor(name, file.mimetype),
          contentLength: file.size
        });

        objects.push({
          key,
          fileName: key.split('/').pop(),
          size: file.size,
          lastModified: new Date(),
          metadata: { originalName: file.originalname, uploadedBy: req.session.user.id }
        });
      }

      await repo.upsertPhotos(folder.id, objects);
      res.status(201).json({
        success: true,
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
