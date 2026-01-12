<?php
/**
 * Wylogowanie użytkownika
 */
require_once __DIR__ . '/includes/init.php';

$auth->logout();
redirect(APP_URL . '/login.php');
