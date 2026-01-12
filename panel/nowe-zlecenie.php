<?php
/**
 * Panel klienta - Nowe zlecenie
 */
require_once __DIR__ . '/../includes/init.php';

$auth->requireLogin();
$user = $auth->getUser();

$zlecenieModel = new Zlecenie();
$kategorie = $zlecenieModel->getCategories();

$errors = [];
$success = false;

// Duplikowanie zlecenia
$duplikuj = null;
if (!empty($_GET['duplikuj'])) {
    $duplikujId = (int) $_GET['duplikuj'];
    $duplikuj = $zlecenieModel->getById($duplikujId);
    if ($duplikuj && !can_access_order($duplikuj, $user)) {
        $duplikuj = null;
    }
}

// Obsługa formularza
if (is_post() && check_csrf()) {
    $tytul = trim($_POST['tytul'] ?? '');
    $opis = trim($_POST['opis'] ?? '');
    $kategoria_id = $_POST['kategoria_id'] ?? null;
    $priorytet = $_POST['priorytet'] ?? 'normalny';
    $termin = $_POST['termin_realizacji'] ?? null;

    // Walidacja
    if (empty($tytul)) {
        $errors[] = 'Tytuł zlecenia jest wymagany';
    }
    if (empty($opis)) {
        $errors[] = 'Opis zlecenia jest wymagany';
    }
    if (strlen($opis) < 20) {
        $errors[] = 'Opis musi mieć minimum 20 znaków';
    }

    if (empty($errors)) {
        try {
            $id = $zlecenieModel->create([
                'firma_id' => $user['firma_id'],
                'uzytkownik_id' => $user['id'],
                'kategoria_id' => $kategoria_id ?: null,
                'tytul' => $tytul,
                'opis' => $opis,
                'priorytet' => $priorytet,
                'termin_realizacji' => $termin ?: null
            ]);

            // Pobierz utworzone zlecenie
            $noweZlecenie = $zlecenieModel->getById($id);

            // Wyślij maila do klienta
            $mailer = new Mailer();
            $mailer->sendOrderConfirmation($noweZlecenie, $user['email']);

            // Powiadomienie dla adminów
            $powiadomienie = new Powiadomienie();
            $powiadomienie->notifyNewOrder($noweZlecenie);

            // Obsługa załączników
            if (!empty($_FILES['pliki']['name'][0])) {
                $uploadDir = UPLOADS_PATH . '/zlecenia/' . $id . '/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                foreach ($_FILES['pliki']['name'] as $i => $name) {
                    if ($_FILES['pliki']['error'][$i] === UPLOAD_ERR_OK) {
                        $ext = pathinfo($name, PATHINFO_EXTENSION);
                        $newName = random_string(16) . '.' . $ext;
                        $path = $uploadDir . $newName;

                        if (move_uploaded_file($_FILES['pliki']['tmp_name'][$i], $path)) {
                            $zlecenieModel->addAttachment($id, $user['id'], [
                                'nazwa_oryginalna' => $name,
                                'nazwa_pliku' => $newName,
                                'sciezka' => 'uploads/zlecenia/' . $id . '/' . $newName,
                                'rozmiar' => $_FILES['pliki']['size'][$i],
                                'typ_mime' => $_FILES['pliki']['type'][$i],
                                'typ' => 'wejsciowy'
                            ]);
                        }
                    }
                }
            }

            flash('success', 'Zlecenie zostało pomyślnie złożone! Numer: ' . $noweZlecenie['numer']);
            redirect('zlecenie.php?id=' . $id);

        } catch (Exception $e) {
            $errors[] = 'Wystąpił błąd podczas składania zlecenia: ' . $e->getMessage();
        }
    }
}

$pageTitle = 'Nowe zlecenie';
$isAdmin = false;

ob_start();
?>

<div class="max-w-3xl">
    <!-- Header -->
    <div class="mb-8">
        <a href="index.php" class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Powrót do dashboardu</span>
        </a>
        <h2 class="text-2xl font-bold text-slate-800">
            <?= $duplikuj ? 'Duplikuj zlecenie' : 'Złóż nowe zlecenie' ?>
        </h2>
        <p class="text-slate-500 mt-1">
            <?php if ($duplikuj): ?>
            Tworzysz kopię zlecenia <span class="font-mono text-indigo-600"><?= e($duplikuj['numer']) ?></span>
            <?php else: ?>
            Wypełnij formularz, aby złożyć nowe zlecenie graficzne
            <?php endif; ?>
        </p>
    </div>

    <!-- Errors -->
    <?php if (!empty($errors)): ?>
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <div class="flex gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
            <div>
                <h4 class="font-medium text-red-800">Wystąpiły błędy:</h4>
                <ul class="mt-2 text-sm text-red-700 list-disc list-inside">
                    <?php foreach ($errors as $error): ?>
                    <li><?= e($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Form -->
    <form method="POST" action="" enctype="multipart/form-data" class="space-y-6">
        <?= csrf_field() ?>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <!-- Tytuł -->
            <div>
                <label for="tytul" class="block text-sm font-medium text-slate-700 mb-2">
                    Tytuł zlecenia <span class="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="tytul"
                    name="tytul"
                    value="<?= e($_POST['tytul'] ?? $duplikuj['tytul'] ?? '') ?>"
                    placeholder="np. Projekt ulotki promocyjnej A5"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    required
                >
            </div>

            <!-- Kategoria i Priorytet -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="kategoria_id" class="block text-sm font-medium text-slate-700 mb-2">
                        Kategoria
                    </label>
                    <select
                        id="kategoria_id"
                        name="kategoria_id"
                        class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none bg-white"
                    >
                        <option value="">-- Wybierz kategorię --</option>
                        <?php foreach ($kategorie as $kat): ?>
                        <option value="<?= $kat['id'] ?>" <?= ($_POST['kategoria_id'] ?? $duplikuj['kategoria_id'] ?? '') == $kat['id'] ? 'selected' : '' ?>>
                            <?= e($kat['nazwa']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="priorytet" class="block text-sm font-medium text-slate-700 mb-2">
                        Priorytet
                    </label>
                    <select
                        id="priorytet"
                        name="priorytet"
                        class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none bg-white"
                    >
                        <?php foreach (Zlecenie::PRIORYTETY as $key => $pr): ?>
                        <option value="<?= $key ?>" <?= ($_POST['priorytet'] ?? $duplikuj['priorytet'] ?? 'normalny') == $key ? 'selected' : '' ?>>
                            <?= e($pr['nazwa']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <!-- Termin realizacji -->
            <div>
                <label for="termin_realizacji" class="block text-sm font-medium text-slate-700 mb-2">
                    Oczekiwany termin realizacji
                </label>
                <input
                    type="date"
                    id="termin_realizacji"
                    name="termin_realizacji"
                    value="<?= e($_POST['termin_realizacji'] ?? '') ?>"
                    min="<?= date('Y-m-d') ?>"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                >
                <p class="mt-1 text-xs text-slate-400">Pozostaw puste, jeśli nie masz konkretnego terminu</p>
            </div>

            <!-- Opis -->
            <div>
                <label for="opis" class="block text-sm font-medium text-slate-700 mb-2">
                    Szczegółowy opis zlecenia <span class="text-red-500">*</span>
                </label>
                <textarea
                    id="opis"
                    name="opis"
                    rows="6"
                    placeholder="Opisz dokładnie czego potrzebujesz. Podaj wymiary, format, kolorystykę, teksty, wytyczne itp."
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                    required
                ><?= e($_POST['opis'] ?? $duplikuj['opis'] ?? '') ?></textarea>
                <p class="mt-1 text-xs text-slate-400">Minimum 20 znaków. Im więcej szczegółów, tym lepiej!</p>
            </div>

            <!-- Załączniki -->
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                    Załączniki
                </label>
                <div class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors" id="dropzone">
                    <input
                        type="file"
                        name="pliki[]"
                        id="pliki"
                        multiple
                        class="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.zip,.rar,.ai,.psd,.eps"
                    >
                    <label for="pliki" class="cursor-pointer">
                        <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i data-lucide="upload-cloud" class="w-6 h-6 text-slate-400"></i>
                        </div>
                        <p class="text-slate-600 font-medium">Kliknij lub przeciągnij pliki</p>
                        <p class="text-sm text-slate-400 mt-1">JPG, PNG, PDF, DOC, AI, PSD, ZIP do 50MB</p>
                    </label>
                </div>
                <div id="fileList" class="mt-3 space-y-2"></div>
            </div>
        </div>

        <!-- Tips -->
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h4 class="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <i data-lucide="lightbulb" class="w-5 h-5 text-indigo-600"></i>
                Wskazówki
            </h4>
            <ul class="text-sm text-indigo-800 space-y-2">
                <li class="flex items-start gap-2">
                    <i data-lucide="check" class="w-4 h-4 text-indigo-500 mt-0.5"></i>
                    <span>Podaj dokładne wymiary i format końcowy (np. A4, 1920x1080px)</span>
                </li>
                <li class="flex items-start gap-2">
                    <i data-lucide="check" class="w-4 h-4 text-indigo-500 mt-0.5"></i>
                    <span>Dołącz wszystkie teksty i materiały graficzne</span>
                </li>
                <li class="flex items-start gap-2">
                    <i data-lucide="check" class="w-4 h-4 text-indigo-500 mt-0.5"></i>
                    <span>Opisz preferowany styl i kolorystykę</span>
                </li>
                <li class="flex items-start gap-2">
                    <i data-lucide="check" class="w-4 h-4 text-indigo-500 mt-0.5"></i>
                    <span>Załącz przykłady podobnych projektów jeśli masz</span>
                </li>
            </ul>
        </div>

        <!-- Submit -->
        <div class="flex items-center justify-end gap-4">
            <a href="index.php" class="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium">
                Anuluj
            </a>
            <button
                type="submit"
                class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/30 flex items-center gap-2"
            >
                <i data-lucide="send" class="w-5 h-5"></i>
                Złóż zlecenie
            </button>
        </div>
    </form>
</div>

<script>
    // File upload preview
    document.getElementById('pliki').addEventListener('change', function(e) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        Array.from(this.files).forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-lg';
            div.innerHTML = `
                <i data-lucide="file" class="w-5 h-5 text-slate-400"></i>
                <span class="flex-1 text-sm text-slate-600 truncate">${file.name}</span>
                <span class="text-xs text-slate-400">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
            `;
            fileList.appendChild(div);
        });

        lucide.createIcons();
    });

    // Drag & drop
    const dropzone = document.getElementById('dropzone');
    const input = document.getElementById('pliki');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('border-indigo-400', 'bg-indigo-50'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('border-indigo-400', 'bg-indigo-50'), false);
    });

    dropzone.addEventListener('drop', function(e) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
</script>

<?php
$content = ob_get_clean();
include __DIR__ . '/../templates/layout.php';
