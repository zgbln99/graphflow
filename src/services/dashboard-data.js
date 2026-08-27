/**
 * Dane dashboardu — warstwa tymczasowa.
 *
 * UWAGA: to jest jedyne miejsce z danymi demonstracyjnymi dashboardu.
 * Docelowo każda sekcja pochodzi z bazy:
 *   nextMatch  -> cg_matches + cg_seasons
 *   production -> cg_match_templates + cg_designs
 *   attention  -> wyliczane z terminów w cg_match_templates
 *   photos     -> cg_photo_index + cg_s3_folders
 *   exports    -> cg_exports + cg_users
 * Widok nie zawiera żadnych danych na sztywno, więc podmiana tej funkcji
 * na zapytania SQL nie wymaga zmian w szablonie.
 */

function getDashboardData() {
  return {
    season: '2026 / 27',

    nextMatch: {
      competition: 'ORLEN Basket Liga',
      round: 'Kolejka 4',
      venueType: 'Wyjazd',
      daysLeft: 6,
      date: '04.10',
      time: '17:30',
      arena: 'Hala Orbita, Wrocław',
      home: { name: 'Śląsk Wrocław', short: 'ŚLĄ', isClub: false, role: 'Gospodarz' },
      away: { name: 'Zastal', short: 'ZAS', isClub: true, role: 'Goście' },
      graphicsReady: 4,
      graphicsTotal: 8
    },

    counters: [
      { label: 'Do meczu', value: '6', unit: 'dni', accent: true },
      { label: 'Materiały gotowe', value: '4 / 8', unit: null, accent: false },
      { label: 'Zdjęcia w folderach', value: '428', unit: 'plików', accent: false },
      { label: 'Eksporty w tym tygodniu', value: '17', unit: 'PNG', accent: false }
    ],

    production: [
      { name: 'Zapowiedź meczu', channel: 'Feed i relacja', format: '1080 × 1350', deadline: '02.10 · 10:00', owner: 'Grafik', status: 'Gotowe', state: 'ready' },
      { name: 'Skład na mecz', channel: 'Relacja', format: '1080 × 1920', deadline: '03.10 · 18:00', owner: 'Grafik', status: 'W pracy', state: 'progress' },
      { name: 'Matchday', channel: 'Feed i relacja', format: '1080 × 1350', deadline: '04.10 · 09:00', owner: 'Social media', status: 'Gotowe', state: 'ready' },
      { name: 'Starting Five', channel: 'Relacja', format: '1080 × 1920', deadline: '04.10 · 16:45', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
      { name: 'Wynik do przerwy', channel: 'Relacja', format: '1080 × 1920', deadline: 'W trakcie meczu', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
      { name: 'Wynik końcowy', channel: 'Feed i relacja', format: '1080 × 1350', deadline: 'Po meczu', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
      { name: 'MVP spotkania', channel: 'Feed', format: '1080 × 1080', deadline: 'Po meczu', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
      { name: 'Galeria pomeczowa', channel: 'Feed', format: '1080 × 1350', deadline: '05.10 · 12:00', owner: 'Fotograf', status: 'Do zrobienia', state: 'todo' }
    ],

    attention: [
      { level: 'urgent', title: 'Brak zdjęć do składu na mecz', detail: 'Folder photographer pusty dla 4. kolejki', due: 'dziś' },
      { level: 'soon', title: 'Szablon „Starting Five” bez overlaya', detail: 'Warstwa overlay nieprzypisana', due: 'jutro' },
      { level: 'soon', title: 'Magazyn MEGA S3 nieskonfigurowany', detail: 'Eksporty zapisują się lokalnie', due: '—' },
      { level: 'normal', title: 'Akceptacja galerii z meczu z Anwilem', detail: '27 zdjęć oczekuje na wybór', due: '2 dni' }
    ],

    photos: {
      total: 428,
      recentCount: 12,
      folders: [
        { name: 'photographer', count: 312 },
        { name: 'social', count: 89 },
        { name: 'selected', count: 27 }
      ]
    },

    exports: [
      { name: 'Final Score', context: 'Zastal vs Anwil', format: 'PNG · 1080×1350', time: '19:32' },
      { name: 'Halftime', context: 'Zastal vs Anwil', format: 'PNG · 1080×1920', time: '18:45' },
      { name: 'Matchday', context: 'Zastal vs Anwil', format: 'PNG · 1080×1350', time: '12:10' },
      { name: 'Urodziny', context: 'Piotr Nowak', format: 'PNG · 1080×1080', time: 'wczoraj' }
    ]
  };
}

module.exports = { getDashboardData };
