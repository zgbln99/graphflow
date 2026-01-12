/**
 * Middleware autoryzacji użytkowników
 */

const Database = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Auth {
    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Logowanie użytkownika
     */
    async login(email, password) {
        const user = await this.db.fetch(
            `SELECT u.*, f.nazwa as firma_nazwa
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE u.email = ? AND u.aktywny = 1`,
            [email]
        );

        if (!user) {
            return { success: false, message: 'Nieprawidłowy email lub hasło' };
        }

        const validPassword = await bcrypt.compare(password, user.haslo);
        if (!validPassword) {
            return { success: false, message: 'Nieprawidłowy email lub hasło' };
        }

        // Sprawdź czy firma jest aktywna (dla klientów)
        if (user.rola === 'klient' && user.firma_id) {
            const firma = await this.db.fetch(
                'SELECT aktywna FROM firmy WHERE id = ?',
                [user.firma_id]
            );
            if (!firma || !firma.aktywna) {
                return { success: false, message: 'Konto firmy zostało dezaktywowane' };
            }
        }

        // Aktualizuj ostatnie logowanie
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await this.db.update('uzytkownicy', { ostatnie_logowanie: now }, 'id = ?', [user.id]);

        return { success: true, user };
    }

    /**
     * Utwórz hash hasła
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    /**
     * Generuj token resetowania hasła
     */
    async generateResetToken(email) {
        const user = await this.db.fetch(
            'SELECT id FROM uzytkownicy WHERE email = ? AND aktywny = 1',
            [email]
        );

        if (!user) {
            return null;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '); // +1 godzina

        await this.db.update('uzytkownicy', {
            token_reset: token,
            token_reset_wazny: expiry
        }, 'id = ?', [user.id]);

        return token;
    }

    /**
     * Resetuj hasło tokenem
     */
    async resetPassword(token, newPassword) {
        const user = await this.db.fetch(
            'SELECT id FROM uzytkownicy WHERE token_reset = ? AND token_reset_wazny > NOW()',
            [token]
        );

        if (!user) {
            return false;
        }

        const hashedPassword = await this.hashPassword(newPassword);
        await this.db.update('uzytkownicy', {
            haslo: hashedPassword,
            token_reset: null,
            token_reset_wazny: null
        }, 'id = ?', [user.id]);

        return true;
    }

    /**
     * Zmień hasło
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.db.fetch(
            'SELECT haslo FROM uzytkownicy WHERE id = ?',
            [userId]
        );

        if (!user) {
            return { success: false, message: 'Użytkownik nie istnieje' };
        }

        const validPassword = await bcrypt.compare(oldPassword, user.haslo);
        if (!validPassword) {
            return { success: false, message: 'Nieprawidłowe obecne hasło' };
        }

        const hashedPassword = await this.hashPassword(newPassword);
        await this.db.update('uzytkownicy', {
            haslo: hashedPassword
        }, 'id = ?', [userId]);

        return { success: true, message: 'Hasło zostało zmienione' };
    }

    /**
     * Pobierz zalogowanego użytkownika
     */
    async getUser(userId) {
        return await this.db.fetch(
            `SELECT u.*, f.nazwa as firma_nazwa
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE u.id = ?`,
            [userId]
        );
    }
}

// Middleware - sprawdzenie czy użytkownik jest zalogowany
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Nie jesteś zalogowany' });
        }
        req.flash('error', 'Musisz być zalogowany');
        return res.redirect('/login');
    }
    next();
}

// Middleware - sprawdzenie czy użytkownik jest adminem
function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Nie jesteś zalogowany' });
        }
        req.flash('error', 'Musisz być zalogowany');
        return res.redirect('/login');
    }

    if (req.session.userRole !== 'admin') {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        req.flash('error', 'Brak uprawnień');
        return res.redirect('/panel');
    }
    next();
}

// Middleware - sprawdzenie czy użytkownik jest staff (admin lub pracownik)
function requireStaff(req, res, next) {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Nie jesteś zalogowany' });
        }
        req.flash('error', 'Musisz być zalogowany');
        return res.redirect('/login');
    }

    if (!['admin', 'pracownik'].includes(req.session.userRole)) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        req.flash('error', 'Brak uprawnień');
        return res.redirect('/panel');
    }
    next();
}

// Middleware - ładowanie danych użytkownika
async function loadUser(req, res, next) {
    if (req.session.userId) {
        const auth = new Auth();
        req.user = await auth.getUser(req.session.userId);

        // Dodaj zmienne do widoków
        res.locals.user = req.user;
        res.locals.isLoggedIn = true;
        res.locals.isAdmin = req.user?.rola === 'admin';
        res.locals.isStaff = ['admin', 'pracownik'].includes(req.user?.rola);
    } else {
        res.locals.user = null;
        res.locals.isLoggedIn = false;
        res.locals.isAdmin = false;
        res.locals.isStaff = false;
    }
    next();
}

module.exports = {
    Auth,
    requireLogin,
    requireAdmin,
    requireStaff,
    loadUser
};
