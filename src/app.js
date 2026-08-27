/**
 * GraphFlow - Panel Zleceń Graficznych
 * Główny plik aplikacji Express.js
 */

const fs = require('fs');
const path = require('path');

const INSTALLED_FLAG = path.join(__dirname, '..', '.installed');
const ENV_PATH = path.join(__dirname, '..', '.env');
const isInstalled = fs.existsSync(INSTALLED_FLAG) && fs.existsSync(ENV_PATH);

if (isInstalled) {
    require('dotenv').config({ path: ENV_PATH });
}

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

const { requireInstallation } = require('./middleware/installer');
const installRoutes = require('./routes/install');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'temporary-install-secret-key-change-me',
    name: 'graphflow_session',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.appName = process.env.APP_NAME || 'GraphFlow';
    res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
    next();
});

app.use('/install', installRoutes);
app.use(requireInstallation);

if (isInstalled) {
    require('./config');
    const { loadUser } = require('./middleware/auth');
    const { authRoutes, adminRoutes, panelRoutes, apiRoutes, clubRoutes } = require('./routes');

    app.use(loadUser);

    app.use('/', authRoutes);
    app.use('/admin', adminRoutes);
    app.use('/panel', panelRoutes);
    app.use('/api', apiRoutes);
    app.use('/club', clubRoutes);

    app.get('/', (req, res) => {
        if (req.session.userId) {
            if (req.session.userRole === 'klient') {
                return res.redirect('/panel');
            }
            return res.redirect('/club');
        }
        res.redirect('/login');
    });
} else {
    app.get('/', (req, res) => {
        res.redirect('/install');
    });
}

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Nie znaleziono',
        message: 'Strona nie została znaleziona',
        error: null
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
            success: false,
            error: 'Wystąpił błąd serwera'
        });
    }

    res.status(500).render('error', {
        title: 'Błąd',
        message: 'Wystąpił błąd serwera',
        error: process.env.NODE_ENV === 'development' ? err : null
    });
});

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`GraphFlow running on http://localhost:${PORT}`);
});

module.exports = app;
