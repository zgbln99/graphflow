/**
 * ZASTAL MARKETING CENTER
 * Samodzielna aplikacja Express.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const session = require('express-session');
const clubRoutes = require('./routes/club');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  name: 'zmc_session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    maxAge: 12 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'ZASTAL MARKETING CENTER';
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
  res.locals.currentUser = req.session.user || null;
  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: true, app: 'ZASTAL MARKETING CENTER' });
});

// Cała aplikacja działa od katalogu głównego — bez /club.
app.use('/', clubRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Nie znaleziono',
    message: 'Strona nie została znaleziona',
    error: null
  });
});

app.use((err, req, res, next) => {
  console.error('ZMC error:', err);
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(500).json({ success: false, error: 'Wystąpił błąd serwera' });
  }
  res.status(500).render('error', {
    title: 'Błąd',
    message: 'Wystąpił błąd serwera',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

const PORT = Number(process.env.APP_PORT || 3000);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ZASTAL MARKETING CENTER running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
