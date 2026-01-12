<?php
/**
 * Klasa obsługi wysyłki maili
 */
class Mailer {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Wyślij mail (z użyciem PHP mail() lub SMTP)
     */
    public function send(string $to, string $subject, string $body, ?int $zlecenieId = null): bool {
        // Loguj próbę wysyłki
        $logId = $this->logMail($zlecenieId, $to, $subject, $body);

        try {
            // Nagłówki HTML
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>',
                'Reply-To: ' . MAIL_FROM,
                'X-Mailer: PHP/' . phpversion()
            ];

            // Próba wysyłki
            $result = @mail($to, $subject, $body, implode("\r\n", $headers));

            // Aktualizuj log
            $this->updateLogStatus($logId, $result ? 'wyslany' : 'blad', $result ? null : 'Błąd funkcji mail()');

            return $result;
        } catch (Exception $e) {
            $this->updateLogStatus($logId, 'blad', $e->getMessage());
            return false;
        }
    }

    /**
     * Wyślij powiadomienie o nowym zleceniu
     */
    public function sendNewOrderNotification(array $zlecenie, string $adminEmail): bool {
        $subject = "Nowe zlecenie: {$zlecenie['numer']} - {$zlecenie['tytul']}";

        $body = $this->renderTemplate('nowe_zlecenie', [
            'zlecenie' => $zlecenie,
            'link' => APP_URL . '/admin/zlecenie.php?id=' . $zlecenie['id']
        ]);

        return $this->send($adminEmail, $subject, $body, $zlecenie['id']);
    }

    /**
     * Wyślij potwierdzenie złożenia zlecenia do klienta
     */
    public function sendOrderConfirmation(array $zlecenie, string $clientEmail): bool {
        $subject = "Potwierdzenie zlecenia: {$zlecenie['numer']}";

        $body = $this->renderTemplate('potwierdzenie_zlecenia', [
            'zlecenie' => $zlecenie,
            'link' => APP_URL . '/panel/zlecenie.php?id=' . $zlecenie['id']
        ]);

        return $this->send($clientEmail, $subject, $body, $zlecenie['id']);
    }

    /**
     * Wyślij powiadomienie o zmianie statusu
     */
    public function sendStatusChangeNotification(array $zlecenie, string $oldStatus, string $newStatus, string $clientEmail): bool {
        $statusy = Zlecenie::STATUSY;
        $statusNazwa = $statusy[$newStatus]['nazwa'] ?? $newStatus;

        $subject = "Zmiana statusu zlecenia {$zlecenie['numer']}: {$statusNazwa}";

        $body = $this->renderTemplate('zmiana_statusu', [
            'zlecenie' => $zlecenie,
            'stary_status' => $statusy[$oldStatus]['nazwa'] ?? $oldStatus,
            'nowy_status' => $statusNazwa,
            'link' => APP_URL . '/panel/zlecenie.php?id=' . $zlecenie['id']
        ]);

        return $this->send($clientEmail, $subject, $body, $zlecenie['id']);
    }

    /**
     * Wyślij powiadomienie o nowym komentarzu
     */
    public function sendCommentNotification(array $zlecenie, string $komentarz, string $autorName, string $recipientEmail): bool {
        $subject = "Nowa wiadomość w zleceniu {$zlecenie['numer']}";

        $body = $this->renderTemplate('nowy_komentarz', [
            'zlecenie' => $zlecenie,
            'komentarz' => $komentarz,
            'autor' => $autorName,
            'link' => APP_URL . '/panel/zlecenie.php?id=' . $zlecenie['id']
        ]);

        return $this->send($recipientEmail, $subject, $body, $zlecenie['id']);
    }

    /**
     * Wyślij powiadomienie o zakończeniu zlecenia
     */
    public function sendOrderCompletedNotification(array $zlecenie, string $clientEmail): bool {
        $subject = "Zlecenie {$zlecenie['numer']} zostało zakończone!";

        $body = $this->renderTemplate('zlecenie_zakonczone', [
            'zlecenie' => $zlecenie,
            'link' => APP_URL . '/panel/zlecenie.php?id=' . $zlecenie['id']
        ]);

        return $this->send($clientEmail, $subject, $body, $zlecenie['id']);
    }

    /**
     * Renderuj szablon email
     */
    private function renderTemplate(string $template, array $data): string {
        extract($data);

        // Bazowy styl
        $baseStyle = '
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .info-box { background: #f3f4f6; border-radius: 8px; padding: 15px; margin: 15px 0; }
            .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        ';

        ob_start();

        switch ($template) {
            case 'nowe_zlecenie':
                echo $this->getBaseHtml($baseStyle, '
                    <div class="header">
                        <h1>🎨 Nowe Zlecenie!</h1>
                    </div>
                    <div class="content">
                        <p>Wpłynęło nowe zlecenie graficzne:</p>
                        <div class="info-box">
                            <p class="label">Numer zlecenia</p>
                            <p style="font-size: 20px; font-weight: 700; color: #667eea; margin: 5px 0;">' . htmlspecialchars($zlecenie['numer']) . '</p>
                        </div>
                        <div class="info-box">
                            <p class="label">Tytuł</p>
                            <p style="font-weight: 600; margin: 5px 0;">' . htmlspecialchars($zlecenie['tytul']) . '</p>
                        </div>
                        <div class="info-box">
                            <p class="label">Klient</p>
                            <p style="margin: 5px 0;">' . htmlspecialchars($zlecenie['firma_nazwa'] ?? 'Brak firmy') . '</p>
                        </div>
                        <div class="info-box">
                            <p class="label">Opis</p>
                            <p style="margin: 5px 0;">' . nl2br(htmlspecialchars($zlecenie['opis'])) . '</p>
                        </div>
                        <center><a href="' . $link . '" class="btn">Zobacz zlecenie →</a></center>
                    </div>
                ');
                break;

            case 'potwierdzenie_zlecenia':
                echo $this->getBaseHtml($baseStyle, '
                    <div class="header">
                        <h1>✅ Zlecenie przyjęte!</h1>
                    </div>
                    <div class="content">
                        <p>Dziękujemy za złożenie zlecenia. Poniżej szczegóły:</p>
                        <div class="info-box">
                            <p class="label">Numer zlecenia</p>
                            <p style="font-size: 24px; font-weight: 700; color: #667eea; margin: 5px 0;">' . htmlspecialchars($zlecenie['numer']) . '</p>
                        </div>
                        <div class="info-box">
                            <p class="label">Tytuł</p>
                            <p style="font-weight: 600; margin: 5px 0;">' . htmlspecialchars($zlecenie['tytul']) . '</p>
                        </div>
                        <p style="color: #6b7280;">Zajmiemy się Twoim zleceniem najszybciej jak to możliwe. O każdej zmianie statusu zostaniesz powiadomiony mailowo.</p>
                        <center><a href="' . $link . '" class="btn">Śledź status zlecenia →</a></center>
                    </div>
                ');
                break;

            case 'zmiana_statusu':
                $kolory = [
                    'nowe' => '#3b82f6',
                    'w_realizacji' => '#eab308',
                    'oczekuje' => '#f97316',
                    'do_akceptacji' => '#a855f7',
                    'poprawki' => '#ef4444',
                    'zakonczone' => '#22c55e',
                    'anulowane' => '#6b7280'
                ];
                $kolor = $kolory[$zlecenie['status']] ?? '#6b7280';

                echo $this->getBaseHtml($baseStyle, '
                    <div class="header">
                        <h1>📋 Zmiana statusu zlecenia</h1>
                    </div>
                    <div class="content">
                        <div class="info-box">
                            <p class="label">Zlecenie</p>
                            <p style="font-weight: 700; margin: 5px 0;">' . htmlspecialchars($zlecenie['numer']) . ' - ' . htmlspecialchars($zlecenie['tytul']) . '</p>
                        </div>
                        <div style="text-align: center; padding: 20px 0;">
                            <span style="color: #9ca3af; text-decoration: line-through;">' . htmlspecialchars($stary_status) . '</span>
                            <span style="margin: 0 15px;">→</span>
                            <span class="status-badge" style="background: ' . $kolor . '20; color: ' . $kolor . ';">' . htmlspecialchars($nowy_status) . '</span>
                        </div>
                        <center><a href="' . $link . '" class="btn">Zobacz szczegóły →</a></center>
                    </div>
                ');
                break;

            case 'nowy_komentarz':
                echo $this->getBaseHtml($baseStyle, '
                    <div class="header">
                        <h1>💬 Nowa wiadomość</h1>
                    </div>
                    <div class="content">
                        <p><strong>' . htmlspecialchars($autor) . '</strong> dodał wiadomość do zlecenia:</p>
                        <div class="info-box">
                            <p class="label">Zlecenie</p>
                            <p style="font-weight: 600; margin: 5px 0;">' . htmlspecialchars($zlecenie['numer']) . ' - ' . htmlspecialchars($zlecenie['tytul']) . '</p>
                        </div>
                        <div class="info-box" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
                            <p style="margin: 0; white-space: pre-wrap;">' . nl2br(htmlspecialchars($komentarz)) . '</p>
                        </div>
                        <center><a href="' . $link . '" class="btn">Odpowiedz →</a></center>
                    </div>
                ');
                break;

            case 'zlecenie_zakonczone':
                echo $this->getBaseHtml($baseStyle, '
                    <div class="header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                        <h1>🎉 Zlecenie zakończone!</h1>
                    </div>
                    <div class="content">
                        <p>Mamy przyjemność poinformować, że Twoje zlecenie zostało zrealizowane!</p>
                        <div class="info-box">
                            <p class="label">Zlecenie</p>
                            <p style="font-size: 20px; font-weight: 700; color: #22c55e; margin: 5px 0;">' . htmlspecialchars($zlecenie['numer']) . '</p>
                            <p style="font-weight: 600; margin: 5px 0;">' . htmlspecialchars($zlecenie['tytul']) . '</p>
                        </div>
                        ' . ($zlecenie['link_podglad'] ? '
                        <div class="info-box">
                            <p class="label">Link do podglądu</p>
                            <p><a href="' . htmlspecialchars($zlecenie['link_podglad']) . '" style="color: #667eea;">' . htmlspecialchars($zlecenie['link_podglad']) . '</a></p>
                        </div>' : '') . '
                        ' . ($zlecenie['link_pliki'] ? '
                        <div class="info-box">
                            <p class="label">Link do plików</p>
                            <p><a href="' . htmlspecialchars($zlecenie['link_pliki']) . '" style="color: #667eea;">' . htmlspecialchars($zlecenie['link_pliki']) . '</a></p>
                        </div>' : '') . '
                        <center><a href="' . $link . '" class="btn" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">Zobacz zlecenie →</a></center>
                        <p style="color: #6b7280; text-align: center;">Dziękujemy za współpracę! 💚</p>
                    </div>
                ');
                break;
        }

        return ob_get_clean();
    }

    /**
     * Bazowy HTML maila
     */
    private function getBaseHtml(string $style, string $content): string {
        return '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . APP_NAME . '</title>
    <style>' . $style . '</style>
</head>
<body>
    <div class="container">
        ' . $content . '
        <div class="footer">
            <p><strong>' . APP_NAME . '</strong></p>
            <p>Ten email został wygenerowany automatycznie. Prosimy nie odpowiadać bezpośrednio na tę wiadomość.</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Loguj mail
     */
    private function logMail(?int $zlecenieId, string $to, string $subject, string $body): int {
        return $this->db->insert('logi_mail', [
            'zlecenie_id' => $zlecenieId,
            'odbiorca' => $to,
            'temat' => $subject,
            'tresc' => $body,
            'status' => 'oczekuje'
        ]);
    }

    /**
     * Aktualizuj status logu
     */
    private function updateLogStatus(int $logId, string $status, ?string $error = null): void {
        $this->db->update('logi_mail', [
            'status' => $status,
            'blad_info' => $error
        ], 'id = ?', [$logId]);
    }
}
