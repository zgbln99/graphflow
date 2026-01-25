# GraphFlow

System zarządzania projektami graficznymi dla agencji i freelancerów.

## Funkcje

- **Panel admina** - pełne zarządzanie projektami, ticketami, klientami
- **Panel klienta** - dostęp do swoich projektów, timeline, zgłoszenia
- **Timeline projektów** - sztywny szablon etapów (Brief → Koncepcja → Wersja 1 → Poprawki → Final)
- **System ticketów** - zgłoszenia od klientów z priorytetami i deadline'ami
- **Komentarze + notatki prywatne** - komunikacja z klientem + wewnętrzne notatki
- **Lokalizacje plików** - zapisywanie ścieżek do plików lokalnych i Dropbox
- **Integracja e-mail**:
  - Wysyłka powiadomień SMTP
  - Odbieranie odpowiedzi przez IMAP
  - Automatyczne mapowanie maili do ticketów

## Stack technologiczny

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Prisma ORM
- **Baza danych**: PostgreSQL 16
- **Email**: Nodemailer (SMTP), IMAP client
- **Deployment**: Docker, Traefik (reverse proxy + SSL)

## Szybki start (development)

### 1. Wymagania

- Node.js 20+
- Docker (dla PostgreSQL)

### 2. Instalacja

```bash
# Klonuj repo
git clone <repo-url>
cd graphflow

# Zainstaluj zależności
npm install

# Uruchom PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Skopiuj env
cp .env.example .env

# Wygeneruj klienta Prisma
npm run db:generate

# Utwórz tabele
npm run db:push

# Załaduj dane demo
npm run db:seed
```

### 3. Uruchomienie

```bash
# Aplikacja Next.js
npm run dev

# Email worker (osobny terminal)
npm run email:worker
```

Aplikacja dostępna pod: http://localhost:3000

### 4. Dane logowania (dev)

| Rola | Email | Hasło |
|------|-------|-------|
| Admin | marek@graphflow.eu | dev |
| Klient | jan.kowalski@example.com | klient123 |
| Klient | anna.nowak@example.com | klient123 |

## Deployment produkcyjny (VPS)

### 1. Wymagania serwera

- Ubuntu 22.04+ LTS
- Docker + Docker Compose
- Domena wskazująca na serwer (np. graphflow.eu)
- Dostęp do SMTP/IMAP (np. Hostinger)

### 2. Instalacja na serwerze

```bash
# Zaloguj się na serwer
ssh root@twoj-serwer

# Zainstaluj Docker
curl -fsSL https://get.docker.com | sh

# Skopiuj pliki projektu
git clone <repo-url> /opt/graphflow
cd /opt/graphflow

# Skopiuj i edytuj konfigurację
cp .env.example .env
nano .env
```

### 3. Konfiguracja .env

```env
# Baza danych
POSTGRES_USER=graphflow
POSTGRES_PASSWORD=bardzo-silne-haslo-123
POSTGRES_DB=graphflow

# Aplikacja
NEXT_PUBLIC_APP_URL=https://graphflow.eu
APP_SECRET=wygeneruj-32-znakowy-klucz-1
JWT_SECRET=wygeneruj-32-znakowy-klucz-2

# SMTP (wysyłka)
SMTP_HOST=mail.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=marek@graphflow.eu
SMTP_PASS=twoje-haslo-smtp
SMTP_FROM_NAME=GraphFlow
SMTP_FROM_EMAIL=no-reply@graphflow.eu

# IMAP (odbieranie)
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_USER=marek@graphflow.eu
IMAP_PASS=twoje-haslo-imap
IMAP_TLS=true
IMAP_MAILBOX=INBOX

# Email Reply-To
EMAIL_REPLY_SECRET=wygeneruj-32-znakowy-klucz-hmac
EMAIL_REPLY_DOMAIN=graphflow.eu
EMAIL_POLL_INTERVAL=60000

# SSL (Let's Encrypt)
ACME_EMAIL=admin@graphflow.eu
```

### 4. Uruchomienie

```bash
# Zbuduj i uruchom
docker compose up -d --build

# Sprawdź logi
docker compose logs -f

# Wykonaj migracje bazy
docker compose exec app npx prisma db push

# Załaduj dane początkowe
docker compose exec app npx prisma db seed
```

### 5. DNS

Skonfiguruj rekordy DNS:

```
A     graphflow.eu      -> IP_SERWERA
A     www.graphflow.eu  -> IP_SERWERA
```

SSL zostanie automatycznie skonfigurowany przez Let's Encrypt.

## Backup bazy danych

### Ręczny backup

```bash
docker compose exec postgres pg_dump -U graphflow graphflow > backup_$(date +%Y%m%d).sql
```

### Automatyczny backup (cron)

```bash
# Edytuj crontab
crontab -e

# Dodaj (backup codziennie o 3:00)
0 3 * * * cd /opt/graphflow && docker compose exec -T postgres pg_dump -U graphflow graphflow > /backups/graphflow_$(date +\%Y\%m\%d).sql
```

### Przywracanie

```bash
cat backup_20240101.sql | docker compose exec -T postgres psql -U graphflow graphflow
```

## Aktualizacja

```bash
cd /opt/graphflow

# Pobierz zmiany
git pull

# Przebuduj i uruchom
docker compose up -d --build

# Wykonaj migracje (jeśli są)
docker compose exec app npx prisma db push
```

## Integracja e-mail - szczegóły

### Jak działa Reply-To?

1. System wysyła email z unikalnym adresem Reply-To:
   `reply+TCK-000123.abc123def456@graphflow.eu`

2. Klient odpowiada na email (Reply)

3. Email trafia do skrzynki catch-all na graphflow.eu

4. Worker IMAP co minutę sprawdza skrzynkę:
   - Parsuje adres z nagłówków (X-Original-To, Delivered-To, To)
   - Weryfikuje token HMAC
   - Mapuje do ticketa
   - Tworzy komentarz

### Fallback

Jeśli Reply-To nie zadziała, system próbuje znaleźć ticket po numerze w temacie:
`[TCK-000123]`

### Bezpieczeństwo

- Akceptowane są tylko maile od użytkowników przypisanych do klienta
- Lub z domen zdefiniowanych w ustawieniach klienta (emailDomains)
- Nierozpoznane maile trafiają do "Skrzynki" w panelu admina

## Struktura projektu

```
graphflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Strony logowania
│   │   ├── (panel)/            # Panel (admin/klient)
│   │   └── page.tsx            # Landing page
│   ├── components/             # Komponenty React
│   ├── lib/                    # Biblioteki
│   │   ├── auth.ts             # Autoryzacja
│   │   ├── db.ts               # Prisma client
│   │   ├── email/              # SMTP, IMAP, szablony
│   │   ├── utils.ts            # Pomocnicze
│   │   └── validators.ts       # Schematy Zod
│   └── workers/
│       └── email-worker.ts     # Worker IMAP
├── prisma/
│   ├── schema.prisma           # Schemat bazy
│   └── seed.ts                 # Dane początkowe
├── Dockerfile                  # App container
├── Dockerfile.worker           # Email worker container
├── docker-compose.yml          # Production
└── docker-compose.dev.yml      # Development
```

## Licencja

Projekt prywatny. Wszystkie prawa zastrzeżone.

---

**GraphFlow** - System zarządzania projektami graficznymi
Domena: graphflow.eu
Kontakt: marek@graphflow.eu
