/**
 * Routes panelu administracyjnego
 */

const express = require('express');
const router = express.Router();
const { requireStaff } = require('../middleware/auth');
const { Zlecenie, Uzytkownik, Firma, Powiadomienie, STATUSY, PRIORYTETY } = require('../models');
const helpers = require('../utils/helpers');

// Middleware - wymaga staff (admin lub pracownik)
router.use(requireStaff);

// GET /admin - Dashboard
router.get('/', async (req, res) => {
    const zlecenie = new Zlecenie();
    const firma = new Firma();
    const uzytkownik = new Uzytkownik();

    const [stats, recentOrders, firmaCount, userCount] = await Promise.all([
        zlecenie.getStats(),
        zlecenie.getList({}, 10),
        firma.count({ aktywna: 1 }),
        uzytkownik.count({ aktywny: 1 })
    ]);

    res.render('admin/index', {
        title: 'Dashboard',
        stats,
        recentOrders,
        firmaCount,
        userCount,
        STATUSY,
        helpers
    });
});

// GET /admin/zlecenia - Lista zleceń
router.get('/zlecenia', async (req, res) => {
    const zlecenie = new Zlecenie();

    const filters = {
        status: req.query.status || null,
        priorytet: req.query.priorytet || null,
        firma_id: req.query.firma_id || null,
        szukaj: req.query.szukaj || null
    };

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [orders, total, categories] = await Promise.all([
        zlecenie.getList(filters, limit, offset),
        zlecenie.count(filters),
        zlecenie.getCategories()
    ]);

    const firma = new Firma();
    const firmy = await firma.getList({ aktywna: 1 });

    res.render('admin/zlecenia', {
        title: 'Zlecenia',
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters,
        categories,
        firmy,
        STATUSY,
        PRIORYTETY,
        helpers
    });
});

// GET /admin/zlecenie/:id - Szczegóły zlecenia
router.get('/zlecenie/:id', async (req, res) => {
    const zlecenie = new Zlecenie();
    const order = await zlecenie.getById(req.params.id);

    if (!order) {
        req.flash('error', 'Zlecenie nie istnieje');
        return res.redirect('/admin/zlecenia');
    }

    const [comments, attachments, history, categories] = await Promise.all([
        zlecenie.getComments(order.id, true), // z wewnętrznymi
        zlecenie.getAttachments(order.id),
        zlecenie.getHistory(order.id),
        zlecenie.getCategories()
    ]);

    res.render('admin/zlecenie', {
        title: `Zlecenie ${order.numer}`,
        order,
        comments,
        attachments,
        history,
        categories,
        STATUSY,
        PRIORYTETY,
        helpers
    });
});

// POST /admin/zlecenie/:id - Aktualizacja zlecenia
router.post('/zlecenie/:id', async (req, res) => {
    const zlecenie = new Zlecenie();
    const order = await zlecenie.getById(req.params.id);

    if (!order) {
        req.flash('error', 'Zlecenie nie istnieje');
        return res.redirect('/admin/zlecenia');
    }

    const data = {};
    const allowedFields = ['tytul', 'opis', 'status', 'priorytet', 'kategoria_id', 'termin_realizacji', 'notatki_wewnetrzne', 'link_podglad', 'link_realizacja', 'koszt_szacowany', 'koszt_koncowy', 'lokalizacja_plikow'];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            data[field] = req.body[field] || null;
        }
    }

    await zlecenie.update(order.id, data, req.session.userId);

    // Powiadom o zmianie statusu
    if (data.status && data.status !== order.status) {
        const powiadomienie = new Powiadomienie();
        await powiadomienie.notifyStatusChange(order, data.status);
    }

    req.flash('success', 'Zlecenie zostało zaktualizowane');
    res.redirect(`/admin/zlecenie/${order.id}`);
});

// POST /admin/zlecenie/:id/komentarz - Dodaj komentarz
router.post('/zlecenie/:id/komentarz', async (req, res) => {
    const zlecenie = new Zlecenie();
    const order = await zlecenie.getById(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Zlecenie nie istnieje' });
    }

    const { tresc, typ } = req.body;

    if (!tresc || !tresc.trim()) {
        req.flash('error', 'Komentarz nie może być pusty');
        return res.redirect(`/admin/zlecenie/${order.id}`);
    }

    await zlecenie.addComment(order.id, req.session.userId, tresc.trim(), typ || 'publiczny');

    // Powiadom o nowym komentarzu
    if (typ !== 'wewnetrzny') {
        const powiadomienie = new Powiadomienie();
        await powiadomienie.notifyNewComment(order, req.session.userId, req.session.userName);
    }

    req.flash('success', 'Komentarz został dodany');
    res.redirect(`/admin/zlecenie/${order.id}`);
});

// GET /admin/uzytkownicy - Lista użytkowników
router.get('/uzytkownicy', async (req, res) => {
    const uzytkownik = new Uzytkownik();

    const filters = {
        rola: req.query.rola || null,
        aktywny: req.query.aktywny !== undefined ? parseInt(req.query.aktywny) : undefined,
        szukaj: req.query.szukaj || null
    };

    const users = await uzytkownik.getList(filters);

    res.render('admin/uzytkownicy', {
        title: 'Użytkownicy',
        users,
        filters,
        helpers
    });
});

// GET /admin/uzytkownik/nowy - Formularz nowego użytkownika
router.get('/uzytkownik/nowy', async (req, res) => {
    const firma = new Firma();
    const firmy = await firma.getList({ aktywna: 1 });

    res.render('admin/uzytkownik-form', {
        title: 'Nowy użytkownik',
        user: null,
        firmy,
        helpers
    });
});

// POST /admin/uzytkownik/nowy - Utwórz użytkownika
router.post('/uzytkownik/nowy', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    const { email, haslo, imie, nazwisko, telefon, stanowisko, rola, firma_id } = req.body;

    // Walidacja
    if (!email || !haslo || !imie || !nazwisko) {
        req.flash('error', 'Wypełnij wymagane pola');
        return res.redirect('/admin/uzytkownik/nowy');
    }

    if (await uzytkownik.emailExists(email)) {
        req.flash('error', 'Ten email jest już zajęty');
        return res.redirect('/admin/uzytkownik/nowy');
    }

    await uzytkownik.create({
        email,
        haslo,
        imie,
        nazwisko,
        telefon,
        stanowisko,
        rola: rola || 'klient',
        firma_id: firma_id || null
    });

    req.flash('success', 'Użytkownik został utworzony');
    res.redirect('/admin/uzytkownicy');
});

// GET /admin/uzytkownik/:id - Edycja użytkownika
router.get('/uzytkownik/:id', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    const user = await uzytkownik.getById(req.params.id);

    if (!user) {
        req.flash('error', 'Użytkownik nie istnieje');
        return res.redirect('/admin/uzytkownicy');
    }

    const firma = new Firma();
    const firmy = await firma.getList({ aktywna: 1 });

    res.render('admin/uzytkownik-form', {
        title: 'Edycja użytkownika',
        user,
        firmy,
        helpers
    });
});

// POST /admin/uzytkownik/:id - Aktualizuj użytkownika
router.post('/uzytkownik/:id', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    const user = await uzytkownik.getById(req.params.id);

    if (!user) {
        req.flash('error', 'Użytkownik nie istnieje');
        return res.redirect('/admin/uzytkownicy');
    }

    const { email, haslo, imie, nazwisko, telefon, stanowisko, rola, firma_id, aktywny } = req.body;

    // Walidacja
    if (!email || !imie || !nazwisko) {
        req.flash('error', 'Wypełnij wymagane pola');
        return res.redirect(`/admin/uzytkownik/${user.id}`);
    }

    if (await uzytkownik.emailExists(email, user.id)) {
        req.flash('error', 'Ten email jest już zajęty');
        return res.redirect(`/admin/uzytkownik/${user.id}`);
    }

    await uzytkownik.update(user.id, {
        email,
        haslo: haslo || undefined,
        imie,
        nazwisko,
        telefon,
        stanowisko,
        rola: rola || 'klient',
        firma_id: firma_id || null,
        aktywny: aktywny ? 1 : 0
    });

    req.flash('success', 'Użytkownik został zaktualizowany');
    res.redirect('/admin/uzytkownicy');
});

// POST /admin/uzytkownik/:id/toggle - Aktywuj/dezaktywuj
router.post('/uzytkownik/:id/toggle', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    await uzytkownik.toggleActive(req.params.id);

    res.redirect('/admin/uzytkownicy');
});

// GET /admin/firmy - Lista firm
router.get('/firmy', async (req, res) => {
    const firma = new Firma();

    const filters = {
        aktywna: req.query.aktywna !== undefined ? parseInt(req.query.aktywna) : undefined,
        szukaj: req.query.szukaj || null
    };

    const firmy = await firma.getList(filters);

    res.render('admin/firmy', {
        title: 'Firmy',
        firmy,
        filters,
        helpers
    });
});

// GET /admin/firma/nowa - Formularz nowej firmy
router.get('/firma/nowa', (req, res) => {
    res.render('admin/firma-form', {
        title: 'Nowa firma',
        firma: null,
        helpers
    });
});

// POST /admin/firma/nowa - Utwórz firmę
router.post('/firma/nowa', async (req, res) => {
    const firma = new Firma();
    const { nazwa, nip, email, telefon, adres, notatki_wewnetrzne } = req.body;

    if (!nazwa || !email) {
        req.flash('error', 'Wypełnij wymagane pola');
        return res.redirect('/admin/firma/nowa');
    }

    await firma.create({
        nazwa,
        nip,
        email,
        telefon,
        adres,
        notatki_wewnetrzne
    });

    req.flash('success', 'Firma została utworzona');
    res.redirect('/admin/firmy');
});

// GET /admin/firma/:id - Edycja firmy
router.get('/firma/:id', async (req, res) => {
    const firmaModel = new Firma();
    const firma = await firmaModel.getById(req.params.id);

    if (!firma) {
        req.flash('error', 'Firma nie istnieje');
        return res.redirect('/admin/firmy');
    }

    const users = await firmaModel.getUsers(firma.id);

    res.render('admin/firma-form', {
        title: 'Edycja firmy',
        firma,
        users,
        helpers
    });
});

// POST /admin/firma/:id - Aktualizuj firmę
router.post('/firma/:id', async (req, res) => {
    const firmaModel = new Firma();
    const firma = await firmaModel.getById(req.params.id);

    if (!firma) {
        req.flash('error', 'Firma nie istnieje');
        return res.redirect('/admin/firmy');
    }

    const { nazwa, nip, email, telefon, adres, notatki_wewnetrzne, aktywna } = req.body;

    if (!nazwa || !email) {
        req.flash('error', 'Wypełnij wymagane pola');
        return res.redirect(`/admin/firma/${firma.id}`);
    }

    await firmaModel.update(firma.id, {
        nazwa,
        nip,
        email,
        telefon,
        adres,
        notatki_wewnetrzne,
        aktywna: aktywna ? 1 : 0
    });

    req.flash('success', 'Firma została zaktualizowana');
    res.redirect('/admin/firmy');
});

// POST /admin/firma/:id/toggle - Aktywuj/dezaktywuj
router.post('/firma/:id/toggle', async (req, res) => {
    const firma = new Firma();
    await firma.toggleActive(req.params.id);

    res.redirect('/admin/firmy');
});

// GET /admin/profil - Profil użytkownika
router.get('/profil', (req, res) => {
    res.render('admin/profil', {
        title: 'Mój profil',
        helpers
    });
});

// POST /admin/profil - Aktualizuj profil
router.post('/profil', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    const { imie, nazwisko, telefon } = req.body;

    if (!imie || !nazwisko) {
        req.flash('error', 'Imię i nazwisko są wymagane');
        return res.redirect('/admin/profil');
    }

    await uzytkownik.update(req.session.userId, {
        imie,
        nazwisko,
        telefon
    });

    req.session.userName = `${imie} ${nazwisko}`;
    req.flash('success', 'Profil został zaktualizowany');
    res.redirect('/admin/profil');
});

// POST /admin/profil/haslo - Zmiana hasła
router.post('/profil/haslo', async (req, res) => {
    const { Auth } = require('../middleware/auth');
    const auth = new Auth();
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
        req.flash('error', 'Wypełnij wszystkie pola');
        return res.redirect('/admin/profil');
    }

    if (new_password !== confirm_password) {
        req.flash('error', 'Nowe hasła nie są identyczne');
        return res.redirect('/admin/profil');
    }

    if (new_password.length < 6) {
        req.flash('error', 'Hasło musi mieć minimum 6 znaków');
        return res.redirect('/admin/profil');
    }

    const result = await auth.changePassword(req.session.userId, current_password, new_password);

    if (!result.success) {
        req.flash('error', result.message);
    } else {
        req.flash('success', result.message);
    }

    res.redirect('/admin/profil');
});

// GET /admin/ustawienia/email - Ustawienia email
router.get('/ustawienia/email', async (req, res) => {
    const config = require('../config');
    const db = require('../utils/database');

    let emailLogs = [];
    let emailStats = { sent: 0, failed: 0, pending: 0 };

    try {
        // Upewnij sie ze tabela istnieje
        await db.query(`
            CREATE TABLE IF NOT EXISTS logi_mail (
                id INT AUTO_INCREMENT PRIMARY KEY,
                zlecenie_id INT,
                odbiorca VARCHAR(255) NOT NULL,
                temat VARCHAR(255) NOT NULL,
                tresc TEXT,
                status ENUM('wyslany', 'blad', 'oczekuje') DEFAULT 'oczekuje',
                blad_info TEXT,
                utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_status (status)
            ) ENGINE=InnoDB
        `);

        // Pobierz logi emaili
        emailLogs = await db.query(`
            SELECT * FROM logi_mail
            ORDER BY utworzono DESC
            LIMIT 50
        `);

        // Pobierz statystyki
        const statsQuery = await db.query(`
            SELECT
                SUM(CASE WHEN status = 'wyslany' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'blad' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'oczekuje' THEN 1 ELSE 0 END) as pending
            FROM logi_mail
            WHERE utworzono >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        emailStats = statsQuery[0] || { sent: 0, failed: 0, pending: 0 };
    } catch (error) {
        console.error('Blad pobierania logow email:', error);
    }

    res.render('admin/ustawienia-email', {
        title: 'Ustawienia Email',
        emailConfig: config.mail || {},
        emailLogs,
        emailStats,
        helpers
    });
});

// POST /admin/ustawienia/email/test - Wyślij testowy email
router.post('/ustawienia/email/test', async (req, res) => {
    const { test_email } = req.body;
    const nodemailer = require('nodemailer');
    const config = require('../config');
    const db = require('../utils/database');

    if (!test_email) {
        req.flash('error', 'Podaj adres email');
        return res.redirect('/admin/ustawienia/email');
    }

    try {
        // Utwórz transporter
        const transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.port === 465,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        });

        // Wyslij testowy email
        const info = await transporter.sendMail({
            from: `"${config.mail.fromName}" <${config.mail.from}>`,
            to: test_email,
            subject: 'Test konfiguracji email - GraphFlow',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
                        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; text-align: center; }
                        .success-icon { width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
                        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0;">GraphFlow</h1>
                        </div>
                        <div class="content">
                            <div class="success-icon">
                                <svg width="30" height="30" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h2 style="color: #22c55e; margin: 0 0 10px;">Konfiguracja dziala!</h2>
                            <p style="color: #6b7280;">Twoja konfiguracja SMTP jest poprawna. Powiadomienia email beda wysylane automatycznie.</p>
                        </div>
                        <div class="footer">
                            <p>Ten email zostal wyslany z panelu GraphFlow w celach testowych.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        // Zapisz log
        await db.query(`
            INSERT INTO logi_mail (odbiorca, temat, tresc, status, utworzono)
            VALUES (?, ?, ?, 'wyslany', NOW())
        `, [test_email, 'Test konfiguracji email - GraphFlow', 'Email testowy']);

        req.flash('success', 'Testowy email zostal wyslany pomyslnie!');
    } catch (error) {
        // Zapisz log bledu
        await db.query(`
            INSERT INTO logi_mail (odbiorca, temat, tresc, status, blad_info, utworzono)
            VALUES (?, ?, ?, 'blad', ?, NOW())
        `, [test_email, 'Test konfiguracji email - GraphFlow', 'Email testowy', error.message]);

        req.flash('error', `Blad wysylki: ${error.message}`);
    }

    res.redirect('/admin/ustawienia/email');
});

module.exports = router;
