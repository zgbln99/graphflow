<?php
/**
 * Panel klienta - Lista zleceń
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireLogin();
$user = $auth->getUser();

$zlecenieModel = new Zlecenie();

// Filtry
$status = $_GET['status'] ?? '';
$szukaj = $_GET['szukaj'] ?? '';

$filters = ['firma_id' => $user['firma_id']];

if ($status) {
    $filters['status'] = $status;
}
if ($szukaj) {
    $filters['szukaj'] = $szukaj;
}

// Paginacja
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 15;
$offset = ($page - 1) * $perPage;

$zlecenia = $zlecenieModel->getList($filters, $perPage, $offset);
$total = $zlecenieModel->count($filters);
$totalPages = ceil($total / $perPage);

// Statystyki
$stats = $zlecenieModel->getStats($user['firma_id']);

$pageTitle = 'Moje zlecenia';
$isAdmin = false;

ob_start();
?>

<!-- Header -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
        <h2 class="text-2xl font-bold text-slate-800">Moje zlecenia</h2>
        <p class="text-slate-500 mt-1">Łącznie: <?= $total ?> zleceń</p>
    </div>
    <a href="nowe-zlecenie.php" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Nowe zlecenie
    </a>
</div>

<!-- Status Tabs -->
<div class="flex flex-wrap gap-2 mb-6">
    <a href="?<?= http_build_query(array_merge($_GET, ['status' => '', 'page' => 1])) ?>"
       class="px-4 py-2 rounded-lg text-sm font-medium transition-colors <?= !$status ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100' ?>">
        Wszystkie (<?= $stats['wszystkie'] ?>)
    </a>
    <?php foreach (Zlecenie::STATUSY as $key => $st): ?>
    <?php if (($stats['statusy'][$key] ?? 0) > 0): ?>
    <a href="?<?= http_build_query(array_merge($_GET, ['status' => $key, 'page' => 1])) ?>"
       class="px-4 py-2 rounded-lg text-sm font-medium transition-colors <?= $status === $key ? 'bg-' . status_color($key) . '-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100' ?>">
        <?= $st['nazwa'] ?> (<?= $stats['statusy'][$key] ?>)
    </a>
    <?php endif; ?>
    <?php endforeach; ?>
</div>

<!-- Search -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
    <form method="GET" action="" class="flex flex-col sm:flex-row gap-3">
        <?php if ($status): ?>
        <input type="hidden" name="status" value="<?= e($status) ?>">
        <?php endif; ?>
        <div class="flex-1 relative">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            <input
                type="text"
                name="szukaj"
                value="<?= e($szukaj) ?>"
                placeholder="Szukaj po numerze, tytule..."
                class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            >
        </div>
        <button type="submit" class="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors">
            Szukaj
        </button>
        <?php if ($szukaj): ?>
        <a href="?<?= $status ? 'status=' . e($status) : '' ?>" class="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium">
            Wyczyść
        </a>
        <?php endif; ?>
    </form>
</div>

<!-- Orders List -->
<?php if (empty($zlecenia)): ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="inbox" class="w-8 h-8 text-slate-400"></i>
    </div>
    <h3 class="text-lg font-semibold text-slate-800 mb-2">Brak zleceń</h3>
    <p class="text-slate-500 mb-6">
        <?= $szukaj ? 'Nie znaleziono zleceń pasujących do wyszukiwania' : 'Nie masz jeszcze żadnych zleceń' ?>
    </p>
    <a href="nowe-zlecenie.php" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Złóż zlecenie
    </a>
</div>
<?php else: ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Desktop Table -->
    <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Zlecenie</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategoria</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priorytet</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <?php foreach ($zlecenia as $z): ?>
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                <?= mb_strtoupper(mb_substr($z['kategoria_nazwa'] ?? 'Z', 0, 1)) ?>
                            </div>
                            <div>
                                <div class="text-xs font-mono text-indigo-600"><?= e($z['numer']) ?></div>
                                <div class="font-medium text-slate-800 max-w-xs truncate"><?= e($z['tytul']) ?></div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <?php if ($z['kategoria_nazwa']): ?>
                        <span class="inline-flex items-center gap-2 text-sm text-slate-600">
                            <span class="w-2 h-2 rounded-full" style="background: <?= e($z['kategoria_kolor']) ?>"></span>
                            <?= e($z['kategoria_nazwa']) ?>
                        </span>
                        <?php else: ?>
                        <span class="text-slate-400 text-sm">—</span>
                        <?php endif; ?>
                    </td>
                    <td class="px-6 py-4">
                        <span class="status-badge bg-<?= status_color($z['status']) ?>-100 text-<?= status_color($z['status']) ?>-700">
                            <span class="w-2 h-2 rounded-full bg-<?= status_color($z['status']) ?>-500"></span>
                            <?= status_name($z['status']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm font-medium text-<?= priority_color($z['priorytet']) ?>-600">
                            <?= priority_name($z['priorytet']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-slate-600"><?= format_date($z['utworzono']) ?></div>
                        <div class="text-xs text-slate-400"><?= time_ago($z['utworzono']) ?></div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <a href="zlecenie.php?id=<?= $z['id'] ?>" class="inline-flex items-center gap-1 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium text-sm">
                            Szczegóły
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden divide-y divide-slate-100">
        <?php foreach ($zlecenia as $z): ?>
        <a href="zlecenie.php?id=<?= $z['id'] ?>" class="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                <?= mb_strtoupper(mb_substr($z['kategoria_nazwa'] ?? 'Z', 0, 1)) ?>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono text-indigo-600"><?= e($z['numer']) ?></span>
                    <span class="status-badge bg-<?= status_color($z['status']) ?>-100 text-<?= status_color($z['status']) ?>-700 text-[10px]">
                        <?= status_name($z['status']) ?>
                    </span>
                </div>
                <h4 class="font-medium text-slate-800 truncate"><?= e($z['tytul']) ?></h4>
                <p class="text-sm text-slate-500 mt-1"><?= time_ago($z['utworzono']) ?></p>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
        </a>
        <?php endforeach; ?>
    </div>
</div>

<!-- Pagination -->
<?php if ($totalPages > 1): ?>
<div class="mt-6 flex items-center justify-center gap-2">
    <?php if ($page > 1): ?>
    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page - 1])) ?>" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <i data-lucide="chevron-left" class="w-5 h-5"></i>
    </a>
    <?php endif; ?>

    <?php
    $start = max(1, $page - 2);
    $end = min($totalPages, $page + 2);
    ?>

    <?php for ($i = $start; $i <= $end; $i++): ?>
    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $i])) ?>"
       class="px-4 py-2 rounded-lg transition-colors <?= $i === $page ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50' ?>">
        <?= $i ?>
    </a>
    <?php endfor; ?>

    <?php if ($page < $totalPages): ?>
    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page + 1])) ?>" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <i data-lucide="chevron-right" class="w-5 h-5"></i>
    </a>
    <?php endif; ?>
</div>
<?php endif; ?>
<?php endif; ?>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
