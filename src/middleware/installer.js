/**
 * Middleware i logika instalacji aplikacji
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ENV_PATH = path.join(__dirname, '../../.env');
const INSTALLED_FLAG = path.join(__dirname, '../../.installed');

/**
 * Normalizuj host - zamień localhost na 127.0.0.1 aby uniknąć problemów z IPv6
 */
function normalizeHost(host) {
    if (host === 'localhost' || host === '::1') {
        return '127.0.0.1';
    }
    return host;
}

/**
 * Sprawdź czy aplikacja jest zainstalowana
 */
function isInstalled() {
    return fs.existsSync(INSTALLED_FLAG) && fs.existsSync(ENV_PATH);
}

/**
 * Middleware - przekieruj do instalatora jeśli nie zainstalowano
 */
function requireInstallation(req, res, next) {
    // Pozwól na dostęp do instalatora
    if (req.path.startsWith('/install') || req.path.startsWith('/assets')) {
        return next();
    }

    if (!isInstalled()) {
        return res.redirect('/install');
    }

    next();
}

/**
 * Middleware - blokuj instalator jeśli już zainstalowano
 */
function blockIfInstalled(req, res, next) {
    if (isInstalled()) {
        return res.redirect('/');
    }
    next();
}

/**
 * Testuj połączenie z bazą danych
 */
async function testDatabaseConnection(config) {
    try {
        const connection = await mysql.createConnection({
            host: normalizeHost(config.host),
            port: config.port || 3306,
            user: config.user,
            password: config.password
        });
        await connection.end();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Utwórz bazę danych jeśli nie istnieje
 */
async function createDatabase(config) {
    try {
        const connection = await mysql.createConnection({
            host: normalizeHost(config.host),
            port: config.port || 3306,
            user: config.user,
            password: config.password
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.end();

        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Utwórz tabele w bazie danych
 */
async function createTables(config) {
    try {
        const connection = await mysql.createConnection({
            host: normalizeHost(config.host),
            port: config.port || 3306,
            user: config.user,
            password: config.password,
            database: config.database,
            multipleStatements: true
        });

        const schema = getSchema();
        await connection.query(schema);
        await connection.end();

        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Utwórz konto administratora
 */
async function createAdminAccount(config, admin) {
    try {
        const connection = await mysql.createConnection({
            host: normalizeHost(config.host),
            port: config.port || 3306,
            user: config.user,
            password: config.password,
            database: config.database
        });

        const hashedPassword = await bcrypt.hash(admin.password, 10);

        await connection.execute(
            `INSERT INTO uzytkownicy (email, haslo, imie, nazwisko, rola, aktywny)
             VALUES (?, ?, ?, ?, 'admin', 1)`,
            [admin.email, hashedPassword, admin.firstName, admin.lastName]
        );

        await connection.end();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Zapisz plik .env
 */
function saveEnvFile(config, app) {
    const envContent = `# Konfiguracja bazy danych
DB_HOST=${normalizeHost(config.host)}
DB_PORT=${config.port || 3306}
DB_NAME=${config.database}
DB_USER=${config.user}
DB_PASS=${config.password}

# Konfiguracja aplikacji
APP_NAME=${app.name || 'GraphFlow'}
APP_URL=${app.url || 'http://localhost:3000'}
APP_PORT=${app.port || 3000}
NODE_ENV=production

# Sesja (wygenerowany klucz)
SESSION_SECRET=${generateSecretKey()}

# Strefa czasowa
TZ=Europe/Warsaw
`;

    fs.writeFileSync(ENV_PATH, envContent);
}

/**
 * Oznacz aplikację jako zainstalowaną
 */
function markAsInstalled() {
    const installInfo = {
        installed_at: new Date().toISOString(),
        version: '1.0.0'
    };
    fs.writeFileSync(INSTALLED_FLAG, JSON.stringify(installInfo, null, 2));
}

/**
 * Generuj losowy klucz sesji
 */
function generateSecretKey(length = 64) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Schema bazy danych
 */
function getSchema() {
    return `
-- Tabela firm/klientów
CREATE TABLE IF NOT EXISTS firmy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(255) NOT NULL,
    nip VARCHAR(20),
    email VARCHAR(255),
    telefon VARCHAR(50),
    adres TEXT,
    logo VARCHAR(255),
    notatki_wewnetrzne TEXT,
    aktywna TINYINT(1) DEFAULT 1,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela użytkowników
CREATE TABLE IF NOT EXISTS uzytkownicy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_id INT,
    email VARCHAR(255) NOT NULL UNIQUE,
    haslo VARCHAR(255) NOT NULL,
    imie VARCHAR(100) NOT NULL,
    nazwisko VARCHAR(100) NOT NULL,
    telefon VARCHAR(50),
    stanowisko VARCHAR(100),
    avatar VARCHAR(255),
    rola ENUM('admin', 'pracownik', 'klient') DEFAULT 'klient',
    aktywny TINYINT(1) DEFAULT 1,
    token_reset VARCHAR(255),
    token_reset_wazny DATETIME,
    ostatnie_logowanie DATETIME,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (firma_id) REFERENCES firmy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela kategorii zleceń
CREATE TABLE IF NOT EXISTS kategorie (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(100) NOT NULL,
    opis TEXT,
    kolor VARCHAR(20) DEFAULT 'gray',
    ikona VARCHAR(50),
    kolejnosc INT DEFAULT 0,
    aktywna TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domyślne kategorie
INSERT INTO kategorie (nazwa, kolor, ikona, kolejnosc) VALUES
('Grafika', 'blue', 'image', 1),
('Branding', 'purple', 'star', 2),
('Social Media', 'pink', 'share-2', 3),
('Druk', 'orange', 'printer', 4),
('Web', 'green', 'globe', 5),
('Video', 'red', 'film', 6),
('Inne', 'gray', 'file', 7);

-- Tabela zleceń
CREATE TABLE IF NOT EXISTS zlecenia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numer VARCHAR(50) NOT NULL UNIQUE,
    firma_id INT,
    uzytkownik_id INT,
    kategoria_id INT,
    tytul VARCHAR(255) NOT NULL,
    opis TEXT,
    priorytet ENUM('niski', 'normalny', 'wysoki', 'pilny') DEFAULT 'normalny',
    status ENUM('nowe', 'w_realizacji', 'oczekuje', 'do_akceptacji', 'poprawki', 'zakonczone', 'anulowane') DEFAULT 'nowe',
    termin_realizacji DATE,
    notatki_wewnetrzne TEXT,
    lokalizacja_plikow VARCHAR(500),
    link_podglad VARCHAR(500),
    link_realizacja VARCHAR(500),
    koszt_szacowany DECIMAL(10,2),
    koszt_koncowy DECIMAL(10,2),
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    zakonczono DATETIME,
    FOREIGN KEY (firma_id) REFERENCES firmy(id) ON DELETE SET NULL,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL,
    FOREIGN KEY (kategoria_id) REFERENCES kategorie(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela załączników
CREATE TABLE IF NOT EXISTS zalaczniki (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT,
    nazwa_oryginalna VARCHAR(255) NOT NULL,
    nazwa_pliku VARCHAR(255) NOT NULL,
    sciezka VARCHAR(500) NOT NULL,
    rozmiar INT,
    typ_mime VARCHAR(100),
    typ ENUM('wejsciowy', 'wyjsciowy', 'roboczy') DEFAULT 'wejsciowy',
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela komentarzy
CREATE TABLE IF NOT EXISTS komentarze (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT,
    tresc TEXT NOT NULL,
    typ ENUM('publiczny', 'wewnetrzny') DEFAULT 'publiczny',
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela historii statusów
CREATE TABLE IF NOT EXISTS historia_statusow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT,
    status_poprzedni VARCHAR(50),
    status_nowy VARCHAR(50) NOT NULL,
    komentarz TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela powiadomień
CREATE TABLE IF NOT EXISTS powiadomienia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uzytkownik_id INT NOT NULL,
    zlecenie_id INT,
    tytul VARCHAR(255) NOT NULL,
    tresc TEXT,
    typ ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    przeczytane TINYINT(1) DEFAULT 0,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela etykiet
CREATE TABLE IF NOT EXISTS etykiety (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(50) NOT NULL,
    kolor VARCHAR(20) DEFAULT 'gray'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela powiązań zlecenie-etykieta
CREATE TABLE IF NOT EXISTS zlecenia_etykiety (
    zlecenie_id INT NOT NULL,
    etykieta_id INT NOT NULL,
    PRIMARY KEY (zlecenie_id, etykieta_id),
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (etykieta_id) REFERENCES etykiety(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela ocen
CREATE TABLE IF NOT EXISTS oceny (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL UNIQUE,
    uzytkownik_id INT,
    ocena TINYINT NOT NULL CHECK (ocena >= 1 AND ocena <= 5),
    komentarz TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela ustawień
CREATE TABLE IF NOT EXISTS ustawienia (
    klucz VARCHAR(100) PRIMARY KEY,
    wartosc TEXT,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domyślne ustawienia
INSERT INTO ustawienia (klucz, wartosc) VALUES
('numer_zlecenia_prefix', 'GF'),
('numer_zlecenia_rok', YEAR(NOW())),
('numer_zlecenia_licznik', '0');

-- Indeksy
CREATE INDEX idx_zlecenia_status ON zlecenia(status);
CREATE INDEX idx_zlecenia_firma ON zlecenia(firma_id);
CREATE INDEX idx_zlecenia_uzytkownik ON zlecenia(uzytkownik_id);
CREATE INDEX idx_powiadomienia_uzytkownik ON powiadomienia(uzytkownik_id);
CREATE INDEX idx_komentarze_zlecenie ON komentarze(zlecenie_id);
`;
}

module.exports = {
    isInstalled,
    requireInstallation,
    blockIfInstalled,
    testDatabaseConnection,
    createDatabase,
    createTables,
    createAdminAccount,
    saveEnvFile,
    markAsInstalled,
    generateSecretKey
};
