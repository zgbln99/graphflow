<?php
/**
 * Klasa autoryzacji użytkowników
 */
class Auth {
    private $db;
    private static $currentUser = null;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Logowanie użytkownika
     */
    public function login(string $email, string $password): array {
        $user = $this->db->fetch(
            "SELECT u.*, f.nazwa as firma_nazwa
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE u.email = ? AND u.aktywny = 1",
            [$email]
        );

        if (!$user) {
            return ['success' => false, 'message' => 'Nieprawidłowy email lub hasło'];
        }

        if (!password_verify($password, $user['haslo'])) {
            return ['success' => false, 'message' => 'Nieprawidłowy email lub hasło'];
        }

        // Sprawdź czy firma jest aktywna (dla klientów)
        if ($user['rola'] === 'klient' && $user['firma_id']) {
            $firma = $this->db->fetch("SELECT aktywna FROM firmy WHERE id = ?", [$user['firma_id']]);
            if (!$firma || !$firma['aktywna']) {
                return ['success' => false, 'message' => 'Konto firmy zostało dezaktywowane'];
            }
        }

        // Aktualizuj ostatnie logowanie
        $this->db->update('uzytkownicy', ['ostatnie_logowanie' => date('Y-m-d H:i:s')], 'id = ?', [$user['id']]);

        // Ustaw sesję
        $this->setSession($user);

        return ['success' => true, 'user' => $user];
    }

    /**
     * Wylogowanie
     */
    public function logout(): void {
        session_unset();
        session_destroy();
        self::$currentUser = null;
    }

    /**
     * Sprawdź czy użytkownik jest zalogowany
     */
    public function isLoggedIn(): bool {
        return isset($_SESSION['user_id']) && $_SESSION['user_id'] > 0;
    }

    /**
     * Pobierz zalogowanego użytkownika
     */
    public function getUser(): ?array {
        if (!$this->isLoggedIn()) {
            return null;
        }

        if (self::$currentUser === null) {
            self::$currentUser = $this->db->fetch(
                "SELECT u.*, f.nazwa as firma_nazwa
                 FROM uzytkownicy u
                 LEFT JOIN firmy f ON u.firma_id = f.id
                 WHERE u.id = ?",
                [$_SESSION['user_id']]
            );
        }

        return self::$currentUser;
    }

    /**
     * Sprawdź czy użytkownik jest adminem
     */
    public function isAdmin(): bool {
        $user = $this->getUser();
        return $user && $user['rola'] === 'admin';
    }

    /**
     * Sprawdź czy użytkownik jest pracownikiem
     */
    public function isStaff(): bool {
        $user = $this->getUser();
        return $user && in_array($user['rola'], ['admin', 'pracownik']);
    }

    /**
     * Utwórz hash hasła
     */
    public function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * Generuj token resetowania hasła
     */
    public function generateResetToken(string $email): ?string {
        $user = $this->db->fetch("SELECT id FROM uzytkownicy WHERE email = ? AND aktywny = 1", [$email]);

        if (!$user) {
            return null;
        }

        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $this->db->update('uzytkownicy', [
            'token_reset' => $token,
            'token_reset_wazny' => $expiry
        ], 'id = ?', [$user['id']]);

        return $token;
    }

    /**
     * Resetuj hasło tokenem
     */
    public function resetPassword(string $token, string $newPassword): bool {
        $user = $this->db->fetch(
            "SELECT id FROM uzytkownicy WHERE token_reset = ? AND token_reset_wazny > NOW()",
            [$token]
        );

        if (!$user) {
            return false;
        }

        $this->db->update('uzytkownicy', [
            'haslo' => $this->hashPassword($newPassword),
            'token_reset' => null,
            'token_reset_wazny' => null
        ], 'id = ?', [$user['id']]);

        return true;
    }

    /**
     * Zmień hasło
     */
    public function changePassword(int $userId, string $oldPassword, string $newPassword): array {
        $user = $this->db->fetch("SELECT haslo FROM uzytkownicy WHERE id = ?", [$userId]);

        if (!$user) {
            return ['success' => false, 'message' => 'Użytkownik nie istnieje'];
        }

        if (!password_verify($oldPassword, $user['haslo'])) {
            return ['success' => false, 'message' => 'Nieprawidłowe obecne hasło'];
        }

        $this->db->update('uzytkownicy', [
            'haslo' => $this->hashPassword($newPassword)
        ], 'id = ?', [$userId]);

        return ['success' => true, 'message' => 'Hasło zostało zmienione'];
    }

    /**
     * Ustaw sesję
     */
    private function setSession(array $user): void {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['rola'];
        $_SESSION['user_name'] = $user['imie'] . ' ' . $user['nazwisko'];
        $_SESSION['firma_id'] = $user['firma_id'];
        $_SESSION['login_time'] = time();
    }

    /**
     * Wymaga zalogowania
     */
    public function requireLogin(): void {
        if (!$this->isLoggedIn()) {
            header('Location: ' . APP_URL . '/login.php');
            exit;
        }
    }

    /**
     * Wymaga roli admina
     */
    public function requireAdmin(): void {
        $this->requireLogin();
        if (!$this->isAdmin()) {
            header('Location: ' . APP_URL . '/panel/');
            exit;
        }
    }

    /**
     * Wymaga roli staff
     */
    public function requireStaff(): void {
        $this->requireLogin();
        if (!$this->isStaff()) {
            header('Location: ' . APP_URL . '/panel/');
            exit;
        }
    }
}
