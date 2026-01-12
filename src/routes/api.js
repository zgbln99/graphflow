/**
 * Routes API
 */

const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { Powiadomienie } = require('../models');
const helpers = require('../utils/helpers');

// Wszystkie endpointy API wymagają zalogowania
router.use(requireLogin);

// GET /api/powiadomienia - Lista powiadomień
router.get('/powiadomienia', async (req, res) => {
    try {
        const powiadomienie = new Powiadomienie();
        const notifications = await powiadomienie.getByUser(req.session.userId, false, 10);

        const formatted = notifications.map(n => ({
            id: n.id,
            tytul: n.tytul,
            tresc: n.tresc,
            typ: n.typ,
            przeczytane: n.przeczytane,
            czas: helpers.timeAgo(n.utworzono),
            link: n.zlecenie_id
                ? (req.user.rola === 'klient'
                    ? `/panel/zlecenie/${n.zlecenie_id}`
                    : `/admin/zlecenie/${n.zlecenie_id}`)
                : null
        }));

        res.json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Błąd serwera'
        });
    }
});

// GET /api/powiadomienia/count - Liczba nieprzeczytanych
router.get('/powiadomienia/count', async (req, res) => {
    try {
        const powiadomienie = new Powiadomienie();
        const count = await powiadomienie.countUnread(req.session.userId);

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Błąd serwera'
        });
    }
});

// POST /api/powiadomienia/:id/read - Oznacz jako przeczytane
router.post('/powiadomienia/:id/read', async (req, res) => {
    try {
        const powiadomienie = new Powiadomienie();
        await powiadomienie.markAsRead(req.params.id);

        res.json({
            success: true
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Błąd serwera'
        });
    }
});

// POST /api/powiadomienia/read-all - Oznacz wszystkie jako przeczytane
router.post('/powiadomienia/read-all', async (req, res) => {
    try {
        const powiadomienie = new Powiadomienie();
        await powiadomienie.markAllAsRead(req.session.userId);

        res.json({
            success: true
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Błąd serwera'
        });
    }
});

module.exports = router;
