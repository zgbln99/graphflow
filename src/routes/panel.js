/**
 * Routes panelu klienta
 */

const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { Zlecenie, Uzytkownik, Powiadomienie, STATUSY, PRIORYTETY } = require('../models');
const helpers = require('../utils/helpers');

// Middleware - wymaga zalogowania
router.use(requireLogin);

// GET /panel - Dashboard klienta
router.get('/', async (req, res) => {
    const zlecenie = new Zlecenie();

    // Klient widzi tylko swoje zlecenia
    const filters = req.user.rola === 'klient'
        ? { firma_id: req.user.firma_id }
        : {};

    const [stats, recentOrders] = await Promise.all([
        zlecenie.getStats(req.user.rola === 'klient' ? req.user.firma_id : null),
        zlecenie.getList(filters, 10)
    ]);

    res.render('panel/index', {
        title: 'Panel',
        stats,
        recentOrders,
        STATUSY,
        helpers
    });
});

// GET /panel/zlecenia - Lista zleceń
router.get('/zlecenia', async (req, res) => {
    const zlecenie = new Zlecenie();

    const filters = {
        status: req.query.status || null,
        priorytet: req.query.priorytet || null,
        szukaj: req.query.szukaj || null
    };

    // Klient widzi tylko swoje zlecenia
    if (req.user.rola === 'klient') {
        filters.firma_id = req.user.firma_id;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [orders, total, categories] = await Promise.all([
        zlecenie.getList(filters, limit, offset),
        zlecenie.count(filters),
        zlecenie.getCategories()
    ]);

    res.render('panel/zlecenia', {
        title: 'Moje zlecenia',
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters,
        categories,
        STATUSY,
        PRIORYTETY,
        helpers
    });
});

// GET /panel/zlecenie/:id - Szczegóły zlecenia
router.get('/zlecenie/:id', async (req, res) => {
    const zlecenie = new Zlecenie();
    const order = await zlecenie.getById(req.params.id);

    if (!order) {
        req.flash('error', 'Zlecenie nie istnieje');
        return res.redirect('/panel/zlecenia');
    }

    // Sprawdź dostęp
    if (!helpers.canAccessOrder(order, req.user)) {
        req.flash('error', 'Brak dostępu do tego zlecenia');
        return res.redirect('/panel/zlecenia');
    }

    const [comments, attachments, history] = await Promise.all([
        zlecenie.getComments(order.id, false), // bez wewnętrznych
        zlecenie.getAttachments(order.id),
        zlecenie.getHistory(order.id)
    ]);

    res.render('panel/zlecenie', {
        title: `Zlecenie ${order.numer}`,
        order,
        comments,
        attachments,
        history,
        STATUSY,
        PRIORYTETY,
        helpers
    });
});

// POST /panel/zlecenie/:id/komentarz - Dodaj komentarz
router.post('/zlecenie/:id/komentarz', async (req, res) => {
    const zlecenie = new Zlecenie();
    const order = await zlecenie.getById(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Zlecenie nie istnieje' });
    }

    // Sprawdź dostęp
    if (!helpers.canAccessOrder(order, req.user)) {
        req.flash('error', 'Brak dostępu do tego zlecenia');
        return res.redirect('/panel/zlecenia');
    }

    const { tresc } = req.body;

    if (!tresc || !tresc.trim()) {
        req.flash('error', 'Komentarz nie może być pusty');
        return res.redirect(`/panel/zlecenie/${order.id}`);
    }

    await zlecenie.addComment(order.id, req.session.userId, tresc.trim(), 'publiczny');

    // Powiadom o nowym komentarzu
    const powiadomienie = new Powiadomienie();
    await powiadomienie.notifyNewComment(order, req.session.userId, req.session.userName);

    req.flash('success', 'Komentarz został dodany');
    res.redirect(`/panel/zlecenie/${order.id}`);
});

// GET /panel/nowe-zlecenie - Formularz nowego zlecenia
router.get('/nowe-zlecenie', async (req, res) => {
    const zlecenie = new Zlecenie();
    const categories = await zlecenie.getCategories();

    res.render('panel/nowe-zlecenie', {
        title: 'Nowe zlecenie',
        categories,
        PRIORYTETY,
        helpers
    });
});

// POST /panel/nowe-zlecenie - Utwórz zlecenie
router.post('/nowe-zlecenie', async (req, res) => {
    const zlecenie = new Zlecenie();
    const { tytul, opis, kategoria_id, priorytet, termin_realizacji } = req.body;

    if (!tytul || !opis) {
        req.flash('error', 'Tytuł i opis są wymagane');
        return res.redirect('/panel/nowe-zlecenie');
    }

    const orderId = await zlecenie.create({
        firma_id: req.user.firma_id,
        uzytkownik_id: req.session.userId,
        tytul,
        opis,
        kategoria_id: kategoria_id || null,
        priorytet: priorytet || 'normalny',
        termin_realizacji: termin_realizacji || null
    });

    // Pobierz utworzone zlecenie
    const order = await zlecenie.getById(orderId);

    // Powiadom adminów
    const powiadomienie = new Powiadomienie();
    await powiadomienie.notifyNewOrder(order);

    req.flash('success', 'Zlecenie zostało utworzone');
    res.redirect(`/panel/zlecenie/${orderId}`);
});

// GET /panel/profil - Profil użytkownika
router.get('/profil', (req, res) => {
    res.render('panel/profil', {
        title: 'Mój profil',
        helpers
    });
});

// POST /panel/profil - Aktualizuj profil
router.post('/profil', async (req, res) => {
    const uzytkownik = new Uzytkownik();
    const { imie, nazwisko, telefon } = req.body;

    if (!imie || !nazwisko) {
        req.flash('error', 'Imię i nazwisko są wymagane');
        return res.redirect('/panel/profil');
    }

    await uzytkownik.update(req.session.userId, {
        imie,
        nazwisko,
        telefon
    });

    req.session.userName = `${imie} ${nazwisko}`;
    req.flash('success', 'Profil został zaktualizowany');
    res.redirect('/panel/profil');
});

// POST /panel/profil/haslo - Zmiana hasła
router.post('/profil/haslo', async (req, res) => {
    const { Auth } = require('../middleware/auth');
    const auth = new Auth();
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
        req.flash('error', 'Wypełnij wszystkie pola');
        return res.redirect('/panel/profil');
    }

    if (new_password !== confirm_password) {
        req.flash('error', 'Nowe hasła nie są identyczne');
        return res.redirect('/panel/profil');
    }

    if (new_password.length < 6) {
        req.flash('error', 'Hasło musi mieć minimum 6 znaków');
        return res.redirect('/panel/profil');
    }

    const result = await auth.changePassword(req.session.userId, current_password, new_password);

    if (!result.success) {
        req.flash('error', result.message);
    } else {
        req.flash('success', result.message);
    }

    res.redirect('/panel/profil');
});

module.exports = router;
