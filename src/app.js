/**
 * GraphFlow - Panel Zleceń Graficznych
 * Główny plik aplikacji Express.js
 */

const fs = require('fs');
const path = require('path');

// Sprawdź czy aplikacja jest zainstalowana przed ładowaniem .env
const INSTALLED_FLAG = path.join(__dirname, '..', '.installed');
const ENV_PATH = path.join(__dirname, '..', '.env');
const isInstalled = fs.existsSync(INSTALLED_FLAG) && fs.existsSync(ENV_PATH);

// Załaduj .env tylko jeśli istnieje
if (isInstalled) {
    require('dotenv').config({ path: ENV_PATH });
}

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

const { requireInstallation, isInstalled: checkInstalled } = require('./middleware/installer');
const installRoutes = require('./routes/install');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Session configuration (minimalna dla instalatora)
app.use(session({
    secret: process.env.SESSION_SECRET || 'temporary-install-secret-key-change-me',
    name: 'graphflow_session',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24h
    }
}));

// Flash messages
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.appName = process.env.APP_NAME || 'GraphFlow';
    res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
    next();
});

// Installation routes (dostępne zawsze)
app.use('/install', installRoutes);

// Sprawdź czy zainstalowano przed dalszymi routes
app.use(requireInstallation);

// Obsługa sytuacji gdy aplikacja została zainstalowana po uruchomieniu serwera
const { isInstalled: checkInstalledNow } = require('./middleware/installer');
app.use((req, res, next) => {
    // Jeśli app nie była zainstalowana przy starcie, ale jest teraz
    // to znaczy że instalacja właśnie się zakończyła
    if (!isInstalled && checkInstalledNow() && !req.path.startsWith('/install')) {
        return res.render('restart-required', {
            title: 'Wymagany restart',
            appName: 'GraphFlow'
        });
    }
    next();
});

// Załaduj główne routes tylko jeśli zainstalowano
if (isInstalled) {
    const config = require('./config');
    const { loadUser } = require('./middleware/auth');
    const { authRoutes, adminRoutes, panelRoutes, apiRoutes } = require('./routes');

    // Load user for all routes
    app.use(loadUser);

    // Routes
    app.use('/', authRoutes);
    app.use('/admin', adminRoutes);
    app.use('/panel', panelRoutes);
    app.use('/api', apiRoutes);

    // Home redirect
    app.get('/', (req, res) => {
        if (req.session.userId) {
            if (req.session.userRole === 'klient') {
                return res.redirect('/panel');
            }
            return res.redirect('/admin');
        }
        res.redirect('/login');
    });
} else {
    // Przekieruj wszystko do instalatora
    app.get('/', (req, res) => {
        res.redirect('/install');
    });
}

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Nie znaleziono',
        message: 'Strona nie została znaleziona',
        error: null
    });
});

// Error handler
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

// Start server
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    if (isInstalled) {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   GraphFlow - Panel Zleceń Graficznych                     ║
║                                                            ║
║   Serwer uruchomiony na: http://localhost:${String(PORT).padEnd(5)}           ║
║   Środowisko: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
        `);
    } else {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   GraphFlow - KREATOR INSTALACJI                           ║
║                                                            ║
║   Otwórz w przeglądarce: http://localhost:${String(PORT).padEnd(5)}           ║
║                                                            ║
║   Aplikacja wymaga konfiguracji przed użyciem.             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
        `);
    }
});

module.exports = app;
