const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('../config/database');
const {
  IntegrationError,
  getIntegrationStatus,
  fetchFacebookOverview,
  analyzeFacebookOverview,
  getCachedState
} = require('../services/social-intelligence');
const { getDashboardData } = require('../services/dashboard-data');

const router = express.Router();
const db = Database.getInstance();

const brandingDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'branding');
fs.mkdirSync(brandingDir, { recursive: true });

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

function integrationErrorResponse(res, error) {
  const status = error instanceof IntegrationError ? error.status : 500;
  return res.status(status).json({
    success: false,
    code: error.code || 'SOCIAL_INTEGRATION_ERROR',
    error: error.message || 'Nie udało się pobrać danych integracji.'
  });
}

// Warianty wyglądu do wyboru przez właściciela projektu: /?motyw=jasny&uklad=poziomy
// Po wybraniu jednego z nich zostaje on ustawiony na stałe, a parametry znikają.
function getUiVariant(req) {
  return {
    theme: req.query.motyw === 'jasny' ? 'light' : 'dark',
    layout: req.query.uklad === 'poziomy' ? 'poziomy' : 'pionowy'
  };
}

async function getBranding() {
  const row = await db.fetch(
    'SELECT setting_value FROM cg_settings WHERE setting_key = ? LIMIT 1',
    ['brand_logo_url']
  );
  return {
    logoUrl: row?.setting_value || null
  };
}

router.get('/login', async (req, res, next) => {
  try {
    if (req.session?.user?.id) return res.redirect('/');
    const branding = await getBranding();
    res.render('club/login', {
      title: 'Logowanie — ZASTAL MARKETING CENTER',
      error: null,
      branding,
      ui: getUiVariant(req)
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
        branding,
        ui: getUiVariant(req)
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
        branding,
        ui: getUiVariant(req)
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

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const branding = await getBranding();
    res.render('club/index', {
      title: 'ZASTAL MARKETING CENTER',
      user: req.session.user,
      branding,
      dashboard: getDashboardData(),
      ui: getUiVariant(req)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
