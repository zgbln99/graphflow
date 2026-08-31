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

### Szablony: gotowa grafika plus pola

Podział pracy jest tu sednem: **grafik pracuje w Photoshopie, social media nigdy go nie
otwiera.** Szablon powstaje raz — z gotowej grafiki i z pól, które potem wypełnia się
w panelu formularzem. Osoba prowadząca profile widzi wyłącznie te pola, podgląd i przycisk
eksportu; nie ma dostępu do warstw ani do biblioteki szablonów. Grafik przygotowuje plik PNG z przezroczystością w docelowym
rozmiarze (np. 1080 × 1350) — ramkę, pasek, elementy identyfikacji — zostawiając puste
miejsce tam, gdzie ma wejść zdjęcie.

Praca w panelu (**Szablony → Nowy**):

1. Nazwa, rodzaj (meczowy albo inny) i rozmiar dokumentu.
2. **Pola** — co zobaczy osoba przygotowująca grafikę: teksty, liczby (wyniki),
   listy wyboru, daty i zdjęcia. Aplikacja nie ma żadnych pól wpisanych na stałe.
3. **Warstwy** — z czego składa się obraz i w jakiej kolejności:
   - `zdjęcie` — miejsce na kadr z magazynu, z maską i kadrowaniem,
   - `nakładka` / `tło` — gotowa grafika wgrana w zakładce **Pliki**,
   - `tekst` — związany z polem, z wyborem kroju pisma, stopnia, koloru,
     wyrównania i wersalików,
   - `logo` — jak zdjęcie, ale mieści się w całości; może brać obraz z pola,
     bo herb rywala zmienia się co mecz,
   - `kształt` — jednolity prostokąt, przydatny jako podkład pod tekst.
4. **Pliki** — gotowe grafiki, tła i maski. Trafiają do magazynu, szablon zapamiętuje
   tylko klucz. Wgranie pliku do nowego szablonu zapisuje go po drodze, więc nie trzeba
   pamiętać o kolejności. Gdy wymiary pliku nie zgadzają się z rozmiarem szablonu,
   panel to zgłasza — grafika i tak zostanie wgrana, ale przy rysowaniu byłaby skalowana.

Warstwy ustawia się **myszą wprost na podglądzie**: przeciągnięcie przesuwa, ciągnięcie
za róg zmienia rozmiar, strzałki przesuwają o piksel (z Shiftem o dziesięć). Warstwa
przyciąga się do krawędzi i środka dokumentu oraz do pozostałych warstw. Uchwyty leżą
nad płótnem, ale rysuje je silnik eksportu — to, co przesuwasz, jest dokładnie tym, co
wyjdzie w pliku. Pola liczbowe w zakładce Warstwy nadal działają, gdy trzeba wpisać
dokładną wartość.

Kroje pisma do wyboru przy warstwie tekstowej: klubowy **ZT Talk**, **ZT Talk Expanded**
oraz trzy kroje systemowe (bezszeryfowy, szeryfowy, o stałej szerokości). Podgląd i eksport
rysuje ten sam silnik, więc krój w podglądzie jest tym, który wyjdzie w pliku.

### Edytor grafiki (social media)

Grafiki meczowe mają stały układ — GAMEDAY, zapowiedź dzień przed meczem, porównanie,
wynik. Z materiału na materiał zmienia się tylko treść: zdjęcie zawodnika, logo rywala,
wyniki i wybrane teksty. Dlatego układ opisuje raz grafik w szablonie, a osoba od social
mediów dostaje wyłącznie formularz z tymi polami (§29).

Jak to działa:

- **wejście do edytora** — z listy materiałów meczu (przycisk „Otwórz”) albo z „Innych grafik”
  („Przygotuj”). Pierwsze otwarcie zakłada grafikę, kolejne wracają do zapisanej.
- **formularz** powstaje z pól szablonu: teksty, liczby, listy wyboru, daty i zdjęcia.
  Aplikacja nie ma żadnych pól wpisanych na stałe.
- **zdjęcia i logo** wybiera się z magazynu; warstwa typu „logo” może być związana z polem,
  bo herb rywala zmienia się co mecz. Kadr (przesunięcie i powiększenie) zostaje w obszarze
  wyznaczonym przez grafika.
- **podgląd** rysuje ten sam silnik, który robi eksport — różni je wyłącznie skala.
- **eksport** to PNG w natywnej rozdzielczości szablonu (§15): „Pobierz PNG” zapisuje plik
  na dysk, „Eksportuj do magazynu” odkłada go w buckecie i w historii eksportów.
  Pola oznaczone jako wymagane sprawdzane są dopiero przy eksporcie — grafikę można
  odkładać niedokończoną.

Zdjęcia w edytorze pobierane są przez aplikację, a nie prosto z magazynu: obraz z obcej
domeny „zatruwa” płótno i przeglądarka nie pozwoliłaby zapisać go do pliku.

### Magazyn zdjęć (MEGA S4)

Zdjęcia meczowe leżą w buckecie zgodnym z S3. Klucze dostępu nigdy nie trafiają do przeglądarki.

MEGA S4 **nie obsługuje konfiguracji CORS** — w jego API nie ma `PutBucketCors`, a w panelu
odpowiadającej zakładki (zakładka „Zasady" to bucket policy w stylu IAM, nie CORS). Dlatego
przeglądarka nie może wysyłać plików wprost do bucketa: zablokowałaby takie żądanie sama.
Zdjęcia idą więc przez serwer aplikacji, strumieniem przez katalog tymczasowy, i stamtąd do
magazynu. Podgląd działa na podpisanych adresach GET — `<img>` nie podlega regułom CORS,
więc bucket może zostać prywatny.

Co trzeba przygotować w panelu MEGA S4:

1. bucket (u nas: `zastal`),
2. parę kluczy dostępu (Access key + Secret key) z prawem odczytu i zapisu w tym buckecie.

Ustawienia w `.env` (na VPS: `/opt/club-graphics/.env`, nigdy w repozytorium):

- `S3_ENDPOINT` — `https://s3.eu-luxembourg-1.megas4.com`,
- `S3_REGION` — `eu-luxembourg-1`,
- `S3_BUCKET` — `zastal`,
- `S3_ACCESS_KEY`, `S3_SECRET_KEY` — klucze z punktu 2,
- `S3_FORCE_PATH_STYLE` — `true` (adres `endpoint/bucket/klucz`); `false` przełącza na
  adresowanie po nazwie hosta (`zastal.s3.g.megas4.com`),
- `S3_DOWNLOAD_URL_TTL` — ważność podpisanych adresów podglądu w sekundach.

Po zmianie `.env` konieczny jest restart procesu: `pm2 restart zastal-marketing-center`.
Poprawność konfiguracji sprawdza przycisk **Testuj połączenie** w Ustawieniach.

**Wszystko leży w buckecie**: zdjęcia meczowe, gotowe grafiki szablonów, eksporty
i logo klubu. Serwer aplikacji nie trzyma żadnych plików użytkownika — poza
katalogiem przelotowym, z którego plik znika po wysłaniu do magazynu.

| Co | Gdzie w buckecie |
| --- | --- |
| zdjęcia meczowe | `2026-27/kolejka-1/2026-10-04-dziki-zastal/` |
| zdjęcia spoza kalendarza | `2026-27/poza-meczem/` |
| gotowe grafiki szablonów | `szablony/{id}/` |
| eksporty grafik | `eksporty/{data}/` |
| logo klubu | `branding/` |

Pliki, których używa płótno (nakładki szablonów, zdjęcia w edytorze), podaje sama
aplikacja spod własnego adresu — obraz z obcej domeny „zatruwa" płótno i uniemożliwia
zapisanie gotowej grafiki do pliku. Podglądy w siatce zdjęć idą prosto z magazynu
podpisanym adresem, bo tam eksportu nie ma.

Jak to działa w panelu (zakładka „Zdjęcia”):

- **zdjęcia należą do meczu** — bez podziału na fotografa, wybrane czy archiwum.
  Lista po lewej to mecze sezonu plus zbiór „Poza meczem” na grafiki spoza kalendarza,
- **katalog w magazynie zakłada się sam** przy pierwszym zdjęciu, a jego ścieżka
  powstaje z sezonu, kolejki i meczu: `2026-27/kolejka-1/2026-10-04-dziki-zastal/`.
  Data z przodu układa mecze chronologicznie także w kliencie S3 na pulpicie,
- **Synchronizuj** wczytuje zawartość katalogu do indeksu; bucket jest źródłem prawdy,
  więc zdjęcia wgrane klientem S3 z pulpitu pojawiają się tak samo jak te z przeglądarki,
- **Prześlij zdjęcia** (admin, grafik, fotograf) wysyła pliki partiami przez serwer;
  pliki większe niż 60 MB są odrzucane,
- **oznaczanie zdjęć** (admin, grafik, social media) wybiera kadry do grafik — zgodnie
  z zasadą, że social media decyduje o treści.

Do grafiki nie trzeba brać zdjęcia z jej własnego meczu: wybór w edytorze pokazuje
wszystkie mecze sezonu, z meczem tej grafiki na wierzchu.

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
