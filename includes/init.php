<?php
/**
 * Plik inicjalizacji aplikacji
 * Ładuje konfigurację, klasy i uruchamia sesję
 */

// Rozpocznij sesję
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Załaduj konfigurację
require_once __DIR__ . '/../config/database.php';

// Autoloader klas
spl_autoload_register(function ($class) {
    $file = ROOT_PATH . '/classes/' . $class . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Funkcje pomocnicze
require_once __DIR__ . '/helpers.php';

// Zabezpieczenie CSRF
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Pobierz token CSRF
 */
function csrf_token(): string {
    return $_SESSION['csrf_token'];
}

/**
 * Sprawdź token CSRF
 */
function verify_csrf(string $token): bool {
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Wygeneruj pole CSRF
 */
function csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
}

/**
 * Sprawdź czy to żądanie POST z poprawnym CSRF
 */
function is_post(): bool {
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

/**
 * Sprawdź CSRF dla POST
 */
function check_csrf(): bool {
    if (!is_post()) return true;
    return isset($_POST['csrf_token']) && verify_csrf($_POST['csrf_token']);
}

// Globalne obiekty
$auth = new Auth();
$currentUser = $auth->getUser();
