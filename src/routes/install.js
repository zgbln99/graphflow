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

// Blokuj dostęp do instalatora po instalacji (oprócz strony końcowej)
router.use((req, res, next) => {
    // Pozwól na dostęp do strony finish nawet po instalacji
    if (req.path === '/finish') {
        return next();
    }
    return blockIfInstalled(req, res, next);
});

// GET /install - Strona powitalna
router.get('/', (req, res) => {
    res.render('install/welcome', {
        title: 'Instalacja',
        step: 1,
        totalSteps: 3
    });
});

// GET /install/database - Konfiguracja bazy danych
router.get('/database', (req, res) => {
    res.render('install/database', {
        title: 'Konfiguracja bazy danych',
        step: 2,
        totalSteps: 3,
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
            totalSteps: 3,
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
            totalSteps: 3,
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
            totalSteps: 3,
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
        totalSteps: 3,
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
            totalSteps: 3,
            admin,
            error: 'Wszystkie pola są wymagane'
        });
    }

    if (password !== password_confirm) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 3,
            admin,
            error: 'Hasła nie są identyczne'
        });
    }

    if (password.length < 6) {
        return res.render('install/admin', {
            title: 'Konto administratora',
            step: 3,
            totalSteps: 3,
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
            totalSteps: 3,
            admin,
            error: `Nie można utworzyć konta: ${result.message}`
        });
    }

    // Zapisz plik .env z domyślnymi wartościami
    const appConfig = {
        name: 'GraphFlow',
        url: '', // Puste - aplikacja sama wykryje URL
        port: process.env.PORT || 3000
    };
    saveEnvFile(req.session.dbConfig, appConfig);

    // Oznacz jako zainstalowane
    markAsInstalled();

    // Wyczyść sesję instalacyjną
    delete req.session.dbConfig;
    delete req.session.dbConfigured;

    res.redirect('/install/finish');
});

// GET /install/finish - Strona końcowa
router.get('/finish', (req, res) => {
    res.render('install/finish', {
        title: 'Instalacja zakończona',
        step: 3,
        totalSteps: 3
    });
});

module.exports = router;
