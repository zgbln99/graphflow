<?php
/**
 * Panel admina - Lista zleceń
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$zlecenieModel = new Zlecenie();
$firmaModel = new Firma();

// Filtry
$status = $_GET['status'] ?? '';
$priorytet = $_GET['priorytet'] ?? '';
$firma_id = $_GET['firma_id'] ?? '';
$szukaj = $_GET['szukaj'] ?? '';

$filters = [];

if ($status) {
    $filters['status'] = $status;
}
if ($priorytet) {
    $filters['priorytet'] = $priorytet;
}
if ($firma_id) {
    $filters['firma_id'] = $firma_id;
}
if ($szukaj) {
    $filters['szukaj'] = $szukaj;
}
$etykieta_id = $_GET['etykieta_id'] ?? '';
if ($etykieta_id) {
    $filters['etykieta_id'] = $etykieta_id;
}

// Paginacja
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;
$offset = ($page - 1) * $perPage;

$zlecenia = $zlecenieModel->getList($filters, $perPage, $offset);
$total = $zlecenieModel->count($filters);
$totalPages = ceil($total / $perPage);

// Statystyki
$stats = $zlecenieModel->getStats();

// Firmy do filtrowania
$firmy = $firmaModel->getList(['aktywna' => 1]);

// Etykiety do filtrowania i wyświetlania
$db = Database::getInstance();
$etykiety = $db->fetchAll("SELECT * FROM etykiety ORDER BY nazwa");
$etykieta_id = $_GET['etykieta_id'] ?? '';

// Pobierz etykiety dla każdego zlecenia
$etykietyMap = [];
if (!empty($zlecenia)) {
    $zlecenieIds = array_column($zlecenia, 'id');
    $placeholders = implode(',', array_fill(0, count($zlecenieIds), '?'));
    $zlecenieEtykiety = $db->fetchAll(
        "SELECT ze.zlecenie_id, e.* FROM zlecenia_etykiety ze
         JOIN etykiety e ON e.id = ze.etykieta_id
         WHERE ze.zlecenie_id IN ($placeholders)",
        $zlecenieIds
    );
    foreach ($zlecenieEtykiety as $ze) {
        $etykietyMap[$ze['zlecenie_id']][] = $ze;
    }
}

$pageTitle = 'Zlecenia';
$isAdmin = true;

ob_start();
?>

<!-- Header -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
        <h2 class="text-2xl font-bold text-slate-800">Zlecenia</h2>
        <p class="text-slate-500 mt-1">Łącznie: <?= $total ?> zleceń</p>
    </div>
    <div class="flex gap-2">
        <a href="eksport-csv.php?<?= http_build_query(array_filter($_GET, fn($k) => $k !== 'page', ARRAY_FILTER_USE_KEY)) ?>"
           class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700">
            <i data-lucide="download" class="w-4 h-4"></i>
            Eksport CSV
        </a>
    </div>
</div>

<!-- Status Tabs -->
<div class="flex flex-wrap gap-2 mb-6">
    <a href="?<?= http_build_query(array_diff_key($_GET, ['status' => '', 'page' => ''])) ?>"
       class="px-4 py-2 rounded-lg text-sm font-medium transition-colors <?= !$status ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200' ?>">
        Wszystkie (<?= $stats['wszystkie'] ?>)
    </a>
    <?php foreach (Zlecenie::STATUSY as $key => $st): ?>
    <a href="?<?= http_build_query(array_merge($_GET, ['status' => $key, 'page' => 1])) ?>"
       class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
       <?= $status === $key ? 'bg-' . status_color($key) . '-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200' ?>">
        <span class="w-2 h-2 rounded-full bg-<?= status_color($key) ?>-<?= $status === $key ? '200' : '500' ?>"></span>
        <?= $st['nazwa'] ?> (<?= $stats['statusy'][$key] ?? 0 ?>)
    </a>
    <?php endforeach; ?>
</div>

<!-- Filters -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
    <form method="GET" action="" class="flex flex-col lg:flex-row gap-3">
        <?php if ($status): ?>
        <input type="hidden" name="status" value="<?= e($status) ?>">
        <?php endif; ?>

        <div class="flex-1 relative">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            <input type="text" name="szukaj" value="<?= e($szukaj) ?>" placeholder="Szukaj po numerze, tytule, opisie..."
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
        </div>

        <select name="firma_id" class="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
            <option value="">Wszystkie firmy</option>
            <?php foreach ($firmy as $f): ?>
            <option value="<?= $f['id'] ?>" <?= $firma_id == $f['id'] ? 'selected' : '' ?>><?= e($f['nazwa']) ?></option>
            <?php endforeach; ?>
        </select>

        <select name="priorytet" class="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
            <option value="">Wszystkie priorytety</option>
            <?php foreach (Zlecenie::PRIORYTETY as $key => $pr): ?>
            <option value="<?= $key ?>" <?= $priorytet === $key ? 'selected' : '' ?>><?= $pr['nazwa'] ?></option>
            <?php endforeach; ?>
        </select>

        <select name="etykieta_id" class="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
            <option value="">Wszystkie etykiety</option>
            <?php foreach ($etykiety as $et): ?>
            <option value="<?= $et['id'] ?>" <?= $etykieta_id == $et['id'] ? 'selected' : '' ?>><?= e($et['nazwa']) ?></option>
            <?php endforeach; ?>
        </select>

        <button type="submit" class="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors">
            Filtruj
        </button>

        <?php if ($szukaj || $firma_id || $priorytet || $etykieta_id): ?>
        <a href="?<?= $status ? 'status=' . e($status) : '' ?>" class="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium">
            Wyczyść
        </a>
        <?php endif; ?>
    </form>
</div>

<!-- Orders Table -->
<?php if (empty($zlecenia)): ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="inbox" class="w-8 h-8 text-slate-400"></i>
    </div>
    <h3 class="text-lg font-semibold text-slate-800 mb-2">Brak zleceń</h3>
    <p class="text-slate-500">Nie znaleziono zleceń pasujących do kryteriów wyszukiwania</p>
</div>
<?php else: ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Zlecenie</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Firma</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priorytet</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Termin</th>
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
                        <div class="text-sm text-slate-800"><?= e($z['firma_nazwa']) ?></div>
                        <div class="text-xs text-slate-400"><?= e($z['autor_imie'] . ' ' . $z['autor_nazwisko']) ?></div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="status-badge bg-<?= status_color($z['status']) ?>-100 text-<?= status_color($z['status']) ?>-700">
                            <span class="w-2 h-2 rounded-full bg-<?= status_color($z['status']) ?>-500"></span>
                            <?= status_name($z['status']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap items-center gap-1">
                            <span class="text-sm font-medium text-<?= priority_color($z['priorytet']) ?>-600">
                                <?= priority_name($z['priorytet']) ?>
                            </span>
                            <?php if (!empty($etykietyMap[$z['id']])): ?>
                            <?php foreach ($etykietyMap[$z['id']] as $et): ?>
                            <span class="px-1.5 py-0.5 text-[10px] font-medium rounded" style="background: <?= e($et['kolor']) ?>20; color: <?= e($et['kolor']) ?>">
                                <?= e($et['nazwa']) ?>
                            </span>
                            <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-slate-600"><?= format_date($z['utworzono']) ?></div>
                        <div class="text-xs text-slate-400"><?= time_ago($z['utworzono']) ?></div>
                    </td>
                    <td class="px-6 py-4">
                        <?php if ($z['termin_realizacji']): ?>
                        <div class="text-sm <?= strtotime($z['termin_realizacji']) < time() && !in_array($z['status'], ['zakonczone', 'anulowane']) ? 'text-red-600 font-medium' : 'text-slate-600' ?>">
                            <?= format_date($z['termin_realizacji']) ?>
                        </div>
                        <?php else: ?>
                        <span class="text-slate-400 text-sm">—</span>
                        <?php endif; ?>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <a href="zlecenie.php?id=<?= $z['id'] ?>" class="inline-flex items-center gap-1 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium text-sm">
                            Otwórz
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<?php if ($totalPages > 1): ?>
<div class="mt-6 flex items-center justify-between">
    <div class="text-sm text-slate-500">
        Strona <?= $page ?> z <?= $totalPages ?> (<?= $total ?> wyników)
    </div>
    <div class="flex items-center gap-2">
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
</div>
<?php endif; ?>
<?php endif; ?>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
