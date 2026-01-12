<?php
/**
 * Konfiguracja bazy danych
 * Panel Zleceń Graficznych
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'u918515209_obdyp');
define('DB_USER', 'u918515209_obdyp');
define('DB_PASS', '8bZ>9P@!hhN');
define('DB_CHARSET', 'utf8mb4');

// Konfiguracja aplikacji
define('APP_NAME', 'GraphFlow');
define('APP_URL', 'https://snow-moose-741801.hostingersite.com');
define('APP_VERSION', '1.0.0');

// Konfiguracja mailowa (SMTP)
define('MAIL_HOST', 'smtp.example.com');
define('MAIL_PORT', 587);
define('MAIL_USER', 'noreply@example.com');
define('MAIL_PASS', 'password');
define('MAIL_FROM', 'noreply@example.com');
define('MAIL_FROM_NAME', 'GraphFlow Panel');

// Ścieżki
define('ROOT_PATH', dirname(__DIR__));
define('UPLOADS_PATH', ROOT_PATH . '/uploads');
define('TEMPLATES_PATH', ROOT_PATH . '/templates');

// Bezpieczeństwo
define('SECRET_KEY', 'zmien_ten_klucz_na_losowy_ciag_znakow_32_znaki!');

// Strefy czasowe
date_default_timezone_set('Europe/Warsaw');

// Sesja
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
