/**
 * Model obsługi użytkowników
 */

const Database = require('../config/database');
const bcrypt = require('bcryptjs');

class Uzytkownik {
    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Utwórz hash hasła
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    /**
     * Utwórz nowego użytkownika
     */
    async create(data) {
        const hashedPassword = await this.hashPassword(data.haslo);

        return await this.db.insert('uzytkownicy', {
            firma_id: data.firma_id || null,
            email: data.email,
            haslo: hashedPassword,
            imie: data.imie,
            nazwisko: data.nazwisko,
            telefon: data.telefon || null,
            stanowisko: data.stanowisko || null,
            rola: data.rola || 'klient',
            aktywny: data.aktywny !== undefined ? data.aktywny : 1
        });
    }

    /**
     * Pobierz użytkownika po ID
     */
    async getById(id) {
        return await this.db.fetch(
            `SELECT u.*, f.nazwa as firma_nazwa
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE u.id = ?`,
            [id]
        );
    }

    /**
     * Pobierz użytkownika po email
     */
    async getByEmail(email) {
        return await this.db.fetch(
            'SELECT * FROM uzytkownicy WHERE email = ?',
            [email]
        );
    }

    /**
     * Pobierz listę użytkowników
     */
    async getList(filters = {}, limit = 100, offset = 0) {
        let where = ['1=1'];
        let params = [];

        if (filters.firma_id) {
            where.push('u.firma_id = ?');
            params.push(filters.firma_id);
        }

        if (filters.rola) {
            where.push('u.rola = ?');
            params.push(filters.rola);
        }

        if (filters.aktywny !== undefined) {
            where.push('u.aktywny = ?');
            params.push(filters.aktywny);
        }

        if (filters.szukaj) {
            where.push('(u.imie LIKE ? OR u.nazwisko LIKE ? OR u.email LIKE ?)');
            const search = `%${filters.szukaj}%`;
            params.push(search, search, search);
        }

        const whereClause = where.join(' AND ');

        return await this.db.fetchAll(
            `SELECT u.*, f.nazwa as firma_nazwa,
                    (SELECT COUNT(*) FROM zlecenia WHERE uzytkownik_id = u.id) as liczba_zlecen
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE ${whereClause}
             ORDER BY u.nazwisko, u.imie
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );
    }

    /**
     * Aktualizuj użytkownika
     */
    async update(id, data) {
        // Jeśli hasło jest puste, usuń z aktualizacji
        if (data.haslo === '' || data.haslo === null || data.haslo === undefined) {
            delete data.haslo;
        } else if (data.haslo) {
            data.haslo = await this.hashPassword(data.haslo);
        }

        return await this.db.update('uzytkownicy', data, 'id = ?', [id]) > 0;
    }

    /**
     * Usuń użytkownika
     */
    async delete(id) {
        return await this.db.delete('uzytkownicy', 'id = ?', [id]) > 0;
    }

    /**
     * Aktywuj/dezaktywuj użytkownika
     */
    async toggleActive(id) {
        const user = await this.getById(id);
        if (!user) return false;

        return await this.update(id, { aktywny: user.aktywny ? 0 : 1 });
    }

    /**
     * Sprawdź czy email jest zajęty
     */
    async emailExists(email, excludeId = null) {
        let where = 'email = ?';
        let params = [email];

        if (excludeId) {
            where += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await this.db.fetch(
            `SELECT COUNT(*) as cnt FROM uzytkownicy WHERE ${where}`,
            params
        );
        return parseInt(result.cnt) > 0;
    }

    /**
     * Pobierz pełne imię
     */
    async getFullName(id) {
        const user = await this.getById(id);
        return user ? `${user.imie} ${user.nazwisko}` : '';
    }

    /**
     * Policz użytkowników
     */
    async count(filters = {}) {
        let where = ['1=1'];
        let params = [];

        if (filters.rola) {
            where.push('rola = ?');
            params.push(filters.rola);
        }

        if (filters.aktywny !== undefined) {
            where.push('aktywny = ?');
            params.push(filters.aktywny);
        }

        const whereClause = where.join(' AND ');
        const result = await this.db.fetch(
            `SELECT COUNT(*) as cnt FROM uzytkownicy WHERE ${whereClause}`,
            params
        );

        return parseInt(result.cnt);
    }
}

module.exports = Uzytkownik;
