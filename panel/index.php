<?php
/**
 * Panel klienta - Dashboard
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireLogin();
$user = $auth->getUser();

// Pobierz statystyki
$zlecenie = new Zlecenie();
$stats = $zlecenie->getStats($user['firma_id']);

// Pobierz ostatnie zlecenia
$ostatnieZlecenia = $zlecenie->getList(
    ['firma_id' => $user['firma_id']],
    5,
    0
);

// Pobierz aktywne zlecenia
$aktywneZlecenia = $zlecenie->getList(
    [
        'firma_id' => $user['firma_id'],
        'status' => ['nowe', 'w_realizacji', 'oczekuje', 'do_akceptacji', 'poprawki']
    ],
    10,
    0
);

$pageTitle = 'Dashboard';
$isAdmin = false;

ob_start();
?>

<!-- Welcome Section -->
<div class="mb-8">
    <h2 class="text-2xl font-bold text-slate-800">Witaj, <?= e($user['imie']) ?>! 👋</h2>
    <p class="text-slate-500 mt-1">Oto przegląd Twoich zleceń graficznych</p>
</div>

<!-- Quick Actions -->
<div class="mb-8">
    <a href="nowe-zlecenie.php" class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/30">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Złóż nowe zlecenie
    </a>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 card-hover">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i data-lucide="clipboard-list" class="w-6 h-6 text-blue-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $stats['wszystkie'] ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Wszystkie zlecenia</h3>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 card-hover">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i data-lucide="clock" class="w-6 h-6 text-yellow-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $stats['aktywne'] ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Aktywne zlecenia</h3>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 card-hover">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i data-lucide="eye" class="w-6 h-6 text-purple-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $stats['statusy']['do_akceptacji'] ?? 0 ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Do akceptacji</h3>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 card-hover">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i data-lucide="check-circle" class="w-6 h-6 text-green-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $stats['statusy']['zakonczone'] ?? 0 ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Zakończone</h3>
    </div>
</div>

<!-- Active Orders -->
<?php if (!empty($aktywneZlecenia)): ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
    <div class="p-6 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-800">Aktywne zlecenia</h3>
        <a href="zlecenia.php" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Zobacz wszystkie →</a>
    </div>
    <div class="divide-y divide-slate-100">
        <?php foreach ($aktywneZlecenia as $z): ?>
        <a href="zlecenie.php?id=<?= $z['id'] ?>" class="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                <?= mb_strtoupper(mb_substr($z['kategoria_nazwa'] ?? 'Z', 0, 1)) ?>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono text-indigo-600"><?= e($z['numer']) ?></span>
                    <span class="status-badge bg-<?= status_color($z['status']) ?>-100 text-<?= status_color($z['status']) ?>-700">
                        <?= status_name($z['status']) ?>
                    </span>
                </div>
                <h4 class="font-medium text-slate-800 truncate"><?= e($z['tytul']) ?></h4>
                <p class="text-sm text-slate-500 mt-1"><?= e($z['kategoria_nazwa'] ?? 'Brak kategorii') ?></p>
            </div>
            <div class="text-right hidden sm:block">
                <div class="text-sm text-slate-500"><?= time_ago($z['utworzono']) ?></div>
                <?php if ($z['termin_realizacji']): ?>
                <div class="text-xs text-slate-400 mt-1">Termin: <?= format_date($z['termin_realizacji']) ?></div>
                <?php endif; ?>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
        </a>
        <?php endforeach; ?>
    </div>
</div>
<?php else: ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="clipboard-list" class="w-8 h-8 text-slate-400"></i>
    </div>
    <h3 class="text-lg font-semibold text-slate-800 mb-2">Brak aktywnych zleceń</h3>
    <p class="text-slate-500 mb-6">Złóż swoje pierwsze zlecenie graficzne!</p>
    <a href="nowe-zlecenie.php" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Złóż zlecenie
    </a>
</div>
<?php endif; ?>

<!-- Status Legend -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h3 class="text-lg font-semibold text-slate-800 mb-4">Legenda statusów</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <?php foreach (Zlecenie::STATUSY as $key => $status): ?>
        <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-<?= status_color($key) ?>-500"></span>
            <span class="text-sm text-slate-600"><?= $status['nazwa'] ?></span>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
