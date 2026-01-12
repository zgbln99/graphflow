<?php
/**
 * Panel admina - Zarządzanie użytkownikami
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireAdmin();
$user = $auth->getUser();

$uzytkownikModel = new Uzytkownik();
$firmaModel = new Firma();

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
                'imie' => trim($_POST['imie'] ?? ''),
                'nazwisko' => trim($_POST['nazwisko'] ?? ''),
                'email' => trim($_POST['email'] ?? ''),
                'telefon' => trim($_POST['telefon'] ?? ''),
                'stanowisko' => trim($_POST['stanowisko'] ?? ''),
                'firma_id' => $_POST['firma_id'] ?: null,
                'rola' => $_POST['rola'] ?? 'klient',
                'aktywny' => isset($_POST['aktywny']) ? 1 : 0
            ];

            if (!empty($_POST['haslo'])) {
                $data['haslo'] = $_POST['haslo'];
            }

            // Walidacja
            if (empty($data['imie'])) {
                $errors[] = 'Imię jest wymagane';
            }
            if (empty($data['nazwisko'])) {
                $errors[] = 'Nazwisko jest wymagane';
            }
            if (empty($data['email']) || !valid_email($data['email'])) {
                $errors[] = 'Podaj poprawny adres email';
            }
            if ($uzytkownikModel->emailExists($data['email'], $postAction === 'update' ? $id : null)) {
                $errors[] = 'Ten adres email jest już zajęty';
            }
            if ($postAction === 'create' && empty($data['haslo'])) {
                $errors[] = 'Hasło jest wymagane';
            }
            if (!empty($data['haslo']) && strlen($data['haslo']) < 6) {
                $errors[] = 'Hasło musi mieć minimum 6 znaków';
            }

            if (empty($errors)) {
                if ($postAction === 'create') {
                    $newId = $uzytkownikModel->create($data);
                    flash('success', 'Użytkownik został dodany');
                    redirect('uzytkownicy.php');
                } else {
                    $uzytkownikModel->update($id, $data);
                    flash('success', 'Dane użytkownika zostały zaktualizowane');
                    redirect('uzytkownicy.php');
                }
            }
            break;

        case 'toggle':
            $uzytkownikModel->toggleActive($id);
            flash('success', 'Status użytkownika został zmieniony');
            redirect('uzytkownicy.php');
            break;

        case 'delete':
            if ($id !== $user['id']) {
                $uzytkownikModel->delete($id);
                flash('success', 'Użytkownik został usunięty');
            } else {
                flash('error', 'Nie możesz usunąć własnego konta');
            }
            redirect('uzytkownicy.php');
            break;
    }
}

// Pobierz dane
$uzytkownik = null;
$uzytkownicy = [];
$firmy = $firmaModel->getList(['aktywna' => 1]);

if ($action === 'edit') {
    $uzytkownik = $uzytkownikModel->getById($id);
    if (!$uzytkownik) {
        flash('error', 'Nie znaleziono użytkownika');
        redirect('uzytkownicy.php');
    }
}

if ($action === 'list') {
    $szukaj = $_GET['szukaj'] ?? '';
    $rola = $_GET['rola'] ?? '';
    $firma_id = $_GET['firma_id'] ?? '';

    $filters = [];
    if ($szukaj) $filters['szukaj'] = $szukaj;
    if ($rola) $filters['rola'] = $rola;
    if ($firma_id) $filters['firma_id'] = $firma_id;

    $uzytkownicy = $uzytkownikModel->getList($filters);
}

// Prefill firma_id z GET
$prefilledFirmaId = $_GET['firma_id'] ?? null;

$pageTitle = match($action) {
    'new' => 'Nowy użytkownik',
    'edit' => 'Edycja użytkownika',
    default => 'Użytkownicy'
};
$isAdmin = true;

ob_start();
?>

<?php if ($action === 'list'): ?>
<!-- Lista użytkowników -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
        <h2 class="text-2xl font-bold text-slate-800">Użytkownicy</h2>
        <p class="text-slate-500 mt-1">Zarządzaj kontami użytkowników</p>
    </div>
    <a href="?action=new" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">
        <i data-lucide="user-plus" class="w-5 h-5"></i>
        Dodaj użytkownika
    </a>
</div>

<!-- Filtry -->
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
    <form method="GET" action="" class="flex flex-col md:flex-row gap-3">
        <div class="flex-1 relative">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            <input type="text" name="szukaj" value="<?= e($szukaj ?? '') ?>" placeholder="Szukaj..."
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
        </div>
        <select name="rola" class="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
            <option value="">Wszystkie role</option>
            <option value="admin" <?= ($rola ?? '') === 'admin' ? 'selected' : '' ?>>Administrator</option>
            <option value="pracownik" <?= ($rola ?? '') === 'pracownik' ? 'selected' : '' ?>>Pracownik</option>
            <option value="klient" <?= ($rola ?? '') === 'klient' ? 'selected' : '' ?>>Klient</option>
        </select>
        <select name="firma_id" class="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
            <option value="">Wszystkie firmy</option>
            <?php foreach ($firmy as $f): ?>
            <option value="<?= $f['id'] ?>" <?= ($firma_id ?? '') == $f['id'] ? 'selected' : '' ?>><?= e($f['nazwa']) ?></option>
            <?php endforeach; ?>
        </select>
        <button type="submit" class="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors">
            Filtruj
        </button>
    </form>
</div>

<!-- Lista -->
<?php if (empty($uzytkownicy)): ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="users" class="w-8 h-8 text-slate-400"></i>
    </div>
    <h3 class="text-lg font-semibold text-slate-800 mb-2">Brak użytkowników</h3>
    <p class="text-slate-500 mb-6">Dodaj pierwszego użytkownika</p>
    <a href="?action=new" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700">
        <i data-lucide="user-plus" class="w-5 h-5"></i>
        Dodaj użytkownika
    </a>
</div>
<?php else: ?>
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <table class="w-full">
        <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Użytkownik</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Firma</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rola</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Zlecenia</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4"></th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            <?php foreach ($uzytkownicy as $u): ?>
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br <?= $u['rola'] === 'admin' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-purple-600' ?> flex items-center justify-center text-white text-sm font-semibold">
                            <?= get_initials($u['imie'] . ' ' . $u['nazwisko']) ?>
                        </div>
                        <div>
                            <div class="font-medium text-slate-800"><?= e($u['imie'] . ' ' . $u['nazwisko']) ?></div>
                            <div class="text-sm text-slate-500"><?= e($u['email']) ?></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <?php if ($u['firma_nazwa']): ?>
                    <span class="text-sm text-slate-700"><?= e($u['firma_nazwa']) ?></span>
                    <?php else: ?>
                    <span class="text-sm text-slate-400">—</span>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-medium
                        <?= $u['rola'] === 'admin' ? 'bg-purple-100 text-purple-700' : ($u['rola'] === 'pracownik' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700') ?>">
                        <?= $u['rola'] === 'admin' ? 'Administrator' : ($u['rola'] === 'pracownik' ? 'Pracownik' : 'Klient') ?>
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm text-slate-600"><?= $u['liczba_zlecen'] ?></span>
                </td>
                <td class="px-6 py-4">
                    <?php if ($u['aktywny']): ?>
                    <span class="flex items-center gap-1 text-green-600 text-sm">
                        <span class="w-2 h-2 rounded-full bg-green-500"></span>
                        Aktywny
                    </span>
                    <?php else: ?>
                    <span class="flex items-center gap-1 text-red-600 text-sm">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        Nieaktywny
                    </span>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                        <a href="?action=edit&id=<?= $u['id'] ?>" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edytuj">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </a>
                        <?php if ($u['id'] !== $user['id']): ?>
                        <form method="POST" action="" class="inline" onsubmit="return confirm('Na pewno chcesz zmienić status tego użytkownika?')">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="toggle">
                            <input type="hidden" name="id" value="<?= $u['id'] ?>">
                            <button type="submit" class="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="<?= $u['aktywny'] ? 'Dezaktywuj' : 'Aktywuj' ?>">
                                <i data-lucide="<?= $u['aktywny'] ? 'user-x' : 'user-check' ?>" class="w-4 h-4"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php endif; ?>

<?php elseif ($action === 'new' || $action === 'edit'): ?>
<!-- Formularz -->
<div class="max-w-2xl">
    <div class="mb-6">
        <a href="uzytkownicy.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do listy</span>
        </a>
        <h2 class="text-2xl font-bold text-slate-800"><?= $action === 'new' ? 'Dodaj użytkownika' : 'Edytuj użytkownika' ?></h2>
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

    <form method="POST" action="?action=<?= $action ?><?= $id ? '&id=' . $id : '' ?>" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="<?= $action === 'new' ? 'create' : 'update' ?>">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Imię <span class="text-red-500">*</span></label>
                <input type="text" name="imie" value="<?= e($uzytkownik['imie'] ?? $_POST['imie'] ?? '') ?>" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Nazwisko <span class="text-red-500">*</span></label>
                <input type="text" name="nazwisko" value="<?= e($uzytkownik['nazwisko'] ?? $_POST['nazwisko'] ?? '') ?>" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Email <span class="text-red-500">*</span></label>
                <input type="email" name="email" value="<?= e($uzytkownik['email'] ?? $_POST['email'] ?? '') ?>" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                <input type="text" name="telefon" value="<?= e($uzytkownik['telefon'] ?? $_POST['telefon'] ?? '') ?>"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                    Hasło <?= $action === 'new' ? '<span class="text-red-500">*</span>' : '<span class="text-xs text-slate-400">(pozostaw puste, aby nie zmieniać)</span>' ?>
                </label>
                <input type="password" name="haslo" <?= $action === 'new' ? 'required' : '' ?>
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Stanowisko</label>
                <input type="text" name="stanowisko" value="<?= e($uzytkownik['stanowisko'] ?? $_POST['stanowisko'] ?? '') ?>"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Firma</label>
                <select name="firma_id" class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
                    <option value="">— Brak (tylko dla adminów/pracowników) —</option>
                    <?php foreach ($firmy as $f): ?>
                    <option value="<?= $f['id'] ?>" <?= ($uzytkownik['firma_id'] ?? $prefilledFirmaId ?? $_POST['firma_id'] ?? '') == $f['id'] ? 'selected' : '' ?>>
                        <?= e($f['nazwa']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Rola</label>
                <select name="rola" class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white">
                    <option value="klient" <?= ($uzytkownik['rola'] ?? $_POST['rola'] ?? '') === 'klient' ? 'selected' : '' ?>>Klient</option>
                    <option value="pracownik" <?= ($uzytkownik['rola'] ?? $_POST['rola'] ?? '') === 'pracownik' ? 'selected' : '' ?>>Pracownik</option>
                    <option value="admin" <?= ($uzytkownik['rola'] ?? $_POST['rola'] ?? '') === 'admin' ? 'selected' : '' ?>>Administrator</option>
                </select>
            </div>

            <div class="md:col-span-2">
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="aktywny" value="1" <?= ($uzytkownik['aktywny'] ?? 1) ? 'checked' : '' ?>
                           class="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                    <span class="text-slate-700">Konto aktywne</span>
                </label>
            </div>
        </div>

        <div class="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <a href="uzytkownicy.php" class="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium">Anuluj</a>
            <button type="submit" class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all">
                <?= $action === 'new' ? 'Dodaj użytkownika' : 'Zapisz zmiany' ?>
            </button>
        </div>
    </form>

    <?php if ($action === 'new'): ?>
    <div class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <i data-lucide="info" class="w-5 h-5"></i>
            Informacja
        </h4>
        <p class="text-sm text-blue-700">
            Po utworzeniu konta użytkownik będzie mógł zalogować się używając podanego emaila i hasła.
            Dla klientów zalecane jest przypisanie do firmy.
        </p>
    </div>
    <?php endif; ?>
</div>
<?php endif; ?>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
