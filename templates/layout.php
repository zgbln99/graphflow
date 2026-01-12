<?php
/**
 * Główny layout aplikacji
 * Zmienne: $pageTitle, $content, $user, $isAdmin
 */
$isAdmin = $isAdmin ?? false;
$baseUrl = $isAdmin ? APP_URL . '/admin' : APP_URL . '/panel';
$notifications = new Powiadomienie();
$unreadCount = $notifications->countUnread($user['id']);
?>
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle ?? 'Panel') ?> - <?= e(APP_NAME) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                }
            }
        }
    </script>
    <style>
        .sidebar-link {
            transition: all 0.2s ease;
        }
        .sidebar-link:hover {
            transform: translateX(4px);
        }
        .sidebar-link.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
            border-left: 3px solid #6366f1;
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.15);
        }
        .gradient-text {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .dropdown-enter {
            animation: dropdownIn 0.2s ease-out;
        }
        @keyframes dropdownIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
</head>
<body class="font-sans antialiased bg-slate-50">
    <div class="flex min-h-screen">
        <!-- Sidebar -->
        <aside class="w-64 bg-white border-r border-slate-200 fixed h-full z-30 hidden lg:block">
            <!-- Logo -->
            <div class="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <i data-lucide="palette" class="w-5 h-5 text-white"></i>
                </div>
                <div>
                    <span class="font-bold text-lg gradient-text"><?= e(APP_NAME) ?></span>
                    <span class="text-[10px] text-slate-400 block -mt-1"><?= $isAdmin ? 'Panel Admina' : 'Panel Klienta' ?></span>
                </div>
            </div>

            <!-- Navigation -->
            <nav class="p-4 space-y-1">
                <?php if ($isAdmin): ?>
                <!-- Admin Menu -->
                <a href="<?= $baseUrl ?>/" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : '' ?>">
                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                    <span class="font-medium">Dashboard</span>
                </a>
                <a href="<?= $baseUrl ?>/zlecenia.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'zlecenia.php' ? 'active' : '' ?>">
                    <i data-lucide="clipboard-list" class="w-5 h-5"></i>
                    <span class="font-medium">Zlecenia</span>
                </a>
                <a href="<?= $baseUrl ?>/firmy.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'firmy.php' ? 'active' : '' ?>">
                    <i data-lucide="building-2" class="w-5 h-5"></i>
                    <span class="font-medium">Firmy</span>
                </a>
                <a href="<?= $baseUrl ?>/uzytkownicy.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'uzytkownicy.php' ? 'active' : '' ?>">
                    <i data-lucide="users" class="w-5 h-5"></i>
                    <span class="font-medium">Użytkownicy</span>
                </a>

                <div class="pt-4 pb-2">
                    <span class="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Raporty</span>
                </div>
                <a href="<?= $baseUrl ?>/statystyki.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'statystyki.php' ? 'active' : '' ?>">
                    <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                    <span class="font-medium">Statystyki</span>
                </a>
                <a href="<?= $baseUrl ?>/kalendarz.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'kalendarz.php' ? 'active' : '' ?>">
                    <i data-lucide="calendar" class="w-5 h-5"></i>
                    <span class="font-medium">Kalendarz</span>
                </a>
                <a href="<?= $baseUrl ?>/logi-mail.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'logi-mail.php' ? 'active' : '' ?>">
                    <i data-lucide="mail" class="w-5 h-5"></i>
                    <span class="font-medium">Logi maili</span>
                </a>
                <?php else: ?>
                <!-- Client Menu -->
                <a href="<?= $baseUrl ?>/" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : '' ?>">
                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                    <span class="font-medium">Dashboard</span>
                </a>
                <a href="<?= $baseUrl ?>/zlecenia.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'zlecenia.php' ? 'active' : '' ?>">
                    <i data-lucide="clipboard-list" class="w-5 h-5"></i>
                    <span class="font-medium">Moje zlecenia</span>
                </a>
                <a href="<?= $baseUrl ?>/nowe-zlecenie.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'nowe-zlecenie.php' ? 'active' : '' ?>">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    <span class="font-medium">Nowe zlecenie</span>
                </a>
                <?php endif; ?>

                <div class="pt-4 pb-2">
                    <span class="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Konto</span>
                </div>
                <a href="<?= $baseUrl ?>/profil.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-indigo-600 rounded-lg <?= basename($_SERVER['PHP_SELF']) == 'profil.php' ? 'active' : '' ?>">
                    <i data-lucide="user" class="w-5 h-5"></i>
                    <span class="font-medium">Mój profil</span>
                </a>
                <a href="<?= APP_URL ?>/logout.php" class="sidebar-link flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 rounded-lg">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span class="font-medium">Wyloguj się</span>
                </a>
            </nav>
        </aside>

        <!-- Mobile sidebar overlay -->
        <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-40 lg:hidden hidden" onclick="toggleSidebar()"></div>

        <!-- Mobile sidebar -->
        <aside id="mobileSidebar" class="w-64 bg-white border-r border-slate-200 fixed h-full z-50 lg:hidden transform -translate-x-full transition-transform">
            <!-- Same content as desktop sidebar -->
            <div class="h-16 flex items-center justify-between px-6 border-b border-slate-200">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <i data-lucide="palette" class="w-5 h-5 text-white"></i>
                    </div>
                    <span class="font-bold text-lg gradient-text"><?= e(APP_NAME) ?></span>
                </div>
                <button onclick="toggleSidebar()" class="p-2 hover:bg-slate-100 rounded-lg">
                    <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
                </button>
            </div>
            <!-- Copy navigation from above -->
        </aside>

        <!-- Main Content -->
        <main class="flex-1 lg:ml-64">
            <!-- Top Bar -->
            <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
                <!-- Mobile menu button -->
                <button onclick="toggleSidebar()" class="p-2 hover:bg-slate-100 rounded-lg lg:hidden">
                    <i data-lucide="menu" class="w-5 h-5 text-slate-600"></i>
                </button>

                <!-- Page title (hidden on mobile) -->
                <h1 class="text-lg font-semibold text-slate-800 hidden lg:block"><?= e($pageTitle ?? 'Panel') ?></h1>

                <!-- Right side -->
                <div class="flex items-center gap-3">
                    <!-- Notifications -->
                    <div class="relative" x-data="{ open: false }">
                        <button onclick="toggleNotifications()" class="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <i data-lucide="bell" class="w-5 h-5 text-slate-600"></i>
                            <?php if ($unreadCount > 0): ?>
                            <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"><?= $unreadCount > 99 ? '99+' : $unreadCount ?></span>
                            <?php endif; ?>
                        </button>
                        <div id="notificationsDropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 dropdown-enter">
                            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
                                <span class="font-semibold text-slate-800">Powiadomienia</span>
                                <?php if ($unreadCount > 0): ?>
                                <a href="<?= $baseUrl ?>/powiadomienia.php?mark_all_read=1" class="text-xs text-indigo-600 hover:text-indigo-700">Oznacz jako przeczytane</a>
                                <?php endif; ?>
                            </div>
                            <div class="max-h-96 overflow-y-auto" id="notificationsList">
                                <!-- Loaded via AJAX -->
                                <div class="p-4 text-center text-slate-500 text-sm">Ładowanie...</div>
                            </div>
                        </div>
                    </div>

                    <!-- User Menu -->
                    <div class="relative">
                        <button onclick="toggleUserMenu()" class="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                                <?= get_initials($user['imie'] . ' ' . $user['nazwisko']) ?>
                            </div>
                            <div class="hidden md:block text-left">
                                <div class="text-sm font-medium text-slate-700"><?= e($user['imie'] . ' ' . $user['nazwisko']) ?></div>
                                <div class="text-xs text-slate-500"><?= e($user['firma_nazwa'] ?? ucfirst($user['rola'])) ?></div>
                            </div>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 hidden md:block"></i>
                        </button>
                        <div id="userMenuDropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 dropdown-enter">
                            <div class="p-2">
                                <a href="<?= $baseUrl ?>/profil.php" class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                                    <i data-lucide="user" class="w-4 h-4"></i>
                                    <span>Mój profil</span>
                                </a>
                                <a href="<?= $baseUrl ?>/ustawienia.php" class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                                    <i data-lucide="settings" class="w-4 h-4"></i>
                                    <span>Ustawienia</span>
                                </a>
                                <hr class="my-2 border-slate-200">
                                <a href="<?= APP_URL ?>/logout.php" class="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <i data-lucide="log-out" class="w-4 h-4"></i>
                                    <span>Wyloguj się</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Flash Messages -->
            <?php if (has_flash()): ?>
            <div class="p-4 lg:p-8 pb-0">
                <?php foreach (get_flash() as $type => $messages): ?>
                    <?php foreach ($messages as $message): ?>
                    <div class="mb-3 p-4 rounded-xl flex items-center gap-3 <?= $type === 'success' ? 'bg-green-50 text-green-800' : ($type === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800') ?>">
                        <i data-lucide="<?= $type === 'success' ? 'check-circle' : ($type === 'error' ? 'alert-circle' : 'info') ?>" class="w-5 h-5"></i>
                        <span><?= e($message) ?></span>
                    </div>
                    <?php endforeach; ?>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Page Content -->
            <div class="p-4 lg:p-8">
                <?= $content ?>
            </div>
        </main>
    </div>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Toggle sidebar (mobile)
        function toggleSidebar() {
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }

        // Toggle notifications dropdown
        function toggleNotifications() {
            const dropdown = document.getElementById('notificationsDropdown');
            const userMenu = document.getElementById('userMenuDropdown');
            userMenu.classList.add('hidden');
            dropdown.classList.toggle('hidden');

            if (!dropdown.classList.contains('hidden')) {
                loadNotifications();
            }
        }

        // Toggle user menu dropdown
        function toggleUserMenu() {
            const dropdown = document.getElementById('userMenuDropdown');
            const notifications = document.getElementById('notificationsDropdown');
            notifications.classList.add('hidden');
            dropdown.classList.toggle('hidden');
        }

        // Load notifications
        function loadNotifications() {
            fetch('<?= $baseUrl ?>/api/powiadomienia.php')
                .then(response => response.json())
                .then(data => {
                    const list = document.getElementById('notificationsList');
                    if (data.length === 0) {
                        list.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Brak powiadomień</div>';
                    } else {
                        list.innerHTML = data.map(n => `
                            <a href="${n.link}" class="block p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 ${n.przeczytane ? 'opacity-60' : ''}">
                                <div class="flex gap-3">
                                    <div class="w-8 h-8 rounded-full bg-${n.typ === 'sukces' ? 'green' : (n.typ === 'blad' ? 'red' : 'indigo')}-100 flex items-center justify-center flex-shrink-0">
                                        <i data-lucide="${n.typ === 'sukces' ? 'check' : (n.typ === 'blad' ? 'x' : 'bell')}" class="w-4 h-4 text-${n.typ === 'sukces' ? 'green' : (n.typ === 'blad' ? 'red' : 'indigo')}-600"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium text-slate-800 truncate">${n.tytul}</p>
                                        <p class="text-xs text-slate-500">${n.czas}</p>
                                    </div>
                                </div>
                            </a>
                        `).join('');
                        lucide.createIcons();
                    }
                })
                .catch(() => {
                    document.getElementById('notificationsList').innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Błąd ładowania</div>';
                });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            const notificationsBtn = event.target.closest('[onclick="toggleNotifications()"]');
            const userMenuBtn = event.target.closest('[onclick="toggleUserMenu()"]');
            const notificationsDropdown = document.getElementById('notificationsDropdown');
            const userMenuDropdown = document.getElementById('userMenuDropdown');

            if (!notificationsBtn && !notificationsDropdown.contains(event.target)) {
                notificationsDropdown.classList.add('hidden');
            }
            if (!userMenuBtn && !userMenuDropdown.contains(event.target)) {
                userMenuDropdown.classList.add('hidden');
            }
        });
    </script>
</body>
</html>
