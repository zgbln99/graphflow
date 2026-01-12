<?php
/**
 * Panel klienta - Szczegóły zlecenia
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireLogin();
$user = $auth->getUser();

$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    redirect('zlecenia.php');
}

$zlecenieModel = new Zlecenie();
$zlecenie = $zlecenieModel->getById($id);

if (!$zlecenie || !can_access_order($zlecenie, $user)) {
    flash('error', 'Nie znaleziono zlecenia lub brak dostępu');
    redirect('zlecenia.php');
}

$db = Database::getInstance();

// Pobierz komentarze (tylko publiczne dla klienta)
$komentarze = $zlecenieModel->getComments($id, false);

// Pobierz załączniki
$zalaczniki = $zlecenieModel->getAttachments($id);

// Pobierz historię
$historia = $zlecenieModel->getHistory($id);

// Pobierz ocenę jeśli istnieje
$ocena = $db->fetch("SELECT * FROM oceny WHERE zlecenie_id = ?", [$id]);

// Obsługa formularzy
if (is_post() && check_csrf()) {
    $action = $_POST['action'] ?? 'comment';

    if ($action === 'comment') {
        $tresc = trim($_POST['komentarz'] ?? '');

        if (!empty($tresc)) {
            $zlecenieModel->addComment($id, $user['id'], $tresc, 'publiczny');

            $powiadomienie = new Powiadomienie();
            $powiadomienie->notifyNewComment($zlecenie, $user['id'], $user['imie'] . ' ' . $user['nazwisko']);

            flash('success', 'Wiadomość została dodana');
            redirect('zlecenie.php?id=' . $id);
        }
    }

    if ($action === 'rate' && $zlecenie['status'] === 'zakonczone' && !$ocena) {
        $rating = (int) ($_POST['ocena'] ?? 0);
        $comment = trim($_POST['komentarz_oceny'] ?? '');

        if ($rating >= 1 && $rating <= 5) {
            $db->insert('oceny', [
                'zlecenie_id' => $id,
                'uzytkownik_id' => $user['id'],
                'ocena' => $rating,
                'komentarz' => $comment
            ]);
            flash('success', 'Dziękujemy za ocenę!');
            redirect('zlecenie.php?id=' . $id);
        }
    }
}

$pageTitle = 'Zlecenie ' . $zlecenie['numer'];
$isAdmin = false;

ob_start();
?>

<div class="max-w-5xl">
    <!-- Header -->
    <div class="mb-6">
        <a href="zlecenia.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do listy</span>
        </a>

        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="text-sm font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg"><?= e($zlecenie['numer']) ?></span>
                    <span class="status-badge bg-<?= status_color($zlecenie['status']) ?>-100 text-<?= status_color($zlecenie['status']) ?>-700">
                        <span class="w-2 h-2 rounded-full bg-<?= status_color($zlecenie['status']) ?>-500"></span>
                        <?= status_name($zlecenie['status']) ?>
                    </span>
                    <span class="status-badge bg-<?= priority_color($zlecenie['priorytet']) ?>-100 text-<?= priority_color($zlecenie['priorytet']) ?>-700">
                        <?= priority_name($zlecenie['priorytet']) ?>
                    </span>
                </div>
                <h2 class="text-2xl font-bold text-slate-800"><?= e($zlecenie['tytul']) ?></h2>
            </div>

            <!-- Akcje -->
            <div class="flex gap-2">
                <a href="nowe-zlecenie.php?duplikuj=<?= $id ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium text-sm">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                    Duplikuj zlecenie
                </a>
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

            <!-- Rating prompt for completed orders -->
            <?php if ($zlecenie['status'] === 'zakonczone' && !$ocena): ?>
            <div class="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-6">
                <h3 class="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                    <i data-lucide="star" class="w-5 h-5"></i>
                    Oceń realizację
                </h3>
                <p class="text-amber-700 mb-4">Twoja opinia jest dla nas bardzo ważna!</p>
                <form method="POST" action="" class="space-y-4">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="rate">

                    <div class="flex gap-2" id="starRating">
                        <?php for ($i = 1; $i <= 5; $i++): ?>
                        <button type="button" onclick="setRating(<?= $i ?>)" class="star-btn p-1 hover:scale-110 transition-transform" data-rating="<?= $i ?>">
                            <i data-lucide="star" class="w-8 h-8 text-slate-300 star-icon transition-colors"></i>
                        </button>
                        <?php endfor; ?>
                    </div>
                    <input type="hidden" name="ocena" id="ratingInput" value="0">

                    <div>
                        <textarea name="komentarz_oceny" rows="2" placeholder="Dodaj komentarz (opcjonalnie)..."
                                  class="w-full px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 resize-none bg-white"></textarea>
                    </div>

                    <button type="submit" id="submitRating" disabled class="px-6 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                        Wyślij ocenę
                    </button>
                </form>
            </div>
            <script>
                function setRating(rating) {
                    document.getElementById('ratingInput').value = rating;
                    document.getElementById('submitRating').disabled = false;
                    document.querySelectorAll('.star-btn').forEach((btn, index) => {
                        const icon = btn.querySelector('.star-icon');
                        if (index < rating) {
                            icon.classList.remove('text-slate-300');
                            icon.classList.add('text-amber-400');
                            icon.setAttribute('fill', 'currentColor');
                        } else {
                            icon.classList.add('text-slate-300');
                            icon.classList.remove('text-amber-400');
                            icon.removeAttribute('fill');
                        }
                    });
                }
            </script>
            <?php endif; ?>

            <!-- Show rating if exists -->
            <?php if ($ocena): ?>
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
                <h3 class="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <i data-lucide="check-circle" class="w-5 h-5"></i>
                    Twoja ocena
                </h3>
                <div class="flex items-center gap-1 mb-2">
                    <?php for ($i = 1; $i <= 5; $i++): ?>
                    <i data-lucide="star" class="w-6 h-6 <?= $i <= $ocena['ocena'] ? 'text-amber-400' : 'text-slate-300' ?>" <?= $i <= $ocena['ocena'] ? 'fill="currentColor"' : '' ?>></i>
                    <?php endfor; ?>
                    <span class="ml-2 text-green-700 font-semibold"><?= $ocena['ocena'] ?>/5</span>
                </div>
                <?php if ($ocena['komentarz']): ?>
                <p class="text-green-700 italic">"<?= e($ocena['komentarz']) ?>"</p>
                <?php endif; ?>
            </div>
            <?php endif; ?>

            <!-- Completed order links -->
            <?php if ($zlecenie['status'] === 'zakonczone' || $zlecenie['status'] === 'do_akceptacji'): ?>
            <?php if ($zlecenie['link_podglad'] || $zlecenie['link_pliki']): ?>
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
                <h3 class="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <i data-lucide="download-cloud" class="w-5 h-5"></i>
                    Gotowe pliki
                </h3>
                <div class="space-y-3">
                    <?php if ($zlecenie['link_podglad']): ?>
                    <a href="<?= e($zlecenie['link_podglad']) ?>" target="_blank" class="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-all">
                        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="eye" class="w-5 h-5 text-green-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-medium text-slate-800">Podgląd projektu</div>
                            <div class="text-sm text-slate-500 truncate"><?= e($zlecenie['link_podglad']) ?></div>
                        </div>
                        <i data-lucide="external-link" class="w-5 h-5 text-slate-400"></i>
                    </a>
                    <?php endif; ?>

                    <?php if ($zlecenie['link_pliki']): ?>
                    <a href="<?= e($zlecenie['link_pliki']) ?>" target="_blank" class="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-all">
                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="download" class="w-5 h-5 text-blue-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-medium text-slate-800">Pobierz pliki</div>
                            <div class="text-sm text-slate-500 truncate"><?= e($zlecenie['link_pliki']) ?></div>
                        </div>
                        <i data-lucide="external-link" class="w-5 h-5 text-slate-400"></i>
                    </a>
                    <?php endif; ?>
                </div>
            </div>
            <?php endif; ?>
            <?php endif; ?>

            <!-- Comments / Messages -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div class="p-6 border-b border-slate-200">
                    <h3 class="text-lg font-semibold text-slate-800">Wiadomości</h3>
                </div>

                <div class="p-6 space-y-4 max-h-96 overflow-y-auto">
                    <?php if (empty($komentarze)): ?>
                    <div class="text-center py-8 text-slate-500">
                        <i data-lucide="message-circle" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
                        <p>Brak wiadomości</p>
                    </div>
                    <?php else: ?>
                    <?php foreach ($komentarze as $kom): ?>
                    <div class="flex gap-3 <?= $kom['uzytkownik_id'] == $user['id'] ? 'flex-row-reverse' : '' ?>">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br <?= $kom['rola'] === 'admin' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-purple-500' ?> flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            <?= get_initials($kom['imie'] . ' ' . $kom['nazwisko']) ?>
                        </div>
                        <div class="max-w-md <?= $kom['uzytkownik_id'] == $user['id'] ? 'text-right' : '' ?>">
                            <div class="inline-block p-4 rounded-2xl <?= $kom['uzytkownik_id'] == $user['id'] ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800' ?>">
                                <p class="whitespace-pre-wrap"><?= e($kom['tresc']) ?></p>
                            </div>
                            <div class="text-xs text-slate-400 mt-1">
                                <?= e($kom['imie'] . ' ' . $kom['nazwisko']) ?> • <?= time_ago($kom['utworzono']) ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <?php if (!in_array($zlecenie['status'], ['zakonczone', 'anulowane'])): ?>
                <div class="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <form method="POST" action="" class="flex gap-3">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="comment">
                        <input type="text" name="komentarz" placeholder="Napisz wiadomość..."
                               class="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required>
                        <button type="submit" class="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            <i data-lucide="send" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Wyślij</span>
                        </button>
                    </form>
                </div>
                <?php else: ?>
                <div class="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl text-center text-slate-500 text-sm">
                    Zlecenie zakończone - nie można dodawać wiadomości
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
            <!-- Info Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Informacje</h3>
                <dl class="space-y-4">
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
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Złożone przez</dt>
                        <dd class="mt-1 text-sm text-slate-800"><?= e($zlecenie['autor_imie'] . ' ' . $zlecenie['autor_nazwisko']) ?></dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Data złożenia</dt>
                        <dd class="mt-1 text-sm text-slate-800"><?= format_datetime($zlecenie['utworzono']) ?></dd>
                    </div>
                    <?php if ($zlecenie['termin_realizacji']): ?>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Oczekiwany termin</dt>
                        <dd class="mt-1 text-sm text-slate-800"><?= format_date($zlecenie['termin_realizacji']) ?></dd>
                    </div>
                    <?php endif; ?>
                    <?php if ($zlecenie['zakonczono']): ?>
                    <div>
                        <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider">Data zakończenia</dt>
                        <dd class="mt-1 text-sm text-green-600"><?= format_datetime($zlecenie['zakonczono']) ?></dd>
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
                            <div class="text-xs text-slate-400"><?= format_size($zal['rozmiar']) ?></div>
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
                <div class="space-y-3">
                    <?php foreach ($historia as $h): ?>
                    <div class="flex gap-3">
                        <div class="w-2 h-2 rounded-full bg-<?= status_color($h['status_nowy']) ?>-500 mt-2"></div>
                        <div>
                            <div class="text-sm text-slate-800"><?= status_name($h['status_nowy']) ?></div>
                            <div class="text-xs text-slate-400"><?= time_ago($h['utworzono']) ?></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
