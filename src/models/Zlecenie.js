/**
 * Model obsługi zleceń
 */

const Database = require('../config/database');

// Statusy z polskimi nazwami i kolorami
const STATUSY = {
    nowe: { nazwa: 'Nowe', kolor: 'blue', ikona: 'plus-circle' },
    w_realizacji: { nazwa: 'W realizacji', kolor: 'yellow', ikona: 'clock' },
    oczekuje: { nazwa: 'Oczekuje', kolor: 'orange', ikona: 'pause-circle' },
    do_akceptacji: { nazwa: 'Do akceptacji', kolor: 'purple', ikona: 'eye' },
    poprawki: { nazwa: 'Poprawki', kolor: 'red', ikona: 'edit' },
    zakonczone: { nazwa: 'Zakończone', kolor: 'green', ikona: 'check-circle' },
    anulowane: { nazwa: 'Anulowane', kolor: 'gray', ikona: 'x-circle' }
};

const PRIORYTETY = {
    niski: { nazwa: 'Niski', kolor: 'gray' },
    normalny: { nazwa: 'Normalny', kolor: 'blue' },
    wysoki: { nazwa: 'Wysoki', kolor: 'orange' },
    pilny: { nazwa: 'Pilny', kolor: 'red' }
};

class Zlecenie {
    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Pobierz ustawienie z bazy
     */
    async getSetting(key, defaultValue = '') {
        const result = await this.db.fetch(
            'SELECT wartosc FROM ustawienia WHERE klucz = ?',
            [key]
        );
        return result ? result.wartosc : defaultValue;
    }

    /**
     * Aktualizuj ustawienie
     */
    async updateSetting(key, value) {
        await this.db.query(
            `INSERT INTO ustawienia (klucz, wartosc) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE wartosc = VALUES(wartosc)`,
            [key, value]
        );
    }

    /**
     * Generuj numer zlecenia
     */
    async generateNumber() {
        const prefix = await this.getSetting('numer_zlecenia_prefix', 'GF');
        const rok = new Date().getFullYear().toString();

        // Pobierz i zwiększ licznik
        let currentYear = await this.getSetting('numer_zlecenia_rok', rok);
        let counter = parseInt(await this.getSetting('numer_zlecenia_licznik', '0'));

        // Reset licznika na nowy rok
        if (currentYear !== rok) {
            counter = 0;
            await this.updateSetting('numer_zlecenia_rok', rok);
        }

        counter++;
        await this.updateSetting('numer_zlecenia_licznik', counter.toString());

        return `${prefix}/${rok}/${String(counter).padStart(4, '0')}`;
    }

    /**
     * Utwórz nowe zlecenie
     */
    async create(data) {
        const numer = await this.generateNumber();

        const zlecenie = {
            numer,
            firma_id: data.firma_id,
            uzytkownik_id: data.uzytkownik_id,
            kategoria_id: data.kategoria_id || null,
            tytul: data.tytul,
            opis: data.opis,
            priorytet: data.priorytet || 'normalny',
            status: 'nowe',
            termin_realizacji: data.termin_realizacji || null
        };

        const id = await this.db.insert('zlecenia', zlecenie);

        // Dodaj do historii
        await this.addHistory(id, data.uzytkownik_id, null, 'nowe', 'Utworzono nowe zlecenie');

        return id;
    }

    /**
     * Pobierz zlecenie po ID
     */
    async getById(id) {
        return await this.db.fetch(
            `SELECT z.*,
                    f.nazwa as firma_nazwa,
                    u.imie as autor_imie, u.nazwisko as autor_nazwisko, u.email as autor_email,
                    k.nazwa as kategoria_nazwa, k.kolor as kategoria_kolor
             FROM zlecenia z
             LEFT JOIN firmy f ON z.firma_id = f.id
             LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
             LEFT JOIN kategorie k ON z.kategoria_id = k.id
             WHERE z.id = ?`,
            [id]
        );
    }

    /**
     * Pobierz zlecenie po numerze
     */
    async getByNumber(numer) {
        return await this.db.fetch(
            `SELECT z.*, f.nazwa as firma_nazwa
             FROM zlecenia z
             LEFT JOIN firmy f ON z.firma_id = f.id
             WHERE z.numer = ?`,
            [numer]
        );
    }

    /**
     * Pobierz listę zleceń
     */
    async getList(filters = {}, limit = 50, offset = 0) {
        let where = ['1=1'];
        let params = [];

        if (filters.firma_id) {
            where.push('z.firma_id = ?');
            params.push(filters.firma_id);
        }

        if (filters.uzytkownik_id) {
            where.push('z.uzytkownik_id = ?');
            params.push(filters.uzytkownik_id);
        }

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                const placeholders = filters.status.map(() => '?').join(',');
                where.push(`z.status IN (${placeholders})`);
                params.push(...filters.status);
            } else {
                where.push('z.status = ?');
                params.push(filters.status);
            }
        }

        if (filters.priorytet) {
            where.push('z.priorytet = ?');
            params.push(filters.priorytet);
        }

        if (filters.kategoria_id) {
            where.push('z.kategoria_id = ?');
            params.push(filters.kategoria_id);
        }

        if (filters.szukaj) {
            where.push('(z.tytul LIKE ? OR z.numer LIKE ? OR z.opis LIKE ?)');
            const search = `%${filters.szukaj}%`;
            params.push(search, search, search);
        }

        // Filtr etykiet
        let joinEtykiety = '';
        if (filters.etykieta_id) {
            joinEtykiety = 'INNER JOIN zlecenia_etykiety ze ON z.id = ze.zlecenie_id';
            where.push('ze.etykieta_id = ?');
            params.push(filters.etykieta_id);
        }

        const whereClause = where.join(' AND ');
        const orderBy = filters.order || 'z.utworzono DESC';

        const sql = `SELECT DISTINCT z.*,
                           f.nazwa as firma_nazwa,
                           u.imie as autor_imie, u.nazwisko as autor_nazwisko,
                           k.nazwa as kategoria_nazwa, k.kolor as kategoria_kolor
                    FROM zlecenia z
                    LEFT JOIN firmy f ON z.firma_id = f.id
                    LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
                    LEFT JOIN kategorie k ON z.kategoria_id = k.id
                    ${joinEtykiety}
                    WHERE ${whereClause}
                    ORDER BY ${orderBy}
                    LIMIT ${limit} OFFSET ${offset}`;

        return await this.db.fetchAll(sql, params);
    }

    /**
     * Policz zlecenia
     */
    async count(filters = {}) {
        let where = ['1=1'];
        let params = [];

        if (filters.firma_id) {
            where.push('z.firma_id = ?');
            params.push(filters.firma_id);
        }

        if (filters.status) {
            where.push('z.status = ?');
            params.push(filters.status);
        }

        if (filters.priorytet) {
            where.push('z.priorytet = ?');
            params.push(filters.priorytet);
        }

        if (filters.szukaj) {
            where.push('(z.tytul LIKE ? OR z.numer LIKE ? OR z.opis LIKE ?)');
            const search = `%${filters.szukaj}%`;
            params.push(search, search, search);
        }

        // Filtr etykiet
        let joinEtykiety = '';
        if (filters.etykieta_id) {
            joinEtykiety = 'INNER JOIN zlecenia_etykiety ze ON z.id = ze.zlecenie_id';
            where.push('ze.etykieta_id = ?');
            params.push(filters.etykieta_id);
        }

        const whereClause = where.join(' AND ');
        const result = await this.db.fetch(
            `SELECT COUNT(DISTINCT z.id) as cnt FROM zlecenia z ${joinEtykiety} WHERE ${whereClause}`,
            params
        );

        return parseInt(result.cnt);
    }

    /**
     * Aktualizuj zlecenie
     */
    async update(id, data, userId) {
        // Pobierz obecny status
        const current = await this.getById(id);
        if (!current) {
            return false;
        }

        // Jeśli zmienia się status, dodaj do historii
        if (data.status && data.status !== current.status) {
            await this.addHistory(id, userId, current.status, data.status);
        }

        // Jeśli status = zakonczone, ustaw datę zakończenia
        if (data.status === 'zakonczone' && !current.zakonczono) {
            data.zakonczono = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        await this.db.update('zlecenia', data, 'id = ?', [id]);
        return true;
    }

    /**
     * Zmień status
     */
    async changeStatus(id, newStatus, userId, komentarz = '') {
        const current = await this.getById(id);
        if (!current) {
            return false;
        }

        const data = { status: newStatus };
        if (newStatus === 'zakonczone') {
            data.zakonczono = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        await this.db.update('zlecenia', data, 'id = ?', [id]);
        await this.addHistory(id, userId, current.status, newStatus, komentarz);

        return true;
    }

    /**
     * Dodaj historię statusu
     */
    async addHistory(zlecenieId, userId, oldStatus, newStatus, komentarz = '') {
        await this.db.insert('historia_statusow', {
            zlecenie_id: zlecenieId,
            uzytkownik_id: userId,
            status_poprzedni: oldStatus,
            status_nowy: newStatus,
            komentarz
        });
    }

    /**
     * Pobierz historię statusów
     */
    async getHistory(zlecenieId) {
        return await this.db.fetchAll(
            `SELECT h.*, u.imie, u.nazwisko
             FROM historia_statusow h
             LEFT JOIN uzytkownicy u ON h.uzytkownik_id = u.id
             WHERE h.zlecenie_id = ?
             ORDER BY h.utworzono DESC`,
            [zlecenieId]
        );
    }

    /**
     * Pobierz komentarze
     */
    async getComments(zlecenieId, includeInternal = false) {
        let where = 'k.zlecenie_id = ?';
        let params = [zlecenieId];

        if (!includeInternal) {
            where += ' AND k.typ = ?';
            params.push('publiczny');
        }

        return await this.db.fetchAll(
            `SELECT k.*, u.imie, u.nazwisko, u.rola, u.avatar
             FROM komentarze k
             LEFT JOIN uzytkownicy u ON k.uzytkownik_id = u.id
             WHERE ${where}
             ORDER BY k.utworzono ASC`,
            params
        );
    }

    /**
     * Dodaj komentarz
     */
    async addComment(zlecenieId, userId, tresc, typ = 'publiczny') {
        return await this.db.insert('komentarze', {
            zlecenie_id: zlecenieId,
            uzytkownik_id: userId,
            tresc,
            typ
        });
    }

    /**
     * Pobierz załączniki
     */
    async getAttachments(zlecenieId, typ = null) {
        let where = 'zlecenie_id = ?';
        let params = [zlecenieId];

        if (typ) {
            where += ' AND typ = ?';
            params.push(typ);
        }

        return await this.db.fetchAll(
            `SELECT z.*, u.imie, u.nazwisko
             FROM zalaczniki z
             LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
             WHERE ${where}
             ORDER BY z.utworzono DESC`,
            params
        );
    }

    /**
     * Dodaj załącznik
     */
    async addAttachment(zlecenieId, userId, fileData) {
        return await this.db.insert('zalaczniki', {
            zlecenie_id: zlecenieId,
            uzytkownik_id: userId,
            nazwa_oryginalna: fileData.nazwa_oryginalna,
            nazwa_pliku: fileData.nazwa_pliku,
            sciezka: fileData.sciezka,
            rozmiar: fileData.rozmiar,
            typ_mime: fileData.typ_mime,
            typ: fileData.typ || 'wejsciowy'
        });
    }

    /**
     * Pobierz statystyki
     */
    async getStats(firmaId = null) {
        const where = firmaId ? 'WHERE firma_id = ?' : '';
        const params = firmaId ? [firmaId] : [];

        const stats = {};

        // Zliczanie po statusach
        const results = await this.db.fetchAll(
            `SELECT status, COUNT(*) as cnt FROM zlecenia ${where} GROUP BY status`,
            params
        );

        stats.statusy = {};
        for (const key of Object.keys(STATUSY)) {
            stats.statusy[key] = 0;
        }
        for (const row of results) {
            stats.statusy[row.status] = parseInt(row.cnt);
        }

        // Suma wszystkich
        stats.wszystkie = Object.values(stats.statusy).reduce((a, b) => a + b, 0);

        // Aktywne (nie zakończone/anulowane)
        stats.aktywne = stats.wszystkie - stats.statusy.zakonczone - stats.statusy.anulowane;

        return stats;
    }

    /**
     * Pobierz kategorie
     */
    async getCategories() {
        return await this.db.fetchAll(
            'SELECT * FROM kategorie WHERE aktywna = 1 ORDER BY kolejnosc'
        );
    }
}

module.exports = Zlecenie;
module.exports.STATUSY = STATUSY;
module.exports.PRIORYTETY = PRIORYTETY;
