<?php
/**
 * Panel admina - Kalendarz terminów
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$db = Database::getInstance();

// Pobierz rok i miesiąc z parametrów lub użyj bieżących
$year = isset($_GET['rok']) ? (int) $_GET['rok'] : (int) date('Y');
$month = isset($_GET['miesiac']) ? (int) $_GET['miesiac'] : (int) date('m');

// Walidacja
if ($month < 1) {
    $month = 12;
    $year--;
} elseif ($month > 12) {
    $month = 1;
    $year++;
}

// Pierwszy i ostatni dzień miesiąca
$firstDay = mktime(0, 0, 0, $month, 1, $year);
$lastDay = mktime(23, 59, 59, $month + 1, 0, $year);
$daysInMonth = (int) date('t', $firstDay);
$startWeekday = (int) date('N', $firstDay); // 1=Pon, 7=Niedz

// Pobierz zlecenia z terminami w tym miesiącu
$zlecenia = $db->fetchAll(
    "SELECT z.id, z.numer, z.tytul, z.termin_realizacji, z.status, z.priorytet,
            f.nazwa as firma_nazwa
     FROM zlecenia z
     LEFT JOIN firmy f ON z.firma_id = f.id
     WHERE z.termin_realizacji BETWEEN ? AND ?
     AND z.status NOT IN ('zakonczone', 'anulowane')
     ORDER BY z.termin_realizacji ASC, z.priorytet DESC",
    [date('Y-m-d', $firstDay), date('Y-m-d', $lastDay)]
);

// Grupuj zlecenia po dniach
$zlecenieByDay = [];
foreach ($zlecenia as $z) {
    $day = (int) date('j', strtotime($z['termin_realizacji']));
    $zlecenieByDay[$day][] = $z;
}

// Nazwy miesięcy po polsku
$months = [
    1 => 'Styczeń', 2 => 'Luty', 3 => 'Marzec', 4 => 'Kwiecień',
    5 => 'Maj', 6 => 'Czerwiec', 7 => 'Lipiec', 8 => 'Sierpień',
    9 => 'Wrzesień', 10 => 'Październik', 11 => 'Listopad', 12 => 'Grudzień'
];

$pageTitle = 'Kalendarz terminów';
$isAdmin = true;

ob_start();
?>

<div class="mb-6">
    <h2 class="text-2xl font-bold text-slate-800">Kalendarz terminów</h2>
    <p class="text-slate-500 mt-1">Przegląd terminów realizacji zleceń</p>
</div>

<!-- Nawigacja kalendarza -->
<div class="flex items-center justify-between mb-6">
    <a href="?rok=<?= $month == 1 ? $year - 1 : $year ?>&miesiac=<?= $month == 1 ? 12 : $month - 1 ?>"
       class="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
        <i data-lucide="chevron-left" class="w-5 h-5"></i>
        Poprzedni
    </a>

    <div class="text-center">
        <h3 class="text-xl font-bold text-slate-800"><?= $months[$month] ?> <?= $year ?></h3>
        <p class="text-sm text-slate-500"><?= count($zlecenia) ?> zleceń z terminem</p>
    </div>

    <a href="?rok=<?= $month == 12 ? $year + 1 : $year ?>&miesiac=<?= $month == 12 ? 1 : $month + 1 ?>"
       class="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
        Następny
        <i data-lucide="chevron-right" class="w-5 h-5"></i>
    </a>
</div>

<!-- Kalendarz -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Nagłówek dni tygodnia -->
    <div class="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        <?php foreach (['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'] as $dayName): ?>
        <div class="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <?= $dayName ?>
        </div>
        <?php endforeach; ?>
    </div>

    <!-- Dni -->
    <div class="grid grid-cols-7">
        <?php
        // Puste komórki przed pierwszym dniem
        for ($i = 1; $i < $startWeekday; $i++):
        ?>
        <div class="min-h-28 p-2 bg-slate-50 border-b border-r border-slate-100"></div>
        <?php endfor; ?>

        <?php
        // Dni miesiąca
        $today = date('Y-m-d');
        for ($day = 1; $day <= $daysInMonth; $day++):
            $currentDate = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $isToday = $currentDate === $today;
            $isPast = $currentDate < $today;
            $dayOrders = $zlecenieByDay[$day] ?? [];
            $weekday = ($startWeekday + $day - 2) % 7 + 1;
            $isWeekend = $weekday >= 6;
        ?>
        <div class="min-h-28 p-2 border-b border-r border-slate-100 <?= $isWeekend ? 'bg-slate-50' : '' ?> <?= $isToday ? 'bg-indigo-50' : '' ?>">
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold <?= $isToday ? 'w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center' : ($isPast ? 'text-slate-400' : 'text-slate-700') ?>">
                    <?= $day ?>
                </span>
                <?php if (count($dayOrders) > 0): ?>
                <span class="text-xs text-slate-400"><?= count($dayOrders) ?></span>
                <?php endif; ?>
            </div>

            <div class="space-y-1 overflow-hidden">
                <?php foreach (array_slice($dayOrders, 0, 3) as $ord): ?>
                <a href="zlecenie.php?id=<?= $ord['id'] ?>"
                   class="block px-2 py-1 text-xs rounded truncate transition-colors
                          bg-<?= status_color($ord['status']) ?>-100 text-<?= status_color($ord['status']) ?>-700
                          hover:bg-<?= status_color($ord['status']) ?>-200"
                   title="<?= e($ord['numer']) ?>: <?= e($ord['tytul']) ?>">
                    <span class="font-medium"><?= e($ord['numer']) ?></span>
                </a>
                <?php endforeach; ?>
                <?php if (count($dayOrders) > 3): ?>
                <div class="text-xs text-slate-500 pl-2">+<?= count($dayOrders) - 3 ?> więcej</div>
                <?php endif; ?>
            </div>
        </div>
        <?php endfor; ?>

        <?php
        // Puste komórki po ostatnim dniu
        $endWeekday = ($startWeekday + $daysInMonth - 2) % 7 + 1;
        for ($i = $endWeekday; $i < 7; $i++):
        ?>
        <div class="min-h-28 p-2 bg-slate-50 border-b border-r border-slate-100"></div>
        <?php endfor; ?>
    </div>
</div>

<!-- Lista nadchodzących terminów -->
<div class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <i data-lucide="clock" class="w-5 h-5 text-indigo-600"></i>
        Nadchodzące terminy w tym miesiącu
    </h3>

    <?php if (empty($zlecenia)): ?>
    <p class="text-slate-500 text-center py-8">Brak zleceń z terminem w tym miesiącu</p>
    <?php else: ?>
    <div class="space-y-3">
        <?php foreach ($zlecenia as $z): ?>
        <?php
        $daysLeft = (strtotime($z['termin_realizacji']) - strtotime(date('Y-m-d'))) / 86400;
        $isOverdue = $daysLeft < 0;
        $isUrgent = $daysLeft >= 0 && $daysLeft <= 2;
        ?>
        <a href="zlecenie.php?id=<?= $z['id'] ?>" class="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div class="flex-shrink-0 w-16 text-center">
                <div class="text-2xl font-bold <?= $isOverdue ? 'text-red-600' : ($isUrgent ? 'text-orange-600' : 'text-slate-800') ?>">
                    <?= date('d', strtotime($z['termin_realizacji'])) ?>
                </div>
                <div class="text-xs text-slate-500"><?= $months[$month] ?></div>
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono text-indigo-600"><?= e($z['numer']) ?></span>
                    <span class="status-badge bg-<?= status_color($z['status']) ?>-100 text-<?= status_color($z['status']) ?>-700 text-[10px]">
                        <?= status_name($z['status']) ?>
                    </span>
                </div>
                <div class="font-medium text-slate-800 truncate"><?= e($z['tytul']) ?></div>
                <div class="text-xs text-slate-500"><?= e($z['firma_nazwa']) ?></div>
            </div>

            <div class="flex-shrink-0 text-right">
                <?php if ($isOverdue): ?>
                <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg">
                    <?= abs((int)$daysLeft) ?> dni po terminie
                </span>
                <?php elseif ($daysLeft == 0): ?>
                <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg">
                    Dziś!
                </span>
                <?php elseif ($daysLeft == 1): ?>
                <span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg">
                    Jutro
                </span>
                <?php else: ?>
                <span class="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
                    za <?= (int)$daysLeft ?> dni
                </span>
                <?php endif; ?>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
