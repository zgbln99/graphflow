/**
 * Model obsługi powiadomień w systemie
 */

const Database = require('../config/database');
const { STATUSY } = require('./Zlecenie');

class Powiadomienie {
    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Utwórz powiadomienie
     */
    async create(userId, tytul, tresc = '', typ = 'info', zlecenieId = null) {
        return await this.db.insert('powiadomienia', {
            uzytkownik_id: userId,
            zlecenie_id: zlecenieId,
            tytul,
            tresc,
            typ
        });
    }

    /**
     * Pobierz powiadomienia użytkownika
     */
    async getByUser(userId, tylkoNieprzeczytane = false, limit = 20) {
        let where = 'uzytkownik_id = ?';
        let params = [userId];

        if (tylkoNieprzeczytane) {
            where += ' AND przeczytane = 0';
        }

        return await this.db.fetchAll(
            `SELECT p.*, z.numer as zlecenie_numer, z.tytul as zlecenie_tytul
             FROM powiadomienia p
             LEFT JOIN zlecenia z ON p.zlecenie_id = z.id
             WHERE ${where}
             ORDER BY p.utworzono DESC
             LIMIT ${limit}`,
            params
        );
    }

    /**
     * Policz nieprzeczytane
     */
    async countUnread(userId) {
        const result = await this.db.fetch(
            'SELECT COUNT(*) as cnt FROM powiadomienia WHERE uzytkownik_id = ? AND przeczytane = 0',
            [userId]
        );
        return parseInt(result.cnt);
    }

    /**
     * Oznacz jako przeczytane
     */
    async markAsRead(id) {
        return await this.db.update('powiadomienia', { przeczytane: 1 }, 'id = ?', [id]) > 0;
    }

    /**
     * Oznacz wszystkie jako przeczytane
     */
    async markAllAsRead(userId) {
        return await this.db.update(
            'powiadomienia',
            { przeczytane: 1 },
            'uzytkownik_id = ? AND przeczytane = 0',
            [userId]
        );
    }

    /**
     * Usuń powiadomienie
     */
    async delete(id) {
        return await this.db.delete('powiadomienia', 'id = ?', [id]) > 0;
    }

    /**
     * Usuń stare powiadomienia (starsze niż X dni)
     */
    async deleteOld(days = 30) {
        return await this.db.delete(
            'powiadomienia',
            'utworzono < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );
    }

    /**
     * Powiadom o nowym zleceniu (dla admina)
     */
    async notifyNewOrder(zlecenie) {
        // Pobierz wszystkich adminów
        const admins = await this.db.fetchAll(
            "SELECT id FROM uzytkownicy WHERE rola = 'admin' AND aktywny = 1"
        );

        for (const admin of admins) {
            await this.create(
                admin.id,
                `Nowe zlecenie: ${zlecenie.numer}`,
                `Wpłynęło nowe zlecenie: ${zlecenie.tytul}`,
                'info',
                zlecenie.id
            );
        }
    }

    /**
     * Powiadom o zmianie statusu
     */
    async notifyStatusChange(zlecenie, newStatus) {
        const statusNazwa = STATUSY[newStatus]?.nazwa || newStatus;

        await this.create(
            zlecenie.uzytkownik_id,
            `Zmiana statusu: ${zlecenie.numer}`,
            `Status zlecenia zmieniony na: ${statusNazwa}`,
            'info',
            zlecenie.id
        );
    }

    /**
     * Powiadom o nowym komentarzu
     */
    async notifyNewComment(zlecenie, autorId, autorName) {
        // Powiadom autora zlecenia jeśli to nie on dodał komentarz
        if (zlecenie.uzytkownik_id !== autorId) {
            await this.create(
                zlecenie.uzytkownik_id,
                `Nowa wiadomość w zleceniu ${zlecenie.numer}`,
                `${autorName} dodał wiadomość`,
                'info',
                zlecenie.id
            );
        }

        // Powiadom adminów
        const admins = await this.db.fetchAll(
            "SELECT id FROM uzytkownicy WHERE rola = 'admin' AND aktywny = 1 AND id != ?",
            [autorId]
        );

        for (const admin of admins) {
            await this.create(
                admin.id,
                `Nowa wiadomość: ${zlecenie.numer}`,
                `${autorName} dodał wiadomość do zlecenia`,
                'info',
                zlecenie.id
            );
        }
    }
}

module.exports = Powiadomienie;
