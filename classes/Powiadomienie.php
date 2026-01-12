<?php
/**
 * Klasa obsługi powiadomień w systemie
 */
class Powiadomienie {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Utwórz powiadomienie
     */
    public function create(int $userId, string $tytul, string $tresc = '', string $typ = 'info', ?int $zlecenieId = null): int {
        return $this->db->insert('powiadomienia', [
            'uzytkownik_id' => $userId,
            'zlecenie_id' => $zlecenieId,
            'tytul' => $tytul,
            'tresc' => $tresc,
            'typ' => $typ
        ]);
    }

    /**
     * Pobierz powiadomienia użytkownika
     */
    public function getByUser(int $userId, bool $tylkoNieprzeczytane = false, int $limit = 20): array {
        $where = 'uzytkownik_id = ?';
        $params = [$userId];

        if ($tylkoNieprzeczytane) {
            $where .= ' AND przeczytane = 0';
        }

        return $this->db->fetchAll(
            "SELECT p.*, z.numer as zlecenie_numer, z.tytul as zlecenie_tytul
             FROM powiadomienia p
             LEFT JOIN zlecenia z ON p.zlecenie_id = z.id
             WHERE $where
             ORDER BY p.utworzono DESC
             LIMIT $limit",
            $params
        );
    }

    /**
     * Policz nieprzeczytane
     */
    public function countUnread(int $userId): int {
        $result = $this->db->fetch(
            "SELECT COUNT(*) as cnt FROM powiadomienia WHERE uzytkownik_id = ? AND przeczytane = 0",
            [$userId]
        );
        return (int) $result['cnt'];
    }

    /**
     * Oznacz jako przeczytane
     */
    public function markAsRead(int $id): bool {
        return $this->db->update('powiadomienia', ['przeczytane' => 1], 'id = ?', [$id]) > 0;
    }

    /**
     * Oznacz wszystkie jako przeczytane
     */
    public function markAllAsRead(int $userId): int {
        return $this->db->update('powiadomienia', ['przeczytane' => 1], 'uzytkownik_id = ? AND przeczytane = 0', [$userId]);
    }

    /**
     * Usuń powiadomienie
     */
    public function delete(int $id): bool {
        return $this->db->delete('powiadomienia', 'id = ?', [$id]) > 0;
    }

    /**
     * Usuń stare powiadomienia (starsze niż X dni)
     */
    public function deleteOld(int $days = 30): int {
        return $this->db->delete('powiadomienia', 'utworzono < DATE_SUB(NOW(), INTERVAL ? DAY)', [$days]);
    }

    /**
     * Powiadom o nowym zleceniu (dla admina)
     */
    public function notifyNewOrder(array $zlecenie): void {
        // Pobierz wszystkich adminów
        $admins = $this->db->fetchAll("SELECT id FROM uzytkownicy WHERE rola = 'admin' AND aktywny = 1");

        foreach ($admins as $admin) {
            $this->create(
                $admin['id'],
                'Nowe zlecenie: ' . $zlecenie['numer'],
                'Wpłynęło nowe zlecenie: ' . $zlecenie['tytul'],
                'info',
                $zlecenie['id']
            );
        }
    }

    /**
     * Powiadom o zmianie statusu
     */
    public function notifyStatusChange(array $zlecenie, string $newStatus): void {
        $statusy = Zlecenie::STATUSY;
        $statusNazwa = $statusy[$newStatus]['nazwa'] ?? $newStatus;

        $this->create(
            $zlecenie['uzytkownik_id'],
            'Zmiana statusu: ' . $zlecenie['numer'],
            'Status zlecenia zmieniony na: ' . $statusNazwa,
            'info',
            $zlecenie['id']
        );
    }

    /**
     * Powiadom o nowym komentarzu
     */
    public function notifyNewComment(array $zlecenie, int $autorId, string $autorName): void {
        // Powiadom autora zlecenia jeśli to nie on dodał komentarz
        if ($zlecenie['uzytkownik_id'] != $autorId) {
            $this->create(
                $zlecenie['uzytkownik_id'],
                'Nowa wiadomość w zleceniu ' . $zlecenie['numer'],
                $autorName . ' dodał wiadomość',
                'info',
                $zlecenie['id']
            );
        }

        // Powiadom adminów
        $admins = $this->db->fetchAll("SELECT id FROM uzytkownicy WHERE rola = 'admin' AND aktywny = 1 AND id != ?", [$autorId]);

        foreach ($admins as $admin) {
            $this->create(
                $admin['id'],
                'Nowa wiadomość: ' . $zlecenie['numer'],
                $autorName . ' dodał wiadomość do zlecenia',
                'info',
                $zlecenie['id']
            );
        }
    }
}
