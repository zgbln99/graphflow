/**
 * Funkcje pomocnicze
 * Panel Zleceń Graficznych
 */

const { STATUSY, PRIORYTETY } = require('../models/Zlecenie');

/**
 * Escape HTML
 */
function e(string) {
    if (!string) return '';
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Formatuj datę po polsku
 */
function formatDate(date, format = 'dd.MM.yyyy') {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return format
        .replace('dd', day)
        .replace('MM', month)
        .replace('yyyy', year);
}

/**
 * Formatuj datę i czas po polsku
 */
function formatDatetime(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Formatuj datę relatywnie
 */
function timeAgo(datetime) {
    if (!datetime) return '';
    const time = new Date(datetime).getTime();
    const diff = Math.floor((Date.now() - time) / 1000);

    if (diff < 60) {
        return 'przed chwilą';
    } else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        return `${mins} min. temu`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} godz. temu`;
    } else if (diff < 604800) {
        const days = Math.floor(diff / 86400);
        return `${days} dn. temu`;
    } else {
        return formatDate(datetime);
    }
}

/**
 * Formatuj rozmiar pliku
 */
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${Math.round(bytes * 100) / 100} ${units[i]}`;
}

/**
 * Generuj losowy string
 */
function randomString(length = 32) {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Pobierz inicjały z imienia i nazwiska
 */
function getInitials(name) {
    if (!name) return '';
    const parts = name.split(' ');
    let initials = '';
    for (const part of parts) {
        initials += part.charAt(0).toUpperCase();
    }
    return initials.substring(0, 2);
}

/**
 * Waliduj email
 */
function validEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Sprawdź czy string jest pusty
 */
function blank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Skróć tekst
 */
function truncate(text, length = 100, suffix = '...') {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + suffix;
}

/**
 * Zwróć klasę koloru dla statusu
 */
function statusColor(status) {
    const colors = {
        nowe: 'blue',
        w_realizacji: 'yellow',
        oczekuje: 'orange',
        do_akceptacji: 'purple',
        poprawki: 'red',
        zakonczone: 'green',
        anulowane: 'gray'
    };
    return colors[status] || 'gray';
}

/**
 * Zwróć nazwę statusu
 */
function statusName(status) {
    return STATUSY[status]?.nazwa || status;
}

/**
 * Zwróć klasę koloru dla priorytetu
 */
function priorityColor(priority) {
    const colors = {
        niski: 'gray',
        normalny: 'blue',
        wysoki: 'orange',
        pilny: 'red'
    };
    return colors[priority] || 'gray';
}

/**
 * Zwróć nazwę priorytetu
 */
function priorityName(priority) {
    return PRIORYTETY[priority]?.nazwa || priority;
}

/**
 * Generuj slug z tekstu
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Sprawdź czy użytkownik ma dostęp do zlecenia
 */
function canAccessOrder(zlecenie, user) {
    // Admin i pracownik mają dostęp do wszystkiego
    if (user.rola === 'admin' || user.rola === 'pracownik') {
        return true;
    }
    // Klient ma dostęp tylko do zleceń swojej firmy
    return zlecenie.firma_id === user.firma_id;
}

/**
 * Zwróć ikonę dla typu pliku
 */
function fileIcon(mime) {
    if (!mime) return 'file';
    if (mime.includes('image')) return 'image';
    if (mime.includes('pdf')) return 'file-text';
    if (mime.includes('word')) return 'file-text';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return 'table';
    if (mime.includes('zip') || mime.includes('rar')) return 'archive';
    if (mime.includes('video')) return 'film';
    return 'file';
}

module.exports = {
    e,
    formatDate,
    formatDatetime,
    timeAgo,
    formatSize,
    randomString,
    getInitials,
    validEmail,
    blank,
    truncate,
    statusColor,
    statusName,
    priorityColor,
    priorityName,
    slugify,
    canAccessOrder,
    fileIcon,
    STATUSY,
    PRIORYTETY
};
