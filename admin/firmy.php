<?php
/**
 * Panel admina - Zarządzanie firmami
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$firmaModel = new Firma();
$uzytkownikModel = new Uzytkownik();

$action = $_GET['action'] ?? 'list';
$id = (int) ($_GET['id'] ?? 0);

$errors = [];

// Obsługa formularzy
if (is_post() && check_csrf()) {
    $postAction = $_POST['action'] ?? '';

    switch ($postAction) {
        case 'create':
        case 'update':
            $data = [
                'nazwa' => trim($_POST['nazwa'] ?? ''),
                'email' => trim($_POST['email'] ?? ''),
                'nip' => trim($_POST['nip'] ?? ''),
                'telefon' => trim($_POST['telefon'] ?? ''),
                'adres' => trim($_POST['adres'] ?? ''),
                'notatki_wewnetrzne' => trim($_POST['notatki_wewnetrzne'] ?? ''),
                'aktywna' => isset($_POST['aktywna']) ? 1 : 0
            ];

            // Walidacja
            if (empty($data['nazwa'])) {
                $errors[] = 'Nazwa firmy jest wymagana';
            }
            if (empty($data['email']) || !valid_email($data['email'])) {
                $errors[] = 'Podaj poprawny adres email';
            }

            if (empty($errors)) {
                if ($postAction === 'create') {
                    $newId = $firmaModel->create($data);
                    flash('success', 'Firma została dodana');
                    redirect('firmy.php?action=view&id=' . $newId);
                } else {
                    $firmaModel->update($id, $data);
                    flash('success', 'Dane firmy zostały zaktualizowane');
                    redirect('firmy.php?action=view&id=' . $id);
                }
            }
            break;

        case 'toggle':
            $firmaModel->toggleActive($id);
            flash('success', 'Status firmy został zmieniony');
            redirect('firmy.php');
            break;

        case 'delete':
            $firmaModel->delete($id);
            flash('success', 'Firma została usunięta');
            redirect('firmy.php');
            break;
    }
}

// Pobierz dane w zależności od akcji
$firma = null;
$firmy = [];

if ($action === 'view' || $action === 'edit') {
    $firma = $firmaModel->getById($id);
    if (!$firma) {
        flash('error', 'Nie znaleziono firmy');
        redirect('firmy.php');
    }
}

if ($action === 'list') {
    $szukaj = $_GET['szukaj'] ?? '';
    $filters = [];
    if ($szukaj) {
        $filters['szukaj'] = $szukaj;
    }
    $firmy = $firmaModel->getList($filters);
}

$pageTitle = match($action) {
    'new' => 'Nowa firma',
    'edit' => 'Edycja firmy',
    'view' => $firma['nazwa'] ?? 'Firma',
    default => 'Firmy'
};
$isAdmin = true;

ob_start();
?>

<?php if ($action === 'list'): ?>
<!-- Lista firm -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
        <h2 class="text-2xl font-bold text-slate-800">Firmy / Klienci</h2>
        <p class="text-slate-500 mt-1">Zarządzaj kontami firm i ich użytkownikami</p>
    </div>
    <a href="?action=new" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Dodaj firmę
    </a>
</div>

<!-- Search -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
    <form method="GET" action="" class="flex gap-3">
        <div class="flex-1 relative">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            <input type="text" name="szukaj" value="<?= e($szukaj ?? '') ?>" placeholder="Szukaj po nazwie, email, NIP..."
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
        </div>
        <button type="submit" class="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors">
            Szukaj
        </button>
    </form>
</div>

<!-- Lista -->
<?php if (empty($firmy)): ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="building-2" class="w-8 h-8 text-slate-400"></i>
    </div>
    <h3 class="text-lg font-semibold text-slate-800 mb-2">Brak firm</h3>
    <p class="text-slate-500 mb-6">Dodaj pierwszą firmę, aby zacząć</p>
    <a href="?action=new" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700">
        <i data-lucide="plus" class="w-5 h-5"></i>
        Dodaj firmę
    </a>
</div>
<?php else: ?>
<div class="grid gap-4">
    <?php foreach ($firmy as $f): ?>
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all">
        <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                <?= mb_strtoupper(mb_substr($f['nazwa'], 0, 1)) ?>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-1">
                    <h3 class="text-lg font-semibold text-slate-800"><?= e($f['nazwa']) ?></h3>
                    <?php if (!$f['aktywna']): ?>
                    <span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Nieaktywna</span>
                    <?php endif; ?>
                </div>
                <div class="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span class="flex items-center gap-1">
                        <i data-lucide="mail" class="w-4 h-4"></i>
                        <?= e($f['email']) ?>
                    </span>
                    <?php if ($f['telefon']): ?>
                    <span class="flex items-center gap-1">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                        <?= e($f['telefon']) ?>
                    </span>
                    <?php endif; ?>
                    <?php if ($f['nip']): ?>
                    <span class="flex items-center gap-1">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                        NIP: <?= e($f['nip']) ?>
                    </span>
                    <?php endif; ?>
                </div>
                <div class="flex gap-4 mt-3">
                    <span class="text-xs text-slate-400">
                        <span class="font-semibold text-slate-600"><?= $f['liczba_uzytkownikow'] ?></span> użytkowników
                    </span>
                    <span class="text-xs text-slate-400">
                        <span class="font-semibold text-slate-600"><?= $f['liczba_zlecen'] ?></span> zleceń
                    </span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <a href="?action=view&id=<?= $f['id'] ?>" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Zobacz">
                    <i data-lucide="eye" class="w-5 h-5"></i>
                </a>
                <a href="?action=edit&id=<?= $f['id'] ?>" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edytuj">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                </a>
                <a href="zlecenia.php?firma_id=<?= $f['id'] ?>" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Zlecenia">
                    <i data-lucide="clipboard-list" class="w-5 h-5"></i>
                </a>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php elseif ($action === 'new' || $action === 'edit'): ?>
<!-- Formularz nowej/edycji firmy -->
<div class="max-w-2xl">
    <div class="mb-6">
        <a href="firmy.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do listy</span>
        </a>
        <h2 class="text-2xl font-bold text-slate-800"><?= $action === 'new' ? 'Dodaj nową firmę' : 'Edytuj firmę' ?></h2>
    </div>

    <?php if (!empty($errors)): ?>
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <ul class="text-sm text-red-700 list-disc list-inside">
            <?php foreach ($errors as $error): ?>
            <li><?= e($error) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <form method="POST" action="" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="<?= $action === 'new' ? 'create' : 'update' ?>">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-2">Nazwa firmy <span class="text-red-500">*</span></label>
                <input type="text" name="nazwa" value="<?= e($firma['nazwa'] ?? $_POST['nazwa'] ?? '') ?>" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Email kontaktowy <span class="text-red-500">*</span></label>
                <input type="email" name="email" value="<?= e($firma['email'] ?? $_POST['email'] ?? '') ?>" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                <input type="text" name="telefon" value="<?= e($firma['telefon'] ?? $_POST['telefon'] ?? '') ?>"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">NIP</label>
                <input type="text" name="nip" value="<?= e($firma['nip'] ?? $_POST['nip'] ?? '') ?>"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="aktywna" value="1" <?= ($firma['aktywna'] ?? 1) ? 'checked' : '' ?>
                           class="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                    <span class="text-slate-700">Firma aktywna</span>
                </label>
            </div>

            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-2">Adres</label>
                <textarea name="adres" rows="2"
                          class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"><?= e($firma['adres'] ?? $_POST['adres'] ?? '') ?></textarea>
            </div>

            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-2">Notatki wewnętrzne <span class="text-xs text-slate-400">(widoczne tylko dla admina)</span></label>
                <textarea name="notatki_wewnetrzne" rows="3"
                          class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"><?= e($firma['notatki_wewnetrzne'] ?? $_POST['notatki_wewnetrzne'] ?? '') ?></textarea>
            </div>
        </div>

        <div class="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <a href="firmy.php" class="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium">Anuluj</a>
            <button type="submit" class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all">
                <?= $action === 'new' ? 'Dodaj firmę' : 'Zapisz zmiany' ?>
            </button>
        </div>
    </form>
</div>

<?php elseif ($action === 'view'): ?>
<!-- Widok szczegółów firmy -->
<?php $uzytkownicy = $firmaModel->getUsers($id); ?>
<?php $stats = $firmaModel->getStats($id); ?>

<div class="max-w-4xl">
    <div class="mb-6">
        <a href="firmy.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do listy</span>
        </a>
        <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    <?= mb_strtoupper(mb_substr($firma['nazwa'], 0, 1)) ?>
                </div>
                <div>
                    <div class="flex items-center gap-3">
                        <h2 class="text-2xl font-bold text-slate-800"><?= e($firma['nazwa']) ?></h2>
                        <?php if (!$firma['aktywna']): ?>
                        <span class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">Nieaktywna</span>
                        <?php else: ?>
                        <span class="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">Aktywna</span>
                        <?php endif; ?>
                    </div>
                    <p class="text-slate-500"><?= e($firma['email']) ?></p>
                </div>
            </div>
            <div class="flex gap-2">
                <a href="?action=edit&id=<?= $id ?>" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                    Edytuj
                </a>
                <a href="uzytkownicy.php?action=new&firma_id=<?= $id ?>" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <i data-lucide="user-plus" class="w-4 h-4"></i>
                    Dodaj użytkownika
                </a>
            </div>
        </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div class="text-2xl font-bold text-slate-800"><?= $stats['wszystkie'] ?></div>
            <div class="text-sm text-slate-500">Wszystkich zleceń</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div class="text-2xl font-bold text-yellow-600"><?= $stats['aktywne'] ?></div>
            <div class="text-sm text-slate-500">Aktywnych</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div class="text-2xl font-bold text-green-600"><?= $stats['statusy']['zakonczone'] ?? 0 ?></div>
            <div class="text-sm text-slate-500">Zakończonych</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div class="text-2xl font-bold text-indigo-600"><?= count($uzytkownicy) ?></div>
            <div class="text-sm text-slate-500">Użytkowników</div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Informacje -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Informacje</h3>
            <dl class="space-y-4">
                <?php if ($firma['telefon']): ?>
                <div>
                    <dt class="text-xs font-medium text-slate-400 uppercase">Telefon</dt>
                    <dd class="mt-1 text-sm text-slate-800"><?= e($firma['telefon']) ?></dd>
                </div>
                <?php endif; ?>
                <?php if ($firma['nip']): ?>
                <div>
                    <dt class="text-xs font-medium text-slate-400 uppercase">NIP</dt>
                    <dd class="mt-1 text-sm text-slate-800"><?= e($firma['nip']) ?></dd>
                </div>
                <?php endif; ?>
                <?php if ($firma['adres']): ?>
                <div>
                    <dt class="text-xs font-medium text-slate-400 uppercase">Adres</dt>
                    <dd class="mt-1 text-sm text-slate-800"><?= nl2br(e($firma['adres'])) ?></dd>
                </div>
                <?php endif; ?>
                <div>
                    <dt class="text-xs font-medium text-slate-400 uppercase">Dodano</dt>
                    <dd class="mt-1 text-sm text-slate-800"><?= format_datetime($firma['utworzono']) ?></dd>
                </div>
            </dl>

            <?php if ($firma['notatki_wewnetrzne']): ?>
            <div class="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <i data-lucide="lock" class="w-4 h-4"></i>
                    Notatki wewnętrzne
                </h4>
                <p class="text-sm text-amber-700"><?= nl2br(e($firma['notatki_wewnetrzne'])) ?></p>
            </div>
            <?php endif; ?>
        </div>

        <!-- Użytkownicy -->
        <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-800">Użytkownicy</h3>
                <a href="uzytkownicy.php?action=new&firma_id=<?= $id ?>" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Dodaj</a>
            </div>
            <?php if (empty($uzytkownicy)): ?>
            <p class="text-slate-500 text-sm">Brak użytkowników</p>
            <?php else: ?>
            <div class="space-y-3">
                <?php foreach ($uzytkownicy as $u): ?>
                <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        <?= get_initials($u['imie'] . ' ' . $u['nazwisko']) ?>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium text-slate-800"><?= e($u['imie'] . ' ' . $u['nazwisko']) ?></div>
                        <div class="text-sm text-slate-500"><?= e($u['email']) ?></div>
                    </div>
                    <?php if (!$u['aktywny']): ?>
                    <span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Nieaktywny</span>
                    <?php endif; ?>
                    <a href="uzytkownicy.php?action=edit&id=<?= $u['id'] ?>" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </a>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Link do zleceń -->
    <div class="mt-6">
        <a href="zlecenia.php?firma_id=<?= $id ?>" class="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700">
            <i data-lucide="clipboard-list" class="w-5 h-5"></i>
            Zobacz wszystkie zlecenia tej firmy
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
</div>
<?php endif; ?>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
