<?php
/**
 * Panel admina - Dashboard
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

// Pobierz statystyki
$zlecenieModel = new Zlecenie();
$firmaModel = new Firma();
$uzytkownikModel = new Uzytkownik();

$stats = $zlecenieModel->getStats();

// Ostatnie zlecenia
$ostatnieZlecenia = $zlecenieModel->getList([], 8, 0);

// Nowe zlecenia do obsługi
$noweZlecenia = $zlecenieModel->getList(['status' => 'nowe'], 10, 0);

// Statystyki ogólne
$liczbafirm = $firmaModel->count(['aktywna' => 1]);
$liczbaKlientow = $uzytkownikModel->count(['rola' => 'klient', 'aktywny' => 1]);

$pageTitle = 'Dashboard';
$isAdmin = true;

ob_start();
?>

<!-- Welcome -->
<div class="mb-8">
    <h2 class="text-2xl font-bold text-slate-800">Dashboard</h2>
    <p class="text-slate-500 mt-1">Witaj, <?= e($user['imie']) ?>! Oto przegląd systemu.</p>
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
                <i data-lucide="building-2" class="w-6 h-6 text-purple-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $liczbafirm ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Aktywne firmy</h3>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 card-hover">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i data-lucide="users" class="w-6 h-6 text-green-600"></i>
            </div>
            <span class="text-3xl font-bold text-slate-800"><?= $liczbaKlientow ?></span>
        </div>
        <h3 class="text-sm font-medium text-slate-500">Klienci</h3>
    </div>
</div>

<!-- Status Overview -->
<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
    <?php foreach (Zlecenie::STATUSY as $key => $st): ?>
    <a href="zlecenia.php?status=<?= $key ?>" class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all text-center">
        <div class="w-8 h-8 rounded-full bg-<?= status_color($key) ?>-100 flex items-center justify-center mx-auto mb-2">
            <span class="w-3 h-3 rounded-full bg-<?= status_color($key) ?>-500"></span>
        </div>
        <div class="text-2xl font-bold text-slate-800"><?= $stats['statusy'][$key] ?? 0 ?></div>
        <div class="text-xs text-slate-500 mt-1"><?= $st['nazwa'] ?></div>
    </a>
    <?php endforeach; ?>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- New Orders -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div class="p-6 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <i data-lucide="inbox" class="w-5 h-5 text-blue-600"></i>
                </div>
                <div>
                    <h3 class="font-semibold text-slate-800">Nowe zlecenia</h3>
                    <p class="text-sm text-slate-500">Oczekujące na obsługę</p>
                </div>
            </div>
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold"><?= count($noweZlecenia) ?></span>
        </div>
        <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            <?php if (empty($noweZlecenia)): ?>
            <div class="p-8 text-center text-slate-500">
                <i data-lucide="check-circle" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
                <p>Brak nowych zleceń</p>
            </div>
            <?php else: ?>
            <?php foreach ($noweZlecenia as $z): ?>
            <a href="zlecenie.php?id=<?= $z['id'] ?>" class="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    <?= mb_strtoupper(mb_substr($z['firma_nazwa'] ?? 'K', 0, 1)) ?>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-indigo-600"><?= e($z['numer']) ?></span>
                        <span class="status-badge bg-<?= priority_color($z['priorytet']) ?>-100 text-<?= priority_color($z['priorytet']) ?>-700 text-[10px]">
                            <?= priority_name($z['priorytet']) ?>
                        </span>
                    </div>
                    <h4 class="font-medium text-slate-800 truncate"><?= e($z['tytul']) ?></h4>
                    <p class="text-sm text-slate-500"><?= e($z['firma_nazwa']) ?> • <?= time_ago($z['utworzono']) ?></p>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
            </a>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
        <div class="p-4 border-t border-slate-200">
            <a href="zlecenia.php?status=nowe" class="block text-center text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                Zobacz wszystkie nowe →
            </a>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div class="p-6 border-b border-slate-200 flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <i data-lucide="activity" class="w-5 h-5 text-purple-600"></i>
            </div>
            <div>
                <h3 class="font-semibold text-slate-800">Ostatnia aktywność</h3>
                <p class="text-sm text-slate-500">Najnowsze zlecenia</p>
            </div>
        </div>
        <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            <?php foreach ($ostatnieZlecenia as $z): ?>
            <a href="zlecenie.php?id=<?= $z['id'] ?>" class="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span class="w-3 h-3 rounded-full bg-<?= status_color($z['status']) ?>-500"></span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-slate-500"><?= e($z['numer']) ?></span>
                        <span class="text-xs text-<?= status_color($z['status']) ?>-600 font-medium"><?= status_name($z['status']) ?></span>
                    </div>
                    <h4 class="font-medium text-slate-800 truncate"><?= e($z['tytul']) ?></h4>
                    <p class="text-xs text-slate-400"><?= e($z['firma_nazwa']) ?></p>
                </div>
                <div class="text-right">
                    <div class="text-xs text-slate-500"><?= time_ago($z['zaktualizowano']) ?></div>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
        <div class="p-4 border-t border-slate-200">
            <a href="zlecenia.php" class="block text-center text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                Zobacz wszystkie zlecenia →
            </a>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="mt-8">
    <h3 class="text-lg font-semibold text-slate-800 mb-4">Szybkie akcje</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="firmy.php?action=new" class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all text-center group">
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="building-2" class="w-6 h-6 text-indigo-600"></i>
            </div>
            <span class="font-medium text-slate-800">Dodaj firmę</span>
        </a>
        <a href="uzytkownicy.php?action=new" class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-green-200 transition-all text-center group">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="user-plus" class="w-6 h-6 text-green-600"></i>
            </div>
            <span class="font-medium text-slate-800">Dodaj użytkownika</span>
        </a>
        <a href="zlecenia.php" class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-200 transition-all text-center group">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="list" class="w-6 h-6 text-purple-600"></i>
            </div>
            <span class="font-medium text-slate-800">Wszystkie zlecenia</span>
        </a>
        <a href="statystyki.php" class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-yellow-200 transition-all text-center group">
            <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="bar-chart-3" class="w-6 h-6 text-yellow-600"></i>
            </div>
            <span class="font-medium text-slate-800">Statystyki</span>
        </a>
    </div>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
