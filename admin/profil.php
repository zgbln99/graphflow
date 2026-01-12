<?php
/**
 * Panel klienta - Profil użytkownika
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireLogin();
$user = $auth->getUser();

$errors = [];
$success = false;

// Obsługa formularza
if (is_post() && check_csrf()) {
    $action = $_POST['action'] ?? '';

    if ($action === 'profile') {
        $imie = trim($_POST['imie'] ?? '');
        $nazwisko = trim($_POST['nazwisko'] ?? '');
        $telefon = trim($_POST['telefon'] ?? '');

        if (empty($imie)) {
            $errors[] = 'Imię jest wymagane';
        }
        if (empty($nazwisko)) {
            $errors[] = 'Nazwisko jest wymagane';
        }

        if (empty($errors)) {
            $uzytkownikModel = new Uzytkownik();
            $uzytkownikModel->update($user['id'], [
                'imie' => $imie,
                'nazwisko' => $nazwisko,
                'telefon' => $telefon
            ]);
            flash('success', 'Profil został zaktualizowany');
            redirect('profil.php');
        }
    }

    if ($action === 'password') {
        $obecne = $_POST['obecne_haslo'] ?? '';
        $nowe = $_POST['nowe_haslo'] ?? '';
        $powtorz = $_POST['powtorz_haslo'] ?? '';

        if (empty($obecne)) {
            $errors[] = 'Podaj obecne hasło';
        }
        if (empty($nowe)) {
            $errors[] = 'Podaj nowe hasło';
        }
        if (strlen($nowe) < 6) {
            $errors[] = 'Nowe hasło musi mieć minimum 6 znaków';
        }
        if ($nowe !== $powtorz) {
            $errors[] = 'Hasła nie są identyczne';
        }

        if (empty($errors)) {
            $result = $auth->changePassword($user['id'], $obecne, $nowe);
            if ($result['success']) {
                flash('success', 'Hasło zostało zmienione');
                redirect('profil.php');
            } else {
                $errors[] = $result['message'];
            }
        }
    }
}

// Odśwież dane użytkownika
$user = $auth->getUser();

$pageTitle = 'Mój profil';
$isAdmin = true;

ob_start();
?>

<div class="max-w-2xl">
    <div class="mb-8">
        <h2 class="text-2xl font-bold text-slate-800">Mój profil</h2>
        <p class="text-slate-500 mt-1">Zarządzaj swoimi danymi i ustawieniami konta</p>
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

    <!-- Profil użytkownika -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                <?= get_initials($user['imie'] . ' ' . $user['nazwisko']) ?>
            </div>
            <div>
                <h3 class="text-xl font-bold text-slate-800"><?= e($user['imie'] . ' ' . $user['nazwisko']) ?></h3>
                <p class="text-slate-500"><?= e($user['email']) ?></p>
                <?php if ($user['firma_nazwa']): ?>
                <p class="text-sm text-indigo-600 font-medium mt-1"><?= e($user['firma_nazwa']) ?></p>
                <?php endif; ?>
            </div>
        </div>

        <form method="POST" action="" class="space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="profile">

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Imię</label>
                    <input type="text" name="imie" value="<?= e($user['imie']) ?>" required
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Nazwisko</label>
                    <input type="text" name="nazwisko" value="<?= e($user['nazwisko']) ?>" required
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input type="email" value="<?= e($user['email']) ?>" disabled
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500">
                <p class="text-xs text-slate-400 mt-1">Adres email nie może być zmieniony</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                <input type="text" name="telefon" value="<?= e($user['telefon']) ?>"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div class="pt-4">
                <button type="submit" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                    Zapisz zmiany
                </button>
            </div>
        </form>
    </div>

    <!-- Zmiana hasła -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <i data-lucide="lock" class="w-5 h-5 text-slate-400"></i>
            Zmiana hasła
        </h3>

        <form method="POST" action="" class="space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="password">

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Obecne hasło</label>
                <input type="password" name="obecne_haslo" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Nowe hasło</label>
                <input type="password" name="nowe_haslo" required minlength="6"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                <p class="text-xs text-slate-400 mt-1">Minimum 6 znaków</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Powtórz nowe hasło</label>
                <input type="password" name="powtorz_haslo" required
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
            </div>

            <div class="pt-4">
                <button type="submit" class="px-6 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 transition-colors">
                    Zmień hasło
                </button>
            </div>
        </form>
    </div>

    <!-- Informacje o koncie -->
    <div class="mt-6 p-4 bg-slate-50 rounded-xl">
        <h4 class="font-medium text-slate-700 mb-2">Informacje o koncie</h4>
        <dl class="text-sm space-y-1">
            <div class="flex justify-between">
                <dt class="text-slate-500">Typ konta:</dt>
                <dd class="text-slate-700 font-medium"><?= ucfirst($user['rola']) ?></dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-slate-500">Konto utworzone:</dt>
                <dd class="text-slate-700"><?= format_date($user['utworzono']) ?></dd>
            </div>
            <?php if ($user['ostatnie_logowanie']): ?>
            <div class="flex justify-between">
                <dt class="text-slate-500">Ostatnie logowanie:</dt>
                <dd class="text-slate-700"><?= format_datetime($user['ostatnie_logowanie']) ?></dd>
            </div>
            <?php endif; ?>
        </dl>
    </div>
</div>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
