<?php
/**
 * API - Powiadomienia
 */
require_once __DIR__ . '/../../includes/init.php';

header('Content-Type: application/json');

if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$user = $auth->getUser();
$powiadomienie = new Powiadomienie();

$notifications = $powiadomienie->getByUser($user['id'], false, 10);

$result = [];
foreach ($notifications as $n) {
    $baseUrl = $user['rola'] === 'admin' || $user['rola'] === 'pracownik' ? APP_URL . '/admin' : APP_URL . '/panel';

    $result[] = [
        'id' => $n['id'],
        'tytul' => $n['tytul'],
        'tresc' => $n['tresc'],
        'typ' => $n['typ'],
        'przeczytane' => (bool) $n['przeczytane'],
        'czas' => time_ago($n['utworzono']),
        'link' => $n['zlecenie_id'] ? $baseUrl . '/zlecenie.php?id=' . $n['zlecenie_id'] : '#'
    ];
}

echo json_encode($result);
