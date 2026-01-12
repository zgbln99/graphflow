<?php
/**
 * Funkcje pomocnicze
 */

/**
 * Escape HTML
 */
function e(string $string): string {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

/**
 * Przekieruj
 */
function redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

/**
 * Ustaw wiadomość flash
 */
function flash(string $type, string $message): void {
    $_SESSION['flash'][$type][] = $message;
}

/**
 * Pobierz i wyczyść wiadomości flash
 */
function get_flash(): array {
    $messages = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $messages;
}

/**
 * Sprawdź czy są wiadomości flash
 */
function has_flash(): bool {
    return !empty($_SESSION['flash']);
}

/**
 * Formatuj datę po polsku
 */
function format_date(string $date, string $format = 'd.m.Y'): string {
    return date($format, strtotime($date));
}

/**
 * Formatuj datę i czas po polsku
 */
function format_datetime(string $datetime): string {
    return date('d.m.Y H:i', strtotime($datetime));
}

/**
 * Formatuj datę relatywnie
 */
function time_ago(string $datetime): string {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) {
        return 'przed chwilą';
    } elseif ($diff < 3600) {
        $mins = floor($diff / 60);
        return $mins . ' min. temu';
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . ' godz. temu';
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return $days . ' dn. temu';
    } else {
        return format_date($datetime);
    }
}

/**
 * Formatuj rozmiar pliku
 */
function format_size(int $bytes): string {
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    return round($bytes, 2) . ' ' . $units[$i];
}

/**
 * Generuj losowy string
 */
function random_string(int $length = 32): string {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Pobierz inicjały z imienia i nazwiska
 */
function get_initials(string $name): string {
    $parts = explode(' ', $name);
    $initials = '';
    foreach ($parts as $part) {
        $initials .= mb_strtoupper(mb_substr($part, 0, 1));
    }
    return mb_substr($initials, 0, 2);
}

/**
 * Waliduj email
 */
function valid_email(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Sprawdź czy string jest pusty
 */
function blank(?string $value): bool {
    return $value === null || trim($value) === '';
}

/**
 * Pobierz wartość z tablicy lub domyślną
 */
function arr_get(array $array, string $key, $default = null) {
    return $array[$key] ?? $default;
}

/**
 * Skróć tekst
 */
function truncate(string $text, int $length = 100, string $suffix = '...'): string {
    if (mb_strlen($text) <= $length) {
        return $text;
    }
    return mb_substr($text, 0, $length) . $suffix;
}

/**
 * Zwróć klasę koloru dla statusu
 */
function status_color(string $status): string {
    $colors = [
        'nowe' => 'blue',
        'w_realizacji' => 'yellow',
        'oczekuje' => 'orange',
        'do_akceptacji' => 'purple',
        'poprawki' => 'red',
        'zakonczone' => 'green',
        'anulowane' => 'gray'
    ];
    return $colors[$status] ?? 'gray';
}

/**
 * Zwróć nazwę statusu
 */
function status_name(string $status): string {
    $names = Zlecenie::STATUSY;
    return $names[$status]['nazwa'] ?? $status;
}

/**
 * Zwróć klasę koloru dla priorytetu
 */
function priority_color(string $priority): string {
    $colors = [
        'niski' => 'gray',
        'normalny' => 'blue',
        'wysoki' => 'orange',
        'pilny' => 'red'
    ];
    return $colors[$priority] ?? 'gray';
}

/**
 * Zwróć nazwę priorytetu
 */
function priority_name(string $priority): string {
    $names = Zlecenie::PRIORYTETY;
    return $names[$priority]['nazwa'] ?? $priority;
}

/**
 * Generuj slug z tekstu
 */
function slugify(string $text): string {
    $text = mb_strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

/**
 * Bezpieczne pobieranie z GET
 */
function get(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}

/**
 * Bezpieczne pobieranie z POST
 */
function post(string $key, $default = null) {
    return $_POST[$key] ?? $default;
}

/**
 * Sprawdź czy użytkownik ma dostęp do zlecenia
 */
function can_access_order(array $zlecenie, array $user): bool {
    // Admin ma dostęp do wszystkiego
    if ($user['rola'] === 'admin' || $user['rola'] === 'pracownik') {
        return true;
    }

    // Klient ma dostęp tylko do zleceń swojej firmy
    return $zlecenie['firma_id'] === $user['firma_id'];
}

/**
 * Zwróć ikonę dla typu pliku
 */
function file_icon(string $mime): string {
    if (strpos($mime, 'image') !== false) return 'image';
    if (strpos($mime, 'pdf') !== false) return 'file-text';
    if (strpos($mime, 'word') !== false) return 'file-text';
    if (strpos($mime, 'excel') !== false || strpos($mime, 'spreadsheet') !== false) return 'table';
    if (strpos($mime, 'zip') !== false || strpos($mime, 'rar') !== false) return 'archive';
    if (strpos($mime, 'video') !== false) return 'film';
    return 'file';
}
