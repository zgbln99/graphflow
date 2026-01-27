# Migracja Dropbox do OAuth2

## Podsumowanie zmian

Integracja Dropbox została zaktualizowana z manualnego tokenu dostępu do pełnego OAuth2 Authorization Code Flow z `refresh_token`. Dzięki temu tokeny są automatycznie odświeżane i nie wygasają.

## Co się zmieniło

### Nowe pliki
- `src/lib/dropbox-oauth.ts` - logika OAuth2 (autoryzacja, wymiana kodu, odświeżanie tokenów)
- `src/app/api/dropbox/connect/route.ts` - endpoint inicjujący OAuth
- `src/app/api/dropbox/callback/route.ts` - callback OAuth

### Zmodyfikowane pliki
- `src/lib/dropbox.ts` - teraz używa auto-refresh tokenów
- `src/app/api/settings/dropbox/route.ts` - rozszerzone o status OAuth
- `src/app/(panel)/panel/settings/dropbox/page.tsx` - nowy UI z OAuth

### Nowe klucze w SystemSetting
- `dropbox_access_token` - token dostępu (istniejący)
- `dropbox_refresh_token` - token odświeżania (nowy)
- `dropbox_token_expires_at` - data wygaśnięcia (nowy)
- `dropbox_connected_email` - email połączonego konta (nowy)
- `dropbox_connected_at` - data połączenia (nowy)

## Instrukcja migracji

### 1. Konfiguracja aplikacji Dropbox

1. Przejdź do [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Utwórz nową aplikację lub użyj istniejącej:
   - App type: **Scoped access**
   - Access type: **Full Dropbox**
3. W zakładce **Permissions** włącz:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write`
4. W zakładce **Settings**:
   - Skopiuj **App key**
   - Skopiuj **App secret**
   - Dodaj **OAuth 2 Redirect URI**: `https://twoja-domena.pl/api/dropbox/callback`

### 2. Konfiguracja zmiennych środowiskowych

Dodaj do `.env`:

```bash
DROPBOX_APP_KEY="twój_app_key"
DROPBOX_APP_SECRET="twój_app_secret"
DROPBOX_REDIRECT_URI="https://twoja-domena.pl/api/dropbox/callback"
```

### 3. Przebuduj i zrestartuj aplikację

```bash
npm run build
pm2 restart graphflow
```

### 4. Połącz ponownie z Dropbox

1. Przejdź do **Panel → Ustawienia → Dropbox**
2. Jeśli masz istniejące połączenie, zobaczysz ostrzeżenie "Token może wygasnąć"
3. Kliknij **"Połącz ponownie"** lub **"Połącz przez Dropbox"**
4. Zaloguj się do Dropbox i autoryzuj aplikację
5. Po powrocie zobaczysz status "Połączono"

## Kompatybilność wsteczna

- Istniejące tokeny manualne dalej działają (do wygaśnięcia)
- Strona ustawień pokazuje ostrzeżenie dla legacy tokenów
- Możesz nadal używać manualnych tokenów jeśli nie skonfigurujesz OAuth

## Obsługa błędów

### Token wygasł/unieważniony

1. System automatycznie próbuje odświeżyć token
2. Jeśli refresh token jest nieważny:
   - Integracja zostaje oznaczona jako "rozłączona"
   - W ustawieniach pojawi się przycisk "Połącz ponownie"
   - Pliki będą zapisywane lokalnie do czasu ponownego połączenia

### OAuth nie skonfigurowany

Jeśli zmienne `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REDIRECT_URI` nie są ustawione:
- Przycisk OAuth nie będzie dostępny
- Można nadal używać manualnych tokenów (niezalecane)

## Testowanie lokalne

### 1. Użyj ngrok dla callback URL

```bash
ngrok http 3000
```

### 2. Ustaw redirect URI w Dropbox App Console

```
https://abc123.ngrok.io/api/dropbox/callback
```

### 3. Ustaw w .env

```bash
DROPBOX_REDIRECT_URI="https://abc123.ngrok.io/api/dropbox/callback"
```

### 4. Przetestuj flow

1. Przejdź do ustawień Dropbox
2. Kliknij "Połącz przez Dropbox"
3. Autoryzuj aplikację
4. Sprawdź czy wrócisz do panelu z komunikatem sukcesu

## Debugowanie

### Logi

Sprawdź logi serwera:
```bash
pm2 logs graphflow
```

Szukaj:
- `Refreshing Dropbox access token...` - odświeżanie tokenu
- `Dropbox token refreshed successfully` - sukces odświeżania
- `Failed to refresh Dropbox token` - błąd odświeżania
- `Marking Dropbox integration as disconnected` - integracja rozłączona

### Sprawdź tokeny w bazie

```sql
SELECT key,
       CASE WHEN key = 'dropbox_access_token' THEN LEFT(value, 20) || '...' ELSE value END as value,
       "updatedAt"
FROM "SystemSetting"
WHERE key LIKE 'dropbox_%';
```

## FAQ

### Czy muszę migrować?
Nie jest to wymagane, ale zalecane. Manualne tokeny mogą wygasnąć w każdej chwili.

### Czy stracę pliki?
Nie. Pliki w Dropbox pozostają nienaruszone. Migracja dotyczy tylko sposobu autentykacji.

### Co jeśli mam już połączenie z manualnym tokenem?
Będzie działać do wygaśnięcia. W ustawieniach zobaczysz ostrzeżenie z opcją "Połącz ponownie".

### Czy mogę używać tej samej aplikacji Dropbox?
Tak, możesz dodać OAuth redirect URI do istniejącej aplikacji w Dropbox App Console.
