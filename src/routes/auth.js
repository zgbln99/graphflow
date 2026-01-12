/**
 * Routes autoryzacji
 */

const express = require('express');
const router = express.Router();
const { Auth } = require('../middleware/auth');

// GET /login - Strona logowania
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect(req.session.userRole === 'klient' ? '/panel' : '/admin');
    }
    res.render('login', {
        title: 'Logowanie',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /login - Logowanie
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'Wypełnij wszystkie pola');
        return res.redirect('/login');
    }

    const auth = new Auth();
    const result = await auth.login(email, password);

    if (!result.success) {
        req.flash('error', result.message);
        return res.redirect('/login');
    }

    // Ustaw sesję
    req.session.userId = result.user.id;
    req.session.userRole = result.user.rola;
    req.session.userName = `${result.user.imie} ${result.user.nazwisko}`;
    req.session.firmaId = result.user.firma_id;

    // Przekieruj do odpowiedniego panelu
    if (result.user.rola === 'klient') {
        res.redirect('/panel');
    } else {
        res.redirect('/admin');
    }
});

// GET /logout - Wylogowanie
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/login');
    });
});

// GET /forgot-password - Strona przypomnienia hasła
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        title: 'Przypomnij hasło',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /forgot-password - Wyślij link resetujący
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        req.flash('error', 'Podaj adres email');
        return res.redirect('/forgot-password');
    }

    const auth = new Auth();
    const token = await auth.generateResetToken(email);

    // Zawsze pokazuj sukces (bezpieczeństwo - nie zdradzamy czy email istnieje)
    req.flash('success', 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła');
    res.redirect('/forgot-password');

    // TODO: Wysłać email z tokenem
});

// GET /reset-password/:token - Strona resetowania hasła
router.get('/reset-password/:token', (req, res) => {
    res.render('reset-password', {
        title: 'Resetuj hasło',
        token: req.params.token,
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /reset-password/:token - Resetuj hasło
router.post('/reset-password/:token', async (req, res) => {
    const { password, password_confirm } = req.body;
    const { token } = req.params;

    if (!password || password !== password_confirm) {
        req.flash('error', 'Hasła nie są identyczne');
        return res.redirect(`/reset-password/${token}`);
    }

    if (password.length < 6) {
        req.flash('error', 'Hasło musi mieć minimum 6 znaków');
        return res.redirect(`/reset-password/${token}`);
    }

    const auth = new Auth();
    const success = await auth.resetPassword(token, password);

    if (!success) {
        req.flash('error', 'Nieprawidłowy lub wygasły token');
        return res.redirect(`/reset-password/${token}`);
    }

    req.flash('success', 'Hasło zostało zmienione. Możesz się zalogować.');
    res.redirect('/login');
});

module.exports = router;
