<?php
/**
 * Panel admina - Szczegóły zlecenia
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    redirect('zlecenia.php');
}

$zlecenieModel = new Zlecenie();
$zlecenie = $zlecenieModel->getById($id);

if (!$zlecenie) {
    flash('error', 'Nie znaleziono zlecenia');
    redirect('zlecenia.php');
}

// Pobierz dane powiązane
$komentarze = $zlecenieModel->getComments($id, true); // Włącznie z wewnętrznymi
$zalaczniki = $zlecenieModel->getAttachments($id);
$historia = $zlecenieModel->getHistory($id);
$kategorie = $zlecenieModel->getCategories();

// Pobierz szablony szybkich odpowiedzi
$db = Database::getInstance();
$szablony = $db->fetchAll("SELECT * FROM szablony_odpowiedzi WHERE aktywny = 1 ORDER BY kolejnosc, tytul");

// Pobierz etykiety
$wszystkieEtykiety = $db->fetchAll("SELECT * FROM etykiety ORDER BY nazwa");
$etykietyZlecenia = $db->fetchAll(
    "SELECT e.* FROM etykiety e
     JOIN zlecenia_etykiety ze ON e.id = ze.etykieta_id
     WHERE ze.zlecenie_id = ?",
    [$id]
);
$etykietyZleceniaIds = array_column($etykietyZlecenia, 'id');

$errors = [];

// Obsługa formularza - zmiana statusu
if (is_post() && check_csrf()) {
    $action = $_POST['action'] ?? '';

    switch ($action) {
        case 'status':
            $newStatus = $_POST['status'] ?? '';
            $komentarzStatus = trim($_POST['komentarz_status'] ?? '');

            if (array_key_exists($newStatus, Zlecenie::STATUSY)) {
                $oldStatus = $zlecenie['status'];
                $zlecenieModel->changeStatus($id, $newStatus, $user['id'], $komentarzStatus);

                // Wyślij powiadomienie mailowe
                if ($newStatus !== $oldStatus) {
                    $mailer = new Mailer();

                    // Pobierz email autora zlecenia
                    $zlecenie = $zlecenieModel->getById($id);

                    if ($newStatus === 'zakonczone') {
                        $mailer->sendOrderCompletedNotification($zlecenie, $zlecenie['autor_email']);
                    } else {
                        $mailer->sendStatusChangeNotification($zlecenie, $oldStatus, $newStatus, $zlecenie['autor_email']);
                    }

                    // Powiadomienie w systemie
                    $powiadomienie = new Powiadomienie();
                    $powiadomienie->notifyStatusChange($zlecenie, $newStatus);
                }

                flash('success', 'Status został zmieniony');
            }
            break;

        case 'comment':
            $tresc = trim($_POST['komentarz'] ?? '');
            $typ = $_POST['typ_komentarza'] ?? 'publiczny';

            if (!empty($tresc)) {
                $zlecenieModel->addComment($id, $user['id'], $tresc, $typ);

                // Wyślij mail tylko dla komentarzy publicznych
                if ($typ === 'publiczny') {
                    $mailer = new Mailer();
                    $mailer->sendCommentNotification(
                        $zlecenie,
                        $tresc,
                        $user['imie'] . ' ' . $user['nazwisko'],
                        $zlecenie['autor_email']
                    );

                    $powiadomienie = new Powiadomienie();
                    $powiadomienie->notifyNewComment($zlecenie, $user['id'], $user['imie'] . ' ' . $user['nazwisko']);
                }

                flash('success', 'Komentarz został dodany');
            }
            break;

        case 'toggle_etykieta':
            $etykietaId = (int) ($_POST['etykieta_id'] ?? 0);
            if ($etykietaId > 0) {
                // Sprawdź czy etykieta jest już przypisana
                $istnieje = $db->fetch(
                    "SELECT 1 FROM zlecenia_etykiety WHERE zlecenie_id = ? AND etykieta_id = ?",
                    [$id, $etykietaId]
                );

                if ($istnieje) {
                    // Usuń etykietę
                    $db->query(
                        "DELETE FROM zlecenia_etykiety WHERE zlecenie_id = ? AND etykieta_id = ?",
                        [$id, $etykietaId]
                    );
                } else {
                    // Dodaj etykietę
                    $db->insert('zlecenia_etykiety', [
                        'zlecenie_id' => $id,
                        'etykieta_id' => $etykietaId
                    ]);
                }
            }
            break;

        case 'update':
            $updateData = [];

            // Linki końcowe
            if (isset($_POST['link_podglad'])) {
                $updateData['link_podglad'] = trim($_POST['link_podglad']);
            }
            if (isset($_POST['link_pliki'])) {
                $updateData['link_pliki'] = trim($_POST['link_pliki']);
            }

            // Notatki wewnętrzne
            if (isset($_POST['notatki_wewnetrzne'])) {
                $updateData['notatki_wewnetrzne'] = trim($_POST['notatki_wewnetrzne']);
            }

            // Lokalizacja plików
            if (isset($_POST['lokalizacja_plikow'])) {
                $updateData['lokalizacja_plikow'] = trim($_POST['lokalizacja_plikow']);
            }

            // Koszty
            if (isset($_POST['koszt_szacowany'])) {
                $updateData['koszt_szacowany'] = floatval($_POST['koszt_szacowany']) ?: null;
            }
            if (isset($_POST['koszt_koncowy'])) {
                $updateData['koszt_koncowy'] = floatval($_POST['koszt_koncowy']) ?: null;
            }

            // Czas pracy
            if (isset($_POST['czas_pracy_minuty'])) {
                $updateData['czas_pracy_minuty'] = intval($_POST['czas_pracy_minuty']);
            }

            if (!empty($updateData)) {
                $zlecenieModel->update($id, $updateData, $user['id']);
                flash('success', 'Dane zostały zaktualizowane');
            }
            break;
    }

    redirect('zlecenie.php?id=' . $id);
}

// Odśwież dane
$zlecenie = $zlecenieModel->getById($id);
$komentarze = $zlecenieModel->getComments($id, true);

$pageTitle = 'Zlecenie ' . $zlecenie['numer'];
$isAdmin = true;

ob_start();
?>

<div class="max-w-6xl">
    <!-- Header -->
    <div class="mb-6">
        <a href="zlecenia.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do listy</span>
        </a>

        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
                <div class="flex flex-wrap items-center gap-3 mb-2">
                    <span class="text-sm font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg"><?= e($zlecenie['numer']) ?></span>
                    <span class="status-badge bg-<?= status_color($zlecenie['status']) ?>-100 text-<?= status_color($zlecenie['status']) ?>-700">
                        <span class="w-2 h-2 rounded-full bg-<?= status_color($zlecenie['status']) ?>-500"></span>
                        <?= status_name($zlecenie['status']) ?>
                    </span>
                    <span class="status-badge bg-<?= priority_color($zlecenie['priorytet']) ?>-100 text-<?= priority_color($zlecenie['priorytet']) ?>-700">
                        <?= priority_name($zlecenie['priorytet']) ?>
                    </span>
                    <?php foreach ($etykietyZlecenia as $et): ?>
                    <span class="px-2 py-0.5 text-xs font-medium rounded-full" style="background: <?= e($et['kolor']) ?>20; color: <?= e($et['kolor']) ?>">
                        <?= e($et['nazwa']) ?>
                    </span>
                    <?php endforeach; ?>
                </div>
                <h2 class="text-2xl font-bold text-slate-800"><?= e($zlecenie['tytul']) ?></h2>
                <p class="text-slate-500 mt-1">
                    <span class="font-medium"><?= e($zlecenie['firma_nazwa']) ?></span>
                    • <?= e($zlecenie['autor_imie'] . ' ' . $zlecenie['autor_nazwisko']) ?>
                </p>
            </div>

            <!-- Quick Status Change -->
            <div class="flex flex-wrap gap-2">
                <?php foreach (Zlecenie::STATUSY as $key => $st): ?>
                <?php if ($key !== $zlecenie['status']): ?>
                <form method="POST" action="" class="inline">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="status">
                    <input type="hidden" name="status" value="<?= $key ?>">
                    <button type="submit" class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                        bg-<?= status_color($key) ?>-50 text-<?= status_color($key) ?>-700 border-<?= status_color($key) ?>-200
                        hover:bg-<?= status_color($key) ?>-100">
                        → <?= $st['nazwa'] ?>
                    </button>
                </form>
                <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Description -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Opis zlecenia</h3>
                <div class="prose prose-slate max-w-none">
                    <?= nl2br(e($zlecenie['opis'])) ?>
                </div>
            </div>

            <!-- Final Links (Edit) -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <i data-lucide="link" class="w-5 h-5 text-indigo-600"></i>
                    Linki do gotowych plików
                </h3>
                <form method="POST" action="" class="space-y-4">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="update">

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Link do podglądu</label>
                        <input type="url" name="link_podglad" value="<?= e($zlecenie['link_podglad']) ?>"
                               placeholder="https://drive.google.com/..."
                               class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Link do plików do pobrania</label>
                        <input type="url" name="link_pliki" value="<?= e($zlecenie['link_pliki']) ?>"
                               placeholder="https://wetransfer.com/..."
                               class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                    </div>

                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                        Zapisz linki
                    </button>
                </form>
            </div>

            <!-- Internal Notes -->
            <div class="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-6">
                <h3 class="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                    <i data-lucide="lock" class="w-5 h-5 text-amber-600"></i>
                    Notatki wewnętrzne
                    <span class="text-xs font-normal text-amber-600">(widoczne tylko dla admina)</span>
                </h3>
                <form method="POST" action="" class="space-y-4">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="update">

                    <div>
                        <label class="block text-sm font-medium text-amber-800 mb-1">Lokalizacja plików roboczych</label>
                        <input type="text" name="lokalizacja_plikow" value="<?= e($zlecenie['lokalizacja_plikow']) ?>"
                               placeholder="D:\Projekty\2025\Firma..."
                               class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-amber-800 mb-1">Notatki wewnętrzne</label>
                        <textarea name="notatki_wewnetrzne" rows="3"
                                  placeholder="Twoje prywatne notatki..."
                                  class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none"><?= e($zlecenie['notatki_wewnetrzne']) ?></textarea>
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-amber-800 mb-1">Czas pracy (min)</label>
                            <input type="number" name="czas_pracy_minuty" value="<?= (int) $zlecenie['czas_pracy_minuty'] ?>" min="0"
                                   class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-amber-800 mb-1">Koszt szacowany</label>
                            <input type="number" name="koszt_szacowany" value="<?= $zlecenie['koszt_szacowany'] ?>" step="0.01" min="0"
                                   class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-amber-800 mb-1">Koszt końcowy</label>
                            <input type="number" name="koszt_koncowy" value="<?= $zlecenie['koszt_koncowy'] ?>" step="0.01" min="0"
                                   class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500">
                        </div>
                    </div>

                    <button type="submit" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm">
                        Zapisz notatki
                    </button>
                </form>
            </div>

            <!-- Comments / Messages -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div class="p-6 border-b border-slate-200">
                    <h3 class="text-lg font-semibold text-slate-800">Komunikacja</h3>
                </div>

                <div class="p-6 space-y-4 max-h-96 overflow-y-auto">
                    <?php if (empty($komentarze)): ?>
                    <div class="text-center py-8 text-slate-500">
                        <i data-lucide="message-circle" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
                        <p>Brak wiadomości</p>
                    </div>
                    <?php else: ?>
                    <?php foreach ($komentarze as $kom): ?>
                    <div class="flex gap-3 <?= $kom['typ'] === 'wewnetrzny' ? 'bg-amber-50 -mx-2 p-2 rounded-xl' : '' ?>">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br <?= $kom['rola'] === 'admin' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-purple-500' ?> flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            <?= get_initials($kom['imie'] . ' ' . $kom['nazwisko']) ?>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium text-slate-800"><?= e($kom['imie'] . ' ' . $kom['nazwisko']) ?></span>
                                <?php if ($kom['typ'] === 'wewnetrzny'): ?>
                                <span class="px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] rounded font-medium">WEWNĘTRZNY</span>
                                <?php endif; ?>
                                <span class="text-xs text-slate-400"><?= time_ago($kom['utworzono']) ?></span>
                            </div>
                            <p class="text-slate-700 whitespace-pre-wrap"><?= e($kom['tresc']) ?></p>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <!-- New comment form -->
                <div class="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <?php if (!empty($szablony)): ?>
                    <!-- Szablony szybkich odpowiedzi -->
                    <div class="mb-4">
                        <div class="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                            <i data-lucide="zap" class="w-3 h-3"></i>
                            Szybkie odpowiedzi:
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <?php foreach ($szablony as $szablon): ?>
                            <button type="button"
                                    class="szablon-btn px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    data-szablon="<?= e($szablon['tresc']) ?>"
                                    title="<?= e($szablon['skrot'] ?? '') ?>">
                                <?= e($szablon['tytul']) ?>
                            </button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <?php endif; ?>

                    <form method="POST" action="" class="space-y-3">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="comment">

                        <div class="flex gap-3 mb-2">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="typ_komentarza" value="publiczny" checked class="text-indigo-600 focus:ring-indigo-500">
                                <span class="text-sm text-slate-700">Publiczny <span class="text-slate-400">(wyślij mail do klienta)</span></span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="typ_komentarza" value="wewnetrzny" class="text-amber-600 focus:ring-amber-500">
                                <span class="text-sm text-slate-700">Wewnętrzny <span class="text-slate-400">(tylko dla admina)</span></span>
                            </label>
                        </div>

                        <div class="flex gap-3">
                            <textarea name="komentarz" id="komentarz-input" placeholder="Napisz wiadomość..." rows="2"
                                   class="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none" required></textarea>
                            <button type="submit" class="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 self-end">
                                <i data-lucide="send" class="w-4 h-4"></i>
                                <span class="hidden sm:inline">Wyślij</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
            <!-- Etykiety -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <i data-lucide="tags" class="w-5 h-5 text-slate-400"></i>
                    Etykiety
                </h3>
                <div class="flex flex-wrap gap-2">
                    <?php foreach ($wszystkieEtykiety as $et): ?>
                    <?php $aktywna = in_array($et['id'], $etykietyZleceniaIds); ?>
                    <form method="POST" action="" class="inline">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="toggle_etykieta">
                        <input type="hidden" name="etykieta_id" value="<?= $et['id'] ?>">
                        <button type="submit"
                                class="px-3 py-1 text-xs font-medium rounded-full transition-all <?= $aktywna ? 'ring-2 ring-offset-1' : 'opacity-50 hover:opacity-100' ?>"
                                style="background: <?= e($et['kolor']) ?>20; color: <?= e($et['kolor']) ?>; <?= $aktywna ? 'ring-color: ' . e($et['kolor']) : '' ?>">
                            <?= $aktywna ? '✓ ' : '' ?><?= e($et['nazwa']) ?>
                        </button>
                    </form>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Info Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Informacje</h3>
                <dl class="space-y-4">
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Firma</dt>
                        <dd class="mt-1">
                            <a href="firmy.php?id=<?= $zlecenie['firma_id'] ?>" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                <?= e($zlecenie['firma_nazwa']) ?>
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Złożone przez</dt>
                        <dd class="mt-1 text-sm text-slate-800"><?= e($zlecenie['autor_imie'] . ' ' . $zlecenie['autor_nazwisko']) ?></dd>
                        <dd class="text-xs text-slate-500"><?= e($zlecenie['autor_email']) ?></dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Kategoria</dt>
                        <dd class="mt-1 text-sm text-slate-800">
                            <?php if ($zlecenie['kategoria_nazwa']): ?>
                            <span class="inline-flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full" style="background: <?= e($zlecenie['kategoria_kolor']) ?>"></span>
                                <?= e($zlecenie['kategoria_nazwa']) ?>
                            </span>
                            <?php else: ?>
                            <span class="text-slate-400">Brak</span>
                            <?php endif; ?>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Data złożenia</dt>
                        <dd class="mt-1 text-sm text-slate-800"><?= format_datetime($zlecenie['utworzono']) ?></dd>
                    </div>
                    <?php if ($zlecenie['termin_realizacji']): ?>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Oczekiwany termin</dt>
                        <dd class="mt-1 text-sm <?= strtotime($zlecenie['termin_realizacji']) < time() ? 'text-red-600 font-medium' : 'text-slate-800' ?>">
                            <?= format_date($zlecenie['termin_realizacji']) ?>
                            <?php if (strtotime($zlecenie['termin_realizacji']) < time()): ?>
                            <span class="text-xs">(po terminie!)</span>
                            <?php endif; ?>
                        </dd>
                    </div>
                    <?php endif; ?>
                    <?php if ($zlecenie['zakonczono']): ?>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Zakończono</dt>
                        <dd class="mt-1 text-sm text-green-600 font-medium"><?= format_datetime($zlecenie['zakonczono']) ?></dd>
                    </div>
                    <?php endif; ?>
                </dl>
            </div>

            <!-- Attachments -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Załączniki</h3>
                <?php if (empty($zalaczniki)): ?>
                <p class="text-sm text-slate-500">Brak załączników</p>
                <?php else: ?>
                <div class="space-y-2">
                    <?php foreach ($zalaczniki as $zal): ?>
                    <a href="<?= APP_URL . '/' . e($zal['sciezka']) ?>" target="_blank" class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div class="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                            <i data-lucide="<?= file_icon($zal['typ_mime']) ?>" class="w-5 h-5 text-slate-500"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-slate-700 truncate"><?= e($zal['nazwa_oryginalna']) ?></div>
                            <div class="text-xs text-slate-400"><?= format_size($zal['rozmiar']) ?> • <?= e($zal['typ']) ?></div>
                        </div>
                        <i data-lucide="download" class="w-4 h-4 text-slate-400"></i>
                    </a>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>

            <!-- History -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Historia</h3>
                <div class="space-y-4">
                    <?php foreach ($historia as $h): ?>
                    <div class="flex gap-3">
                        <div class="flex flex-col items-center">
                            <div class="w-3 h-3 rounded-full bg-<?= status_color($h['status_nowy']) ?>-500"></div>
                            <div class="w-0.5 h-full bg-slate-200 mt-1"></div>
                        </div>
                        <div class="pb-4">
                            <div class="text-sm font-medium text-slate-800"><?= status_name($h['status_nowy']) ?></div>
                            <div class="text-xs text-slate-500"><?= e($h['imie'] . ' ' . $h['nazwisko']) ?></div>
                            <div class="text-xs text-slate-400"><?= format_datetime($h['utworzono']) ?></div>
                            <?php if ($h['komentarz']): ?>
                            <div class="mt-1 text-xs text-slate-600 italic">"<?= e($h['komentarz']) ?>"</div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Szablony szybkich odpowiedzi
document.querySelectorAll('.szablon-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const textarea = document.getElementById('komentarz-input');
        const szablon = this.dataset.szablon;

        // Jeśli textarea jest pusta, wstaw szablon
        // Jeśli nie, dodaj na końcu z nową linią
        if (textarea.value.trim() === '') {
            textarea.value = szablon;
        } else {
            textarea.value += '\n\n' + szablon;
        }

        textarea.focus();
        // Auto-resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
});

// Auto-resize textarea
const komentarzInput = document.getElementById('komentarz-input');
if (komentarzInput) {
    komentarzInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
}
</script>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
