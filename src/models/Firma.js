/**
 * Model obsługi firm/klientów
 */

const Database = require('../config/database');

class Firma {
    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Utwórz nową firmę
     */
    async create(data) {
        return await this.db.insert('firmy', {
            nazwa: data.nazwa,
            nip: data.nip || null,
            adres: data.adres || null,
            telefon: data.telefon || null,
            email: data.email,
            notatki_wewnetrzne: data.notatki_wewnetrzne || null,
            aktywna: data.aktywna !== undefined ? data.aktywna : 1
        });
    }

    /**
     * Pobierz firmę po ID
     */
    async getById(id) {
        return await this.db.fetch(
            'SELECT * FROM firmy WHERE id = ?',
            [id]
        );
    }

    /**
     * Pobierz listę firm
     */
    async getList(filters = {}, limit = 100, offset = 0) {
        let where = ['1=1'];
        let params = [];

        if (filters.aktywna !== undefined) {
            where.push('aktywna = ?');
            params.push(filters.aktywna);
        }

        if (filters.szukaj) {
            where.push('(nazwa LIKE ? OR email LIKE ? OR nip LIKE ?)');
            const search = `%${filters.szukaj}%`;
            params.push(search, search, search);
        }

        const whereClause = where.join(' AND ');

        return await this.db.fetchAll(
            `SELECT f.*,
                    (SELECT COUNT(*) FROM uzytkownicy WHERE firma_id = f.id) as liczba_uzytkownikow,
                    (SELECT COUNT(*) FROM zlecenia WHERE firma_id = f.id) as liczba_zlecen
             FROM firmy f
             WHERE ${whereClause}
             ORDER BY f.nazwa ASC
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );
    }

    /**
     * Aktualizuj firmę
     */
    async update(id, data) {
        return await this.db.update('firmy', data, 'id = ?', [id]) > 0;
    }

    /**
     * Usuń firmę
     */
    async delete(id) {
        return await this.db.delete('firmy', 'id = ?', [id]) > 0;
    }

    /**
     * Aktywuj/dezaktywuj firmę
     */
    async toggleActive(id) {
        const firma = await this.getById(id);
        if (!firma) return false;

        return await this.update(id, { aktywna: firma.aktywna ? 0 : 1 });
    }

    /**
     * Pobierz użytkowników firmy
     */
    async getUsers(firmaId) {
        return await this.db.fetchAll(
            'SELECT * FROM uzytkownicy WHERE firma_id = ? ORDER BY nazwisko, imie',
            [firmaId]
        );
    }

    /**
     * Policz firmy
     */
    async count(filters = {}) {
        let where = ['1=1'];
        let params = [];

        if (filters.aktywna !== undefined) {
            where.push('aktywna = ?');
            params.push(filters.aktywna);
        }

        const whereClause = where.join(' AND ');
        const result = await this.db.fetch(
            `SELECT COUNT(*) as cnt FROM firmy WHERE ${whereClause}`,
            params
        );

        return parseInt(result.cnt);
    }

    /**
     * Pobierz statystyki firmy
     */
    async getStats(firmaId) {
        const Zlecenie = require('./Zlecenie');
        const zlecenie = new Zlecenie();
        return await zlecenie.getStats(firmaId);
    }
}

module.exports = Firma;
