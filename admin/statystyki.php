<?php
/**
 * Panel admina - Statystyki
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$db = Database::getInstance();

// Statystyki ogólne
$zlecenieModel = new Zlecenie();
$firmaModel = new Firma();
$uzytkownikModel = new Uzytkownik();

$stats = $zlecenieModel->getStats();
$liczbafirm = $firmaModel->count(['aktywna' => 1]);
$liczbaKlientow = $uzytkownikModel->count(['rola' => 'klient', 'aktywny' => 1]);

// Zlecenia w ostatnich 30 dniach
$zlecenia30dni = $db->fetch(
    "SELECT COUNT(*) as cnt FROM zlecenia WHERE utworzono >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
)['cnt'];

// Zlecenia zakończone w tym miesiącu
$zakonczoneTegoMiesiaca = $db->fetch(
    "SELECT COUNT(*) as cnt FROM zlecenia WHERE status = 'zakonczone' AND MONTH(zakonczono) = MONTH(NOW()) AND YEAR(zakonczono) = YEAR(NOW())"
)['cnt'];

// Top 5 firm wg liczby zleceń
$topFirmy = $db->fetchAll(
    "SELECT f.nazwa, COUNT(z.id) as liczba_zlecen
     FROM firmy f
     LEFT JOIN zlecenia z ON f.id = z.firma_id
     GROUP BY f.id
     ORDER BY liczba_zlecen DESC
     LIMIT 5"
);

// Zlecenia wg kategorii
$zlecenieWgKategorii = $db->fetchAll(
    "SELECT k.nazwa, k.kolor, COUNT(z.id) as liczba
     FROM kategorie k
     LEFT JOIN zlecenia z ON k.id = z.kategoria_id
     GROUP BY k.id
     ORDER BY liczba DESC"
);

// Zlecenia wg miesiąca (ostatnie 6 miesięcy)
$zlecenieWgMiesiaca = $db->fetchAll(
    "SELECT DATE_FORMAT(utworzono, '%Y-%m') as miesiac,
            DATE_FORMAT(utworzono, '%m/%Y') as miesiac_label,
            COUNT(*) as liczba
     FROM zlecenia
     WHERE utworzono >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY miesiac
     ORDER BY miesiac ASC"
);

// Średni czas realizacji (dla zakończonych zleceń)
$sredniCzas = $db->fetch(
    "SELECT AVG(DATEDIFF(zakonczono, utworzono)) as srednia
     FROM zlecenia
     WHERE status = 'zakonczone' AND zakonczono IS NOT NULL"
)['srednia'];

$pageTitle = 'Statystyki';
$isAdmin = true;

ob_start();
?>

<div class="mb-8">
    <h2 class="text-2xl font-bold text-slate-800">Statystyki</h2>
    <p class="text-slate-500 mt-1">Przegląd działalności i wyników</p>
</div>

<!-- Main Stats -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i data-lucide="clipboard-list" class="w-6 h-6"></i>
            </div>
            <span class="text-3xl font-bold"><?= $stats['wszystkie'] ?></span>
        </div>
        <h3 class="text-sm font-medium opacity-80">Wszystkich zleceń</h3>
    </div>

    <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i data-lucide="check-circle" class="w-6 h-6"></i>
            </div>
            <span class="text-3xl font-bold"><?= $stats['statusy']['zakonczone'] ?? 0 ?></span>
        </div>
        <h3 class="text-sm font-medium opacity-80">Zakończonych</h3>
    </div>

    <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i data-lucide="trending-up" class="w-6 h-6"></i>
            </div>
            <span class="text-3xl font-bold"><?= $zlecenia30dni ?></span>
        </div>
        <h3 class="text-sm font-medium opacity-80">Ostatnie 30 dni</h3>
    </div>

    <div class="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white">
        <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i data-lucide="clock" class="w-6 h-6"></i>
            </div>
            <span class="text-3xl font-bold"><?= $sredniCzas ? round($sredniCzas) : '—' ?></span>
        </div>
        <h3 class="text-sm font-medium opacity-80">Śr. dni realizacji</h3>
    </div>
</div>

<!-- Status Overview -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
    <h3 class="text-lg font-semibold text-slate-800 mb-4">Zlecenia wg statusu</h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <?php foreach (Zlecenie::STATUSY as $key => $st): ?>
        <div class="text-center">
            <div class="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div class="bg-<?= status_color($key) ?>-500 h-2 rounded-full" style="width: <?= $stats['wszystkie'] > 0 ? (($stats['statusy'][$key] ?? 0) / $stats['wszystkie'] * 100) : 0 ?>%"></div>
            </div>
            <div class="text-2xl font-bold text-<?= status_color($key) ?>-600"><?= $stats['statusy'][$key] ?? 0 ?></div>
            <div class="text-xs text-slate-500"><?= $st['nazwa'] ?></div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Top Firmy -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-4">Top 5 firm</h3>
        <div class="space-y-4">
            <?php foreach ($topFirmy as $i => $f): ?>
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    <?= $i + 1 ?>
                </div>
                <div class="flex-1">
                    <div class="font-medium text-slate-800"><?= e($f['nazwa']) ?></div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <?php $maxZlecen = $topFirmy[0]['liczba_zlecen'] ?: 1; ?>
                        <div class="bg-indigo-500 h-1.5 rounded-full" style="width: <?= ($f['liczba_zlecen'] / $maxZlecen * 100) ?>%"></div>
                    </div>
                </div>
                <div class="text-lg font-bold text-slate-800"><?= $f['liczba_zlecen'] ?></div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Kategorie -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-4">Zlecenia wg kategorii</h3>
        <div class="space-y-3">
            <?php foreach ($zlecenieWgKategorii as $k): ?>
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full" style="background: <?= e($k['kolor']) ?>"></div>
                <div class="flex-1 font-medium text-slate-700"><?= e($k['nazwa']) ?></div>
                <div class="text-sm font-semibold text-slate-800"><?= $k['liczba'] ?></div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<!-- Wykres miesięczny (prosty) -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h3 class="text-lg font-semibold text-slate-800 mb-4">Zlecenia w ostatnich 6 miesiącach</h3>
    <div class="flex items-end justify-between gap-4 h-48">
        <?php
        $maxMiesiac = max(array_column($zlecenieWgMiesiaca, 'liczba')) ?: 1;
        foreach ($zlecenieWgMiesiaca as $m):
            $height = ($m['liczba'] / $maxMiesiac * 100);
        ?>
        <div class="flex-1 flex flex-col items-center gap-2">
            <div class="text-sm font-bold text-indigo-600"><?= $m['liczba'] ?></div>
            <div class="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all" style="height: <?= max($height, 5) ?>%"></div>
            <div class="text-xs text-slate-500"><?= $m['miesiac_label'] ?></div>
        </div>
        <?php endforeach; ?>
        <?php if (empty($zlecenieWgMiesiaca)): ?>
        <div class="w-full text-center text-slate-400 py-12">Brak danych</div>
        <?php endif; ?>
    </div>
</div>

<!-- Podsumowanie -->
<div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="bg-slate-50 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-slate-800"><?= $liczbafirm ?></div>
        <div class="text-sm text-slate-500">Aktywnych firm</div>
    </div>
    <div class="bg-slate-50 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-slate-800"><?= $liczbaKlientow ?></div>
        <div class="text-sm text-slate-500">Klientów</div>
    </div>
    <div class="bg-slate-50 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-slate-800"><?= $zakonczoneTegoMiesiaca ?></div>
        <div class="text-sm text-slate-500">Zakończonych w tym miesiącu</div>
    </div>
    <div class="bg-slate-50 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-slate-800"><?= $stats['aktywne'] ?></div>
        <div class="text-sm text-slate-500">Aktywnych zleceń</div>
    </div>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
