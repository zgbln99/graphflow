/**
 * Routes kreatora instalacji
 */

const express = require('express');
const router = express.Router();
const {
    blockIfInstalled,
    testDatabaseConnection,
    createDatabase,
    createTables,
    createAdminAccount,
    saveEnvFile,
    markAsInstalled
} = require('../middleware/installer');

// Wszystkie routes instalatora blokowane po instalacji
router.use(blockIfInstalled);

// GET /install - Strona powitalna
router.get('/', (req, res) => {
    res.render('install/welcome', {
        title: 'Instalacja',
        step: 1,
        totalSteps: 4
    });
});

// GET /install/database - Konfiguracja bazy danych
router.get('/database', (req, res) => {
    res.render('install/database', {
        title: 'Konfiguracja bazy danych',
        step: 2,
        totalSteps: 4,
        config: req.session.dbConfig || {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'panel_zlecen'
        },
        error: null
    });
});

// POST /install/database - Testuj i zapisz konfigurację bazy
router.post('/database', async (req, res) => {
    const { host, port, user, password, database } = req.body;

    const config = {
        host: host || 'localhost',
        port: parseInt(port) || 3306,
        user: user || 'root',
        password: password || '',
        database: database || 'panel_zlecen'
    };

    // Testuj połączenie
    const connectionTest = await testDatabaseConnection(config);
    if (!connectionTest.success) {
        return res.render('install/database', {
            title: 'Konfiguracja bazy danych',
            step: 2,
            totalSteps: 4,
            config,
            error: `Nie można połączyć z serwerem MySQL: ${connectionTest.message}`
        });
    }

    // Utwórz bazę danych
    const dbCreation = await createDatabase(config);
    if (!dbCreation.success) {
        return res.render('install/database', {
            title: 'Konfiguracja bazy danych',
            step: 2,
            totalSteps: 4,
            config,
            error: `Nie można utworzyć bazy danych: ${dbCreation.message}`
        });
    }

    // Utwórz tabele
    const tablesCreation = await createTables(config);
    if (!tablesCreation.success) {
        return res.render('install/database', {
            title: 'Konfiguracja bazy danych',
            step: 2,
            totalSteps: 4,
            config,
            error: `Nie można utworzyć tabel: ${tablesCreation.message}`
        });
    }

    // Zapisz konfigurację w sesji
    req.session.dbConfig = config;
    req.session.dbConfigured = true;

    res.redirect('/install/admin');
});

// GET /install/admin - Tworzenie konta administratora
router.get('/admin', (req, res) => {
    if (!req.session.dbConfigured) {
        return res.redirect('/install/database');
    }

    res.render('install/admin', {
        title: 'Konto administratora',
        step: 3,
        totalSteps: 4,
        admin: req.session.adminData || {
            email: '',
            firstName: '',
            lastName: ''
        },
        error: null
    });
});

// POST /install/admin - Utwórz konto administratora
router.post('/admin', async (req, res) => {
    if (!req.session.dbConfigured) {
        return res.redirect('/install/database');
    }

    const { email, password, password_confirm, firstName, lastName } = req.body;

    const admin = { email, firstName, lastName };

    // Walidacja
    if (!email || !password || !firstName || !lastName) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 4,
            admin,
            error: 'Wszystkie pola są wymagane'
        });
    }

    if (password !== password_confirm) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 4,
            admin,
            error: 'Hasła nie są identyczne'
        });
    }

    if (password.length < 6) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 4,
            admin,
            error: 'Hasło musi mieć minimum 6 znaków'
        });
    }

    // Utwórz konto administratora
    const result = await createAdminAccount(req.session.dbConfig, { ...admin, password });
    if (!result.success) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 4,
            admin,
            error: `Nie można utworzyć konta: ${result.message}`
        });
    }

    req.session.adminData = admin;
    req.session.adminCreated = true;

    res.redirect('/install/app');
});

// GET /install/app - Konfiguracja aplikacji
router.get('/app', (req, res) => {
    if (!req.session.adminCreated) {
        return res.redirect('/install/admin');
    }

    res.render('install/app', {
        title: 'Konfiguracja aplikacji',
        step: 4,
        totalSteps: 4,
        app: {
            name: 'GraphFlow',
            url: 'http://localhost:3000',
            port: 3000
        },
        error: null
    });
});

// POST /install/app - Zapisz konfigurację i zakończ
router.post('/app', (req, res) => {
    if (!req.session.adminCreated) {
        return res.redirect('/install/admin');
    }

    const { name, url, port } = req.body;

    const appConfig = {
        name: name || 'GraphFlow',
        url: url || 'http://localhost:3000',
        port: parseInt(port) || 3000
    };

    // Zapisz plik .env
    saveEnvFile(req.session.dbConfig, appConfig);

    // Oznacz jako zainstalowane
    markAsInstalled();

    // Wyczyść sesję instalacyjną
    delete req.session.dbConfig;
    delete req.session.dbConfigured;
    delete req.session.adminData;
    delete req.session.adminCreated;

    res.redirect('/install/finish');
});

// GET /install/finish - Strona końcowa
router.get('/finish', (req, res) => {
    res.render('install/finish', {
        title: 'Instalacja zakończona',
        step: 4,
        totalSteps: 4
    });
});

module.exports = router;
