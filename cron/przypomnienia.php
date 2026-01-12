<?php
/**
 * Skrypt CRON - Przypomnienia o terminach
 *
 * Uruchom codziennie: 0 8 * * * php /path/to/cron/przypomnienia.php
 */

// Dla skryptu CLI
if (php_sapi_name() !== 'cli') {
    die('Ten skrypt może być uruchomiony tylko z linii poleceń.');
}

require_once __DIR__ . '/../includes/init.php';

$db = Database::getInstance();
$mailer = new Mailer();
$powiadomienie = new Powiadomienie();

echo "=== Wysyłanie przypomnień o terminach ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Pobierz zlecenia z terminem na jutro
$jutro = date('Y-m-d', strtotime('+1 day'));
$zleceniaJutro = $db->fetchAll(
    "SELECT z.*, f.nazwa as firma_nazwa,
            u.imie as autor_imie, u.nazwisko as autor_nazwisko, u.email as autor_email
     FROM zlecenia z
     LEFT JOIN firmy f ON z.firma_id = f.id
     LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
     WHERE z.termin_realizacji = ?
     AND z.status NOT IN ('zakonczone', 'anulowane')
     ORDER BY z.priorytet DESC",
    [$jutro]
);

echo "Znaleziono " . count($zleceniaJutro) . " zleceń z terminem na jutro.\n";

foreach ($zleceniaJutro as $z) {
    // Wyślij email do admina
    $adminEmail = 'admin@graphflow.pl'; // Można pobrać z ustawień

    $subject = "Przypomnienie: Termin zlecenia {$z['numer']} mija jutro!";
    $body = "
        <h2>Przypomnienie o terminie zlecenia</h2>
        <p>Termin realizacji zlecenia <strong>{$z['numer']}</strong> mija <strong>jutro ({$jutro})</strong>.</p>

        <table style='border-collapse: collapse; margin: 20px 0;'>
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd; background: #f8f9fa;'><strong>Numer:</strong></td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['numer']}</td>
            </tr>
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd; background: #f8f9fa;'><strong>Tytuł:</strong></td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['tytul']}</td>
            </tr>
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd; background: #f8f9fa;'><strong>Firma:</strong></td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['firma_nazwa']}</td>
            </tr>
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd; background: #f8f9fa;'><strong>Status:</strong></td>
                <td style='padding: 8px; border: 1px solid #ddd;'>" . status_name($z['status']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd; background: #f8f9fa;'><strong>Priorytet:</strong></td>
                <td style='padding: 8px; border: 1px solid #ddd;'>" . priority_name($z['priorytet']) . "</td>
            </tr>
        </table>

        <p><a href='" . APP_URL . "/admin/zlecenie.php?id={$z['id']}' style='display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px;'>Zobacz zlecenie</a></p>
    ";

    try {
        $mailer->send($adminEmail, $subject, $body);
        echo "  [OK] Wysłano przypomnienie dla zlecenia {$z['numer']} (termin: jutro)\n";
    } catch (Exception $e) {
        echo "  [BŁĄD] Nie udało się wysłać przypomnienia dla {$z['numer']}: {$e->getMessage()}\n";
    }
}

// Pobierz zlecenia przeterminowane (termin już minął)
$dzis = date('Y-m-d');
$przeterminowane = $db->fetchAll(
    "SELECT z.*, f.nazwa as firma_nazwa,
            u.imie as autor_imie, u.nazwisko as autor_nazwisko, u.email as autor_email,
            DATEDIFF(?, z.termin_realizacji) as dni_po_terminie
     FROM zlecenia z
     LEFT JOIN firmy f ON z.firma_id = f.id
     LEFT JOIN uzytkownicy u ON z.uzytkownik_id = u.id
     WHERE z.termin_realizacji < ?
     AND z.status NOT IN ('zakonczone', 'anulowane')
     ORDER BY z.termin_realizacji ASC",
    [$dzis, $dzis]
);

echo "\nZnaleziono " . count($przeterminowane) . " zleceń przeterminowanych.\n";

if (count($przeterminowane) > 0) {
    // Wyślij zbiorczy raport o przeterminowanych
    $adminEmail = 'admin@graphflow.pl';

    $tableRows = '';
    foreach ($przeterminowane as $z) {
        $tableRows .= "
            <tr>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['numer']}</td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['tytul']}</td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['firma_nazwa']}</td>
                <td style='padding: 8px; border: 1px solid #ddd;'>{$z['termin_realizacji']}</td>
                <td style='padding: 8px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;'>{$z['dni_po_terminie']} dni</td>
                <td style='padding: 8px; border: 1px solid #ddd;'>" . status_name($z['status']) . "</td>
            </tr>
        ";
    }

    $subject = "UWAGA: " . count($przeterminowane) . " zleceń po terminie!";
    $body = "
        <h2 style='color: #dc2626;'>Zlecenia przeterminowane</h2>
        <p>Następujące zlecenia przekroczyły termin realizacji:</p>

        <table style='border-collapse: collapse; width: 100%; margin: 20px 0;'>
            <thead>
                <tr style='background: #f8f9fa;'>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Numer</th>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Tytuł</th>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Firma</th>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Termin</th>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Po terminie</th>
                    <th style='padding: 10px; border: 1px solid #ddd; text-align: left;'>Status</th>
                </tr>
            </thead>
            <tbody>
                {$tableRows}
            </tbody>
        </table>

        <p><a href='" . APP_URL . "/admin/zlecenia.php' style='display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px;'>Zobacz wszystkie zlecenia</a></p>
    ";

    try {
        $mailer->send($adminEmail, $subject, $body);
        echo "  [OK] Wysłano raport o przeterminowanych zleceniach\n";
    } catch (Exception $e) {
        echo "  [BŁĄD] Nie udało się wysłać raportu: {$e->getMessage()}\n";
    }
}

// Przetwórz niestandardowe przypomnienia z tabeli przypomnienia
$przypomnienia = $db->fetchAll(
    "SELECT p.*, z.numer as zlecenie_numer, z.tytul as zlecenie_tytul,
            u.email as uzytkownik_email, u.imie, u.nazwisko
     FROM przypomnienia p
     LEFT JOIN zlecenia z ON p.zlecenie_id = z.id
     LEFT JOIN uzytkownicy u ON p.uzytkownik_id = u.id
     WHERE p.wyslane = 0
     AND p.data_przypomnienia <= NOW()"
);

echo "\nZnaleziono " . count($przypomnienia) . " niestandardowych przypomnień do wysłania.\n";

foreach ($przypomnienia as $p) {
    $subject = "Przypomnienie: " . $p['tytul'];
    $body = "
        <h2>Przypomnienie</h2>
        <p><strong>{$p['tytul']}</strong></p>
        " . ($p['tresc'] ? "<p>{$p['tresc']}</p>" : "") . "
        " . ($p['zlecenie_numer'] ? "<p>Dotyczy zlecenia: <strong>{$p['zlecenie_numer']}</strong> - {$p['zlecenie_tytul']}</p>" : "") . "
        " . ($p['zlecenie_id'] ? "<p><a href='" . APP_URL . "/admin/zlecenie.php?id={$p['zlecenie_id']}' style='display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px;'>Zobacz zlecenie</a></p>" : "") . "
    ";

    try {
        $mailer->send($p['uzytkownik_email'], $subject, $body);
        $db->update('przypomnienia', ['wyslane' => 1], 'id = ?', [$p['id']]);
        echo "  [OK] Wysłano przypomnienie '{$p['tytul']}' do {$p['uzytkownik_email']}\n";
    } catch (Exception $e) {
        echo "  [BŁĄD] Nie udało się wysłać przypomnienia '{$p['tytul']}': {$e->getMessage()}\n";
    }
}

echo "\n=== Zakończono ===\n";
