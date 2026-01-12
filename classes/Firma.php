<?php
/**
 * Klasa obsługi firm/klientów
 */
class Firma {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Utwórz nową firmę
     */
    public function create(array $data): int {
        return $this->db->insert('firmy', [
            'nazwa' => $data['nazwa'],
            'nip' => $data['nip'] ?? null,
            'adres' => $data['adres'] ?? null,
            'telefon' => $data['telefon'] ?? null,
            'email' => $data['email'],
            'notatki_wewnetrzne' => $data['notatki_wewnetrzne'] ?? null,
            'aktywna' => $data['aktywna'] ?? 1
        ]);
    }

    /**
     * Pobierz firmę po ID
     */
    public function getById(int $id): ?array {
        return $this->db->fetch("SELECT * FROM firmy WHERE id = ?", [$id]);
    }

    /**
     * Pobierz listę firm
     */
    public function getList(array $filters = [], int $limit = 100, int $offset = 0): array {
        $where = ['1=1'];
        $params = [];

        if (isset($filters['aktywna'])) {
            $where[] = 'aktywna = ?';
            $params[] = $filters['aktywna'];
        }

        if (!empty($filters['szukaj'])) {
            $where[] = '(nazwa LIKE ? OR email LIKE ? OR nip LIKE ?)';
            $search = '%' . $filters['szukaj'] . '%';
            $params = array_merge($params, [$search, $search, $search]);
        }

        $whereClause = implode(' AND ', $where);

        return $this->db->fetchAll(
            "SELECT f.*,
                    (SELECT COUNT(*) FROM uzytkownicy WHERE firma_id = f.id) as liczba_uzytkownikow,
                    (SELECT COUNT(*) FROM zlecenia WHERE firma_id = f.id) as liczba_zlecen
             FROM firmy f
             WHERE $whereClause
             ORDER BY f.nazwa ASC
             LIMIT $limit OFFSET $offset",
            $params
        );
    }

    /**
     * Aktualizuj firmę
     */
    public function update(int $id, array $data): bool {
        return $this->db->update('firmy', $data, 'id = ?', [$id]) > 0;
    }

    /**
     * Usuń firmę
     */
    public function delete(int $id): bool {
        return $this->db->delete('firmy', 'id = ?', [$id]) > 0;
    }

    /**
     * Aktywuj/dezaktywuj firmę
     */
    public function toggleActive(int $id): bool {
        $firma = $this->getById($id);
        if (!$firma) return false;

        return $this->update($id, ['aktywna' => $firma['aktywna'] ? 0 : 1]);
    }

    /**
     * Pobierz użytkowników firmy
     */
    public function getUsers(int $firmaId): array {
        return $this->db->fetchAll(
            "SELECT * FROM uzytkownicy WHERE firma_id = ? ORDER BY nazwisko, imie",
            [$firmaId]
        );
    }

    /**
     * Policz firmy
     */
    public function count(array $filters = []): int {
        $where = ['1=1'];
        $params = [];

        if (isset($filters['aktywna'])) {
            $where[] = 'aktywna = ?';
            $params[] = $filters['aktywna'];
        }

        $whereClause = implode(' AND ', $where);
        $result = $this->db->fetch("SELECT COUNT(*) as cnt FROM firmy WHERE $whereClause", $params);

        return (int) $result['cnt'];
    }

    /**
     * Pobierz statystyki firmy
     */
    public function getStats(int $firmaId): array {
        $zlecenie = new Zlecenie();
        return $zlecenie->getStats($firmaId);
    }
}
