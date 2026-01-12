<?php
/**
 * Klasa obsługi zleceń
 */
class Zlecenie {
    private $db;

    // Statusy z polskimi nazwami i kolorami
    public const STATUSY = [
        'nowe' => ['nazwa' => 'Nowe', 'kolor' => 'blue', 'ikona' => 'plus-circle'],
        'w_realizacji' => ['nazwa' => 'W realizacji', 'kolor' => 'yellow', 'ikona' => 'clock'],
        'oczekuje' => ['nazwa' => 'Oczekuje', 'kolor' => 'orange', 'ikona' => 'pause-circle'],
        'do_akceptacji' => ['nazwa' => 'Do akceptacji', 'kolor' => 'purple', 'ikona' => 'eye'],
        'poprawki' => ['nazwa' => 'Poprawki', 'kolor' => 'red', 'ikona' => 'edit'],
        'zakonczone' => ['nazwa' => 'Zakończone', 'kolor' => 'green', 'ikona' => 'check-circle'],
        'anulowane' => ['nazwa' => 'Anulowane', 'kolor' => 'gray', 'ikona' => 'x-circle']
    ];

    public const PRIORYTETY = [
        'niski' => ['nazwa' => 'Niski', 'kolor' => 'gray'],
        'normalny' => ['nazwa' => 'Normalny', 'kolor' => 'blue'],
        'wysoki' => ['nazwa' => 'Wysoki', 'kolor' => 'orange'],
        'pilny' => ['nazwa' => 'Pilny', 'kolor' => 'red']
    ];

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Generuj numer zlecenia
     */
    public function generateNumber(): string {
        $prefix = $this->getSetting('numer_zlecenia_prefix', 'GF');
        $rok = date('Y');

        // Pobierz i zwiększ licznik
        $currentYear = $this->getSetting('numer_zlecenia_rok', $rok);
        $counter = (int) $this->getSetting('numer_zlecenia_licznik', '0');

        // Reset licznika na nowy rok
        if ($currentYear != $rok) {
            $counter = 0;
            $this->updateSetting('numer_zlecenia_rok', $rok);
        }

        $counter++;
        $this->updateSetting('numer_zlecenia_licznik', (string) $counter);

        return sprintf('%s/%s/%04d', $prefix, $rok, $counter);
    }

    /**
     * Utwórz nowe zlecenie
     */
    public function create(array $data): int {
        $numer = $this->generateNumber();

        $zlecenie = [
            'numer' => $numer,
            'firma_id' => $data['firma_id'],
            'uzytkownik_id' => $data['uzytkownik_id'],
            'kategoria_id' => $data['kategoria_id'] ?? null,
            'tytul' => $data['tytul'],
            'opis' => $data['opis'],
            'priorytet' => $data['priorytet'] ?? 'normalny',
            'status' => 'nowe',
            'termin_realizacji' => $data['termin_realizacji'] ?? null
        ];

        $id = $this->db->insert('zlecenia', $zlecenie);

        // Dodaj do historii
        $this->addHistory($id, $data['uzytkownik_id'], null, 'nowe', 'Utworzono nowe zlecenie');

        return $id;
    }

    /**
     * Pobierz zlecenie po ID
     */
    public function getById(int $id): ?array {
        return $this->db->fetch(
            "SELECT z.*,
                    f.nazwa as firma_nazwa,
                    u.imie as autor_imie, u.nazwisko as autor_nazwisko, u.email as autor_email,
                    k.nazwa as kategoria_nazwa, k.kolor as kategoria_kolor
             FROM zlecenia z
             LEFT JOIN firmy f ON z.firma_id = f.id
             LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
             LEFT JOIN kategorie k ON z.kategoria_id = k.id
             WHERE z.id = ?",
            [$id]
        );
    }

    /**
     * Pobierz zlecenie po numerze
     */
    public function getByNumber(string $numer): ?array {
        return $this->db->fetch(
            "SELECT z.*, f.nazwa as firma_nazwa
             FROM zlecenia z
             LEFT JOIN firmy f ON z.firma_id = f.id
             WHERE z.numer = ?",
            [$numer]
        );
    }

    /**
     * Pobierz listę zleceń
     */
    public function getList(array $filters = [], int $limit = 50, int $offset = 0): array {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['firma_id'])) {
            $where[] = 'z.firma_id = ?';
            $params[] = $filters['firma_id'];
        }

        if (!empty($filters['uzytkownik_id'])) {
            $where[] = 'z.uzytkownik_id = ?';
            $params[] = $filters['uzytkownik_id'];
        }

        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $placeholders = implode(',', array_fill(0, count($filters['status']), '?'));
                $where[] = "z.status IN ($placeholders)";
                $params = array_merge($params, $filters['status']);
            } else {
                $where[] = 'z.status = ?';
                $params[] = $filters['status'];
            }
        }

        if (!empty($filters['priorytet'])) {
            $where[] = 'z.priorytet = ?';
            $params[] = $filters['priorytet'];
        }

        if (!empty($filters['kategoria_id'])) {
            $where[] = 'z.kategoria_id = ?';
            $params[] = $filters['kategoria_id'];
        }

        if (!empty($filters['szukaj'])) {
            $where[] = '(z.tytul LIKE ? OR z.numer LIKE ? OR z.opis LIKE ?)';
            $search = '%' . $filters['szukaj'] . '%';
            $params = array_merge($params, [$search, $search, $search]);
        }

        // Filtr etykiet
        $joinEtykiety = '';
        if (!empty($filters['etykieta_id'])) {
            $joinEtykiety = 'INNER JOIN zlecenia_etykiety ze ON z.id = ze.zlecenie_id';
            $where[] = 'ze.etykieta_id = ?';
            $params[] = $filters['etykieta_id'];
        }

        $whereClause = implode(' AND ', $where);
        $orderBy = $filters['order'] ?? 'z.utworzono DESC';

        $sql = "SELECT DISTINCT z.*,
                       f.nazwa as firma_nazwa,
                       u.imie as autor_imie, u.nazwisko as autor_nazwisko,
                       k.nazwa as kategoria_nazwa, k.kolor as kategoria_kolor
                FROM zlecenia z
                LEFT JOIN firmy f ON z.firma_id = f.id
                LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
                LEFT JOIN kategorie k ON z.kategoria_id = k.id
                $joinEtykiety
                WHERE $whereClause
                ORDER BY $orderBy
                LIMIT $limit OFFSET $offset";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Policz zlecenia
     */
    public function count(array $filters = []): int {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['firma_id'])) {
            $where[] = 'z.firma_id = ?';
            $params[] = $filters['firma_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'z.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['priorytet'])) {
            $where[] = 'z.priorytet = ?';
            $params[] = $filters['priorytet'];
        }

        if (!empty($filters['szukaj'])) {
            $where[] = '(z.tytul LIKE ? OR z.numer LIKE ? OR z.opis LIKE ?)';
            $search = '%' . $filters['szukaj'] . '%';
            $params = array_merge($params, [$search, $search, $search]);
        }

        // Filtr etykiet
        $joinEtykiety = '';
        if (!empty($filters['etykieta_id'])) {
            $joinEtykiety = 'INNER JOIN zlecenia_etykiety ze ON z.id = ze.zlecenie_id';
            $where[] = 'ze.etykieta_id = ?';
            $params[] = $filters['etykieta_id'];
        }

        $whereClause = implode(' AND ', $where);
        $result = $this->db->fetch(
            "SELECT COUNT(DISTINCT z.id) as cnt FROM zlecenia z $joinEtykiety WHERE $whereClause",
            $params
        );

        return (int) $result['cnt'];
    }

    /**
     * Aktualizuj zlecenie
     */
    public function update(int $id, array $data, int $userId): bool {
        // Pobierz obecny status
        $current = $this->getById($id);
        if (!$current) {
            return false;
        }

        // Jeśli zmienia się status, dodaj do historii
        if (isset($data['status']) && $data['status'] !== $current['status']) {
            $this->addHistory($id, $userId, $current['status'], $data['status']);
        }

        // Jeśli status = zakonczone, ustaw datę zakończenia
        if (isset($data['status']) && $data['status'] === 'zakonczone' && !$current['zakonczono']) {
            $data['zakonczono'] = date('Y-m-d H:i:s');
        }

        $this->db->update('zlecenia', $data, 'id = ?', [$id]);
        return true;
    }

    /**
     * Zmień status
     */
    public function changeStatus(int $id, string $newStatus, int $userId, string $komentarz = ''): bool {
        $current = $this->getById($id);
        if (!$current) {
            return false;
        }

        $data = ['status' => $newStatus];
        if ($newStatus === 'zakonczone') {
            $data['zakonczono'] = date('Y-m-d H:i:s');
        }

        $this->db->update('zlecenia', $data, 'id = ?', [$id]);
        $this->addHistory($id, $userId, $current['status'], $newStatus, $komentarz);

        return true;
    }

    /**
     * Dodaj historię statusu
     */
    public function addHistory(int $zlecenieId, int $userId, ?string $oldStatus, string $newStatus, string $komentarz = ''): void {
        $this->db->insert('historia_statusow', [
            'zlecenie_id' => $zlecenieId,
            'uzytkownik_id' => $userId,
            'status_poprzedni' => $oldStatus,
            'status_nowy' => $newStatus,
            'komentarz' => $komentarz
        ]);
    }

    /**
     * Pobierz historię statusów
     */
    public function getHistory(int $zlecenieId): array {
        return $this->db->fetchAll(
            "SELECT h.*, u.imie, u.nazwisko
             FROM historia_statusow h
             LEFT JOIN uzytkownicy u ON h.uzytkownik_id = u.id
             WHERE h.zlecenie_id = ?
             ORDER BY h.utworzono DESC",
            [$zlecenieId]
        );
    }

    /**
     * Pobierz komentarze
     */
    public function getComments(int $zlecenieId, bool $includeInternal = false): array {
        $where = 'k.zlecenie_id = ?';
        $params = [$zlecenieId];

        if (!$includeInternal) {
            $where .= ' AND k.typ = ?';
            $params[] = 'publiczny';
        }

        return $this->db->fetchAll(
            "SELECT k.*, u.imie, u.nazwisko, u.rola, u.avatar
             FROM komentarze k
             LEFT JOIN uzytkownicy u ON k.uzytkownik_id = u.id
             WHERE $where
             ORDER BY k.utworzono ASC",
            $params
        );
    }

    /**
     * Dodaj komentarz
     */
    public function addComment(int $zlecenieId, int $userId, string $tresc, string $typ = 'publiczny'): int {
        return $this->db->insert('komentarze', [
            'zlecenie_id' => $zlecenieId,
            'uzytkownik_id' => $userId,
            'tresc' => $tresc,
            'typ' => $typ
        ]);
    }

    /**
     * Pobierz załączniki
     */
    public function getAttachments(int $zlecenieId, ?string $typ = null): array {
        $where = 'zlecenie_id = ?';
        $params = [$zlecenieId];

        if ($typ) {
            $where .= ' AND typ = ?';
            $params[] = $typ;
        }

        return $this->db->fetchAll(
            "SELECT z.*, u.imie, u.nazwisko
             FROM zalaczniki z
             LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
             WHERE $where
             ORDER BY z.utworzono DESC",
            $params
        );
    }

    /**
     * Dodaj załącznik
     */
    public function addAttachment(int $zlecenieId, int $userId, array $fileData): int {
        return $this->db->insert('zalaczniki', [
            'zlecenie_id' => $zlecenieId,
            'uzytkownik_id' => $userId,
            'nazwa_oryginalna' => $fileData['nazwa_oryginalna'],
            'nazwa_pliku' => $fileData['nazwa_pliku'],
            'sciezka' => $fileData['sciezka'],
            'rozmiar' => $fileData['rozmiar'],
            'typ_mime' => $fileData['typ_mime'],
            'typ' => $fileData['typ'] ?? 'wejsciowy'
        ]);
    }

    /**
     * Pobierz statystyki
     */
    public function getStats(?int $firmaId = null): array {
        $where = $firmaId ? 'WHERE firma_id = ?' : '';
        $params = $firmaId ? [$firmaId] : [];

        $stats = [];

        // Zliczanie po statusach
        $results = $this->db->fetchAll(
            "SELECT status, COUNT(*) as cnt FROM zlecenia $where GROUP BY status",
            $params
        );

        $stats['statusy'] = [];
        foreach (self::STATUSY as $key => $value) {
            $stats['statusy'][$key] = 0;
        }
        foreach ($results as $row) {
            $stats['statusy'][$row['status']] = (int) $row['cnt'];
        }

        // Suma wszystkich
        $stats['wszystkie'] = array_sum($stats['statusy']);

        // Aktywne (nie zakończone/anulowane)
        $stats['aktywne'] = $stats['wszystkie'] - $stats['statusy']['zakonczone'] - $stats['statusy']['anulowane'];

        return $stats;
    }

    /**
     * Pobierz kategorie
     */
    public function getCategories(): array {
        return $this->db->fetchAll("SELECT * FROM kategorie WHERE aktywna = 1 ORDER BY kolejnosc");
    }

    /**
     * Pobierz ustawienie
     */
    private function getSetting(string $key, string $default = ''): string {
        $result = $this->db->fetch("SELECT wartosc FROM ustawienia WHERE klucz = ?", [$key]);
        return $result ? $result['wartosc'] : $default;
    }

    /**
     * Aktualizuj ustawienie
     */
    private function updateSetting(string $key, string $value): void {
        $this->db->query(
            "INSERT INTO ustawienia (klucz, wartosc) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE wartosc = VALUES(wartosc)",
            [$key, $value]
        );
    }
}
