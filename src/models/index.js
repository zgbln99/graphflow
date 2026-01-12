/**
 * Export wszystkich modeli
 */

const Zlecenie = require('./Zlecenie');
const Uzytkownik = require('./Uzytkownik');
const Firma = require('./Firma');
const Powiadomienie = require('./Powiadomienie');

module.exports = {
    Zlecenie,
    Uzytkownik,
    Firma,
    Powiadomienie,
    STATUSY: Zlecenie.STATUSY,
    PRIORYTETY: Zlecenie.PRIORYTETY
};
