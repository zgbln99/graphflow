<?php
/**
 * Klasa obsługi użytkowników
 */
class Uzytkownik {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Utwórz nowego użytkownika
     */
    public function create(array $data): int {
        $auth = new Auth();

        return $this->db->insert('uzytkownicy', [
            'firma_id' => $data['firma_id'] ?? null,
            'email' => $data['email'],
            'haslo' => $auth->hashPassword($data['haslo']),
            'imie' => $data['imie'],
            'nazwisko' => $data['nazwisko'],
            'telefon' => $data['telefon'] ?? null,
            'stanowisko' => $data['stanowisko'] ?? null,
            'rola' => $data['rola'] ?? 'klient',
            'aktywny' => $data['aktywny'] ?? 1
        ]);
    }

    /**
     * Pobierz użytkownika po ID
     */
    public function getById(int $id): ?array {
        return $this->db->fetch(
            "SELECT u.*, f.nazwa as firma_nazwa
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE u.id = ?",
            [$id]
        );
    }

    /**
     * Pobierz użytkownika po email
     */
    public function getByEmail(string $email): ?array {
        return $this->db->fetch("SELECT * FROM uzytkownicy WHERE email = ?", [$email]);
    }

    /**
     * Pobierz listę użytkowników
     */
    public function getList(array $filters = [], int $limit = 100, int $offset = 0): array {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['firma_id'])) {
            $where[] = 'u.firma_id = ?';
            $params[] = $filters['firma_id'];
        }

        if (!empty($filters['rola'])) {
            $where[] = 'u.rola = ?';
            $params[] = $filters['rola'];
        }

        if (isset($filters['aktywny'])) {
            $where[] = 'u.aktywny = ?';
            $params[] = $filters['aktywny'];
        }

        if (!empty($filters['szukaj'])) {
            $where[] = '(u.imie LIKE ? OR u.nazwisko LIKE ? OR u.email LIKE ?)';
            $search = '%' . $filters['szukaj'] . '%';
            $params = array_merge($params, [$search, $search, $search]);
        }

        $whereClause = implode(' AND ', $where);

        return $this->db->fetchAll(
            "SELECT u.*, f.nazwa as firma_nazwa,
                    (SELECT COUNT(*) FROM zlecenia WHERE uzytkownik_id = u.id) as liczba_zlecen
             FROM uzytkownicy u
             LEFT JOIN firmy f ON u.firma_id = f.id
             WHERE $whereClause
             ORDER BY u.nazwisko, u.imie
             LIMIT $limit OFFSET $offset",
            $params
        );
    }

    /**
     * Aktualizuj użytkownika
     */
    public function update(int $id, array $data): bool {
        // Jeśli hasło jest puste, usuń z aktualizacji
        if (isset($data['haslo']) && empty($data['haslo'])) {
            unset($data['haslo']);
        } elseif (!empty($data['haslo'])) {
            $auth = new Auth();
            $data['haslo'] = $auth->hashPassword($data['haslo']);
        }

        return $this->db->update('uzytkownicy', $data, 'id = ?', [$id]) > 0;
    }

    /**
     * Usuń użytkownika
     */
    public function delete(int $id): bool {
        return $this->db->delete('uzytkownicy', 'id = ?', [$id]) > 0;
    }

    /**
     * Aktywuj/dezaktywuj użytkownika
     */
    public function toggleActive(int $id): bool {
        $user = $this->getById($id);
        if (!$user) return false;

        return $this->update($id, ['aktywny' => $user['aktywny'] ? 0 : 1]);
    }

    /**
     * Sprawdź czy email jest zajęty
     */
    public function emailExists(string $email, ?int $excludeId = null): bool {
        $params = [$email];
        $where = 'email = ?';

        if ($excludeId) {
            $where .= ' AND id != ?';
            $params[] = $excludeId;
        }

        $result = $this->db->fetch("SELECT COUNT(*) as cnt FROM uzytkownicy WHERE $where", $params);
        return $result['cnt'] > 0;
    }

    /**
     * Pobierz pełne imię
     */
    public function getFullName(int $id): string {
        $user = $this->getById($id);
        return $user ? $user['imie'] . ' ' . $user['nazwisko'] : '';
    }

    /**
     * Policz użytkowników
     */
    public function count(array $filters = []): int {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['rola'])) {
            $where[] = 'rola = ?';
            $params[] = $filters['rola'];
        }

        if (isset($filters['aktywny'])) {
            $where[] = 'aktywny = ?';
            $params[] = $filters['aktywny'];
        }

        $whereClause = implode(' AND ', $where);
        $result = $this->db->fetch("SELECT COUNT(*) as cnt FROM uzytkownicy WHERE $whereClause", $params);

        return (int) $result['cnt'];
    }
}
