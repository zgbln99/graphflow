/**
 * Dane dashboardu — warstwa tymczasowa.
 *
 * To jedyne miejsce z danymi demonstracyjnymi dashboardu. Docelowo:
 *   nextMatch / schedule -> cg_matches, cg_seasons, cg_match_templates, cg_designs
 *   blockers             -> wyliczane z terminów i braków w cg_designs / cg_photo_index
 *   folders              -> cg_s3_folders + cg_photo_index
 *   exports              -> cg_exports + cg_users
 * Szablon nie zawiera żadnych danych na sztywno, więc podmiana tej funkcji
 * na zapytania SQL nie wymaga zmian w widoku.
 */

function getDashboardData() {
  return {
    season: '2026 / 27',

    nextMatch: {
      competition: 'ORLEN Basket Liga',
      round: 'Kolejka 4',
      home: 'Śląsk Wrocław',
      away: 'Zastal',
      clubSide: 'away',
      dateLabel: 'niedziela 04.10',
      time: '17:30',
      arena: 'Hala Orbita, Wrocław',
      venueType: 'wyjazd'
    },

    facts: [
      { label: 'Do meczu', value: '6', unit: 'dni', now: true },
      { label: 'Materiały gotowe', value: '2 / 8', unit: null, now: false },
      { label: 'Zdjęcia w folderach', value: '428', unit: null, now: false },
      { label: 'Eksporty (7 dni)', value: '17', unit: null, now: false }
    ],

    // Harmonogram produkcji w układzie dnia — tak, jak planuje się dzień meczowy.
    schedule: [
      {
        day: 'Piątek 02.10',
        note: '1 materiał',
        matchday: false,
        items: [
          { time: '10:00', name: 'Zapowiedź meczu', meta: 'Feed i relacja', format: '1080×1350', owner: 'Grafik', status: 'Gotowe', state: 'ok' }
        ]
      },
      {
        day: 'Sobota 03.10',
        note: '1 materiał',
        matchday: false,
        items: [
          { time: '18:00', name: 'Skład na mecz', meta: 'Relacja', format: '1080×1920', owner: 'Grafik', status: 'W pracy', state: 'work' }
        ]
      },
      {
        day: 'Niedziela 04.10 · dzień meczowy',
        note: '5 materiałów',
        matchday: true,
        items: [
          { time: '09:00', name: 'Matchday', meta: 'Feed i relacja', format: '1080×1350', owner: 'Social media', status: 'Gotowe', state: 'ok' },
          { time: '16:45', name: 'Starting Five', meta: 'Relacja', format: '1080×1920', owner: 'Social media', status: 'Brak zdjęć', state: 'late' },
          { time: '18:20', name: 'Wynik do przerwy', meta: 'Relacja', format: '1080×1920', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
          { time: '19:30', name: 'Wynik końcowy', meta: 'Feed i relacja', format: '1080×1350', owner: 'Social media', status: 'Do zrobienia', state: 'todo' },
          { time: '20:00', name: 'MVP spotkania', meta: 'Feed', format: '1080×1080', owner: 'Social media', status: 'Do zrobienia', state: 'todo' }
        ]
      },
      {
        day: 'Poniedziałek 05.10',
        note: '1 materiał',
        matchday: false,
        items: [
          { time: '12:00', name: 'Galeria pomeczowa', meta: 'Feed', format: '1080×1350', owner: 'Fotograf', status: 'Do zrobienia', state: 'todo' }
        ]
      }
    ],

    // Materiały nieprzypisane do meczu — mają własne terminy i też trzeba je pilnować.
    offMatch: [
      { name: 'Urodziny — Piotr Nowak', context: 'Feed · 1080×1080', due: '29.09', status: 'Do zrobienia', state: 'todo' },
      { name: 'Transfer — Adam Wójcik', context: 'Feed i relacja · 1080×1350', due: '30.09', status: 'W pracy', state: 'work' },
      { name: 'Sponsor tygodnia', context: 'Feed · 1080×1080', due: '01.10', status: 'Gotowe', state: 'ok' },
      { name: 'MVP miesiąca — wrzesień', context: 'Feed i relacja · 1080×1350', due: '02.10', status: 'Do zrobienia', state: 'todo' }
    ],

    blockers: [
      { level: 'urgent', title: 'Brak zdjęć do Starting Five', detail: 'Folder photographer pusty dla 4. kolejki', due: 'dziś' },
      { level: 'soon', title: 'Szablon Starting Five bez overlaya', detail: 'Warstwa overlay nieprzypisana', due: 'jutro' },
      { level: 'soon', title: 'Magazyn zdjęć nieskonfigurowany', detail: 'Eksporty zapisują się lokalnie na serwerze', due: '—' }
    ],

    folders: {
      connected: false,
      items: [
        { name: 'photographer', count: 312, updated: '27.09' },
        { name: 'social', count: 89, updated: '27.09' },
        { name: 'selected', count: 27, updated: '28.09' }
      ]
    },

    exports: [
      { time: '19:32', name: 'Final Score', context: 'Zastal — Anwil', format: 'PNG 1080×1350' },
      { time: '18:45', name: 'Halftime', context: 'Zastal — Anwil', format: 'PNG 1080×1920' },
      { time: '12:10', name: 'Matchday', context: 'Zastal — Anwil', format: 'PNG 1080×1350' },
      { time: 'wczoraj', name: 'Urodziny', context: 'Piotr Nowak', format: 'PNG 1080×1080' }
    ]
  };
}

module.exports = { getDashboardData };
