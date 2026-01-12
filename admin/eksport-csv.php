<?php
/**
 * Panel admina - Eksport zleceń do CSV
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$db = Database::getInstance();
$zlecenieModel = new Zlecenie();

// Pobierz filtry z GET
$filters = [];

if (!empty($_GET['status'])) {
    $filters['status'] = $_GET['status'];
}
if (!empty($_GET['priorytet'])) {
    $filters['priorytet'] = $_GET['priorytet'];
}
if (!empty($_GET['firma_id'])) {
    $filters['firma_id'] = $_GET['firma_id'];
}
if (!empty($_GET['data_od'])) {
    $filters['data_od'] = $_GET['data_od'];
}
if (!empty($_GET['data_do'])) {
    $filters['data_do'] = $_GET['data_do'];
}

// Specjalny handling dla dat w getList
$whereExtra = [];
$paramsExtra = [];

if (!empty($filters['data_od'])) {
    $whereExtra[] = 'z.utworzono >= ?';
    $paramsExtra[] = $filters['data_od'] . ' 00:00:00';
    unset($filters['data_od']);
}
if (!empty($filters['data_do'])) {
    $whereExtra[] = 'z.utworzono <= ?';
    $paramsExtra[] = $filters['data_do'] . ' 23:59:59';
    unset($filters['data_do']);
}

// Buduj zapytanie
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

$where = array_merge($where, $whereExtra);
$params = array_merge($params, $paramsExtra);

$whereClause = implode(' AND ', $where);

$zlecenia = $db->fetchAll(
    "SELECT z.*,
            f.nazwa as firma_nazwa,
            u.imie as autor_imie, u.nazwisko as autor_nazwisko, u.email as autor_email,
            k.nazwa as kategoria_nazwa
     FROM zlecenia z
     LEFT JOIN firmy f ON z.firma_id = f.id
     LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
     LEFT JOIN kategorie k ON z.kategoria_id = k.id
     WHERE $whereClause
     ORDER BY z.utworzono DESC",
    $params
);

// Generuj CSV
$filename = 'zlecenia_' . date('Y-m-d_His') . '.csv';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// BOM dla poprawnego kodowania w Excelu
echo "\xEF\xBB\xBF";

$output = fopen('php://output', 'w');

// Nagłówki
fputcsv($output, [
    'Numer',
    'Tytuł',
    'Status',
    'Priorytet',
    'Firma',
    'Autor',
    'Email autora',
    'Kategoria',
    'Data utworzenia',
    'Termin realizacji',
    'Data zakończenia',
    'Czas pracy (min)',
    'Koszt szacowany',
    'Koszt końcowy',
    'Opis'
], ';');

// Dane
foreach ($zlecenia as $z) {
    fputcsv($output, [
        $z['numer'],
        $z['tytul'],
        status_name($z['status']),
        priority_name($z['priorytet']),
        $z['firma_nazwa'],
        $z['autor_imie'] . ' ' . $z['autor_nazwisko'],
        $z['autor_email'],
        $z['kategoria_nazwa'] ?? '',
        $z['utworzono'],
        $z['termin_realizacji'] ?? '',
        $z['zakonczono'] ?? '',
        $z['czas_pracy_minuty'] ?? 0,
        $z['koszt_szacowany'] ?? '',
        $z['koszt_koncowy'] ?? '',
        str_replace(["\r\n", "\n", "\r"], ' ', $z['opis'])
    ], ';');
}

fclose($output);
exit;
