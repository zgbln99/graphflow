# GraphFlow - Panel Zleceń Graficznych

Profesjonalny panel do zarządzania zleceniami graficznymi dla agencji i freelancerów.

## ZASTAL MARKETING CENTER

Branch `feat/club-graphics-v1` zawiera samodzielną aplikację Express uruchamianą poleceniem `npm start`.
Konfiguracja aplikacji i integracji znajduje się w pliku `.env` tworzonym na podstawie `.env.example`.

### Monitoring Facebooka i analiza OpenAI

Integracja działa wyłącznie po stronie serwera — token Meta i klucz OpenAI nie są wysyłane do przeglądarki.

Wymagane ustawienia:

- `META_PAGE_ID` — identyfikator oficjalnej strony klubu,
- `META_PAGE_ACCESS_TOKEN` — Page Access Token z uprawnieniami do odczytu treści i zaangażowania strony,
- `META_GRAPH_VERSION` — przypięta wersja Graph API,
- `OPENAI_API_KEY` — klucz projektu OpenAI,
- `OPENAI_MODEL` — model analityczny, domyślnie `gpt-5.4-mini`.

Widok „Monitoring social” pobiera ostatnie posty, liczy reakcje, komentarze i udostępnienia, a następnie generuje ustrukturyzowane rekomendacje przez OpenAI Responses API.
Serwer odświeża dane w tle zgodnie z `SOCIAL_MONITOR_INTERVAL_MS`. Ustawienie `SOCIAL_AUTO_ANALYZE=true` uruchamia nową analizę automatycznie po wykryciu nowego posta.

## Funkcje

### Dla klientów:
- Składanie zleceń graficznych z załącznikami
- Śledzenie statusu zleceń w czasie rzeczywistym
- Komunikacja z wykonawcą przez wbudowany chat
- Powiadomienia mailowe o zmianach statusu
- Pobieranie gotowych plików

### Dla administratora:
- Zarządzanie wszystkimi zleceniami
- Zmiana statusów z automatycznymi powiadomieniami
- Dodawanie komentarzy (publicznych i wewnętrznych)
- Notatki wewnętrzne i lokalizacja plików
- Zarządzanie firmami i użytkownikami
- Statystyki i raporty
- Linki do gotowych plików (podgląd, pobieranie)

## Wymagania

- PHP 7.4 lub nowszy
- MySQL 5.7 lub nowszy
- Apache z mod_rewrite

## Instalacja

1. Skopiuj pliki na serwer
2. Utwórz bazę danych MySQL
3. Zaimportuj schemat: `database/schema.sql`
4. Skonfiguruj połączenie w `config/database.php`
5. Ustaw uprawnienia zapisu dla katalogu `uploads/`

## Domyślne logowanie

- **Email:** admin@graphflow.pl
- **Hasło:** Admin123!

⚠️ Zmień hasło po pierwszym logowaniu!

## Struktura katalogów

```
panel-zlecen/
├── admin/          # Panel administratora
├── panel/          # Panel klienta
├── api/            # Endpointy API
├── classes/        # Klasy PHP
├── config/         # Konfiguracja
├── database/       # Schemat bazy danych
├── includes/       # Pliki pomocnicze
├── templates/      # Szablony HTML
├── uploads/        # Pliki użytkowników
└── assets/         # CSS, JS, obrazy
```

## Statusy zleceń

| Status | Opis |
|--------|------|
| Nowe | Zlecenie właśnie wpłynęło |
| W realizacji | Praca w toku |
| Oczekuje | Oczekiwanie na informacje od klienta |
| Do akceptacji | Gotowe do weryfikacji przez klienta |
| Poprawki | Klient zgłosił uwagi |
| Zakończone | Zlecenie zrealizowane |
| Anulowane | Zlecenie anulowane |

## Konfiguracja mailowa

Edytuj `config/database.php`:

```php
define('MAIL_HOST', 'smtp.twojserwer.pl');
define('MAIL_PORT', 587);
define('MAIL_USER', 'noreply@twojadomena.pl');
define('MAIL_PASS', 'haslo');
```

## Bezpieczeństwo

- Wszystkie dane są walidowane i escapowane
- Hasła hashowane algorytmem bcrypt
- Ochrona przed CSRF
- Sesje zabezpieczone flagami httpOnly i secure
- Ograniczony dostęp do katalogów systemowych

## Licencja

Projekt stworzony na zamówienie. Wszelkie prawa zastrzeżone.
