<?php
/**
 * Strona główna - przekierowanie do logowania lub panelu
 */
require_once __DIR__ . '/includes/init.php';

if ($auth->isLoggedIn()) {
    // Przekieruj do odpowiedniego panelu
    if ($auth->isAdmin() || $auth->getUser()['rola'] === 'pracownik') {
        redirect(APP_URL . '/admin/');
    } else {
        redirect(APP_URL . '/panel/');
    }
} else {
    redirect(APP_URL . '/login.php');
}
