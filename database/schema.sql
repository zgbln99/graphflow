-- ============================================
-- Panel Zleceń Graficznych - GraphFlow
-- Schemat bazy danych MySQL
-- ============================================
-- HOSTINGER: Nie twórz bazy przez SQL!
-- 1. Utwórz bazę w panelu Hostinger
-- 2. Wybierz ją w phpMyAdmin
-- 3. Zaimportuj ten plik
-- ============================================

-- Tabela firm/klientów (główne konta)
CREATE TABLE firmy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(255) NOT NULL,
    nip VARCHAR(20),
    adres TEXT,
    telefon VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    logo VARCHAR(255),
    aktywna TINYINT(1) DEFAULT 1,
    notatki_wewnetrzne TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nazwa (nazwa),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Tabela użytkowników
CREATE TABLE uzytkownicy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_id INT,
    email VARCHAR(255) NOT NULL UNIQUE,
    haslo VARCHAR(255) NOT NULL,
    imie VARCHAR(100) NOT NULL,
    nazwisko VARCHAR(100) NOT NULL,
    telefon VARCHAR(20),
    stanowisko VARCHAR(100),
    avatar VARCHAR(255),
    rola ENUM('admin', 'klient', 'pracownik') DEFAULT 'klient',
    aktywny TINYINT(1) DEFAULT 1,
    ostatnie_logowanie DATETIME,
    token_reset VARCHAR(255),
    token_reset_wazny DATETIME,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (firma_id) REFERENCES firmy(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_rola (rola),
    INDEX idx_firma (firma_id)
) ENGINE=InnoDB;

-- Kategorie zleceń
CREATE TABLE kategorie (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(100) NOT NULL,
    opis TEXT,
    kolor VARCHAR(7) DEFAULT '#3B82F6',
    ikona VARCHAR(50) DEFAULT 'folder',
    aktywna TINYINT(1) DEFAULT 1,
    kolejnosc INT DEFAULT 0
) ENGINE=InnoDB;

-- Główna tabela zleceń
CREATE TABLE zlecenia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numer VARCHAR(50) NOT NULL UNIQUE,
    firma_id INT NOT NULL,
    uzytkownik_id INT NOT NULL,
    kategoria_id INT,
    tytul VARCHAR(255) NOT NULL,
    opis TEXT NOT NULL,
    priorytet ENUM('niski', 'normalny', 'wysoki', 'pilny') DEFAULT 'normalny',
    status ENUM('nowe', 'w_realizacji', 'oczekuje', 'do_akceptacji', 'poprawki', 'zakonczone', 'anulowane') DEFAULT 'nowe',
    termin_realizacji DATE,

    -- Pola wewnętrzne (tylko dla admina)
    lokalizacja_plikow VARCHAR(500),
    notatki_wewnetrzne TEXT,
    czas_pracy_minuty INT DEFAULT 0,
    koszt_szacowany DECIMAL(10,2),
    koszt_koncowy DECIMAL(10,2),

    -- Pola końcowe
    link_podglad VARCHAR(500),
    link_pliki VARCHAR(500),

    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    zakonczono DATETIME,

    FOREIGN KEY (firma_id) REFERENCES firmy(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    FOREIGN KEY (kategoria_id) REFERENCES kategorie(id) ON DELETE SET NULL,

    INDEX idx_numer (numer),
    INDEX idx_status (status),
    INDEX idx_firma (firma_id),
    INDEX idx_utworzono (utworzono),
    INDEX idx_priorytet (priorytet)
) ENGINE=InnoDB;

-- Załączniki do zleceń
CREATE TABLE zalaczniki (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT NOT NULL,
    nazwa_oryginalna VARCHAR(255) NOT NULL,
    nazwa_pliku VARCHAR(255) NOT NULL,
    sciezka VARCHAR(500) NOT NULL,
    rozmiar INT,
    typ_mime VARCHAR(100),
    typ ENUM('wejsciowy', 'wyjsciowy', 'roboczy') DEFAULT 'wejsciowy',
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    INDEX idx_zlecenie (zlecenie_id)
) ENGINE=InnoDB;

-- Komentarze/wiadomości do zleceń
CREATE TABLE komentarze (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT NOT NULL,
    tresc TEXT NOT NULL,
    typ ENUM('publiczny', 'wewnetrzny') DEFAULT 'publiczny',
    wyslano_mail TINYINT(1) DEFAULT 0,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    INDEX idx_zlecenie (zlecenie_id),
    INDEX idx_typ (typ)
) ENGINE=InnoDB;

-- Historia zmian statusów
CREATE TABLE historia_statusow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL,
    uzytkownik_id INT NOT NULL,
    status_poprzedni VARCHAR(50),
    status_nowy VARCHAR(50) NOT NULL,
    komentarz TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    INDEX idx_zlecenie (zlecenie_id)
) ENGINE=InnoDB;

-- Powiadomienia
CREATE TABLE powiadomienia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uzytkownik_id INT NOT NULL,
    zlecenie_id INT,
    tytul VARCHAR(255) NOT NULL,
    tresc TEXT,
    typ ENUM('info', 'sukces', 'ostrzezenie', 'blad') DEFAULT 'info',
    przeczytane TINYINT(1) DEFAULT 0,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE SET NULL,
    INDEX idx_uzytkownik (uzytkownik_id),
    INDEX idx_przeczytane (przeczytane)
) ENGINE=InnoDB;

-- Logi mailowe
CREATE TABLE logi_mail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT,
    odbiorca VARCHAR(255) NOT NULL,
    temat VARCHAR(255) NOT NULL,
    tresc TEXT,
    status ENUM('wyslany', 'blad', 'oczekuje') DEFAULT 'oczekuje',
    blad_info TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_zlecenie (zlecenie_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Ustawienia aplikacji
CREATE TABLE ustawienia (
    klucz VARCHAR(100) PRIMARY KEY,
    wartosc TEXT,
    opis VARCHAR(255),
    zaktualizowano DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- Dane początkowe
-- ============================================

-- Domyślne kategorie
INSERT INTO kategorie (nazwa, opis, kolor, ikona, kolejnosc) VALUES
('Projekty graficzne', 'Ulotki, plakaty, wizytówki, banery', '#3B82F6', 'palette', 1),
('Identyfikacja wizualna', 'Logo, księga znaku, brand design', '#8B5CF6', 'brush', 2),
('Social Media', 'Grafiki na Facebook, Instagram, LinkedIn', '#EC4899', 'share', 3),
('Druk', 'Przygotowanie do druku, prepress', '#F59E0B', 'printer', 4),
('WWW', 'Grafiki na stronę, banery reklamowe', '#10B981', 'globe', 5),
('Video', 'Animacje, intro, motion graphics', '#EF4444', 'video', 6),
('Inne', 'Pozostałe projekty graficzne', '#6B7280', 'folder', 7);

-- Domyślne ustawienia
INSERT INTO ustawienia (klucz, wartosc, opis) VALUES
('numer_zlecenia_prefix', 'GF', 'Prefix numerów zleceń'),
('numer_zlecenia_rok', '2025', 'Rok w numeracji'),
('numer_zlecenia_licznik', '0', 'Licznik zleceń'),
('mail_powiadomienia', '1', 'Czy wysyłać powiadomienia mailowe'),
('max_rozmiar_pliku', '52428800', 'Maksymalny rozmiar pliku (50MB)');

-- Domyślny administrator (hasło: admin123)
INSERT INTO uzytkownicy (email, haslo, imie, nazwisko, rola, aktywny) VALUES
('admin@graphflow.pl', '$2y$12$zUGxFsY45xTsSdmRn/uhnu5VncrTGgdqSrZ9/gY0cROACU2D91MCu', 'Administrator', 'Systemu', 'admin', 1);
-- ZMIEŃ HASŁO PO PIERWSZYM LOGOWANIU!

-- ============================================
-- DODATKOWE FUNKCJE
-- ============================================

-- Oceny zleceń (feedback od klienta)
CREATE TABLE oceny (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zlecenie_id INT NOT NULL UNIQUE,
    uzytkownik_id INT NOT NULL,
    ocena TINYINT NOT NULL CHECK (ocena >= 1 AND ocena <= 5),
    komentarz TEXT,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Etykiety/tagi zleceń
CREATE TABLE etykiety (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nazwa VARCHAR(50) NOT NULL,
    kolor VARCHAR(7) DEFAULT '#6B7280',
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Powiązanie etykiet ze zleceniami (many-to-many)
CREATE TABLE zlecenia_etykiety (
    zlecenie_id INT NOT NULL,
    etykieta_id INT NOT NULL,
    PRIMARY KEY (zlecenie_id, etykieta_id),
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE,
    FOREIGN KEY (etykieta_id) REFERENCES etykiety(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Szablony szybkich odpowiedzi
CREATE TABLE szablony_odpowiedzi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tytul VARCHAR(100) NOT NULL,
    tresc TEXT NOT NULL,
    skrot VARCHAR(20),
    kolejnosc INT DEFAULT 0,
    aktywny TINYINT(1) DEFAULT 1,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Ulubione/zapisane zlecenia użytkownika
CREATE TABLE ulubione (
    uzytkownik_id INT NOT NULL,
    zlecenie_id INT NOT NULL,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (uzytkownik_id, zlecenie_id),
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Przypomnienia
CREATE TABLE przypomnienia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uzytkownik_id INT NOT NULL,
    zlecenie_id INT,
    tytul VARCHAR(255) NOT NULL,
    tresc TEXT,
    data_przypomnienia DATETIME NOT NULL,
    wyslane TINYINT(1) DEFAULT 0,
    utworzono DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE SET NULL,
    INDEX idx_data (data_przypomnienia),
    INDEX idx_wyslane (wyslane)
) ENGINE=InnoDB;

-- Domyślne etykiety
INSERT INTO etykiety (nazwa, kolor) VALUES
('Pilne', '#EF4444'),
('VIP', '#F59E0B'),
('Powtarzalne', '#8B5CF6'),
('Nowy klient', '#10B981'),
('Do rozliczenia', '#3B82F6'),
('Wstrzymane', '#6B7280');

-- Domyślne szablony odpowiedzi
INSERT INTO szablony_odpowiedzi (tytul, tresc, skrot, kolejnosc) VALUES
('Potwierdzenie przyjęcia', 'Dziękujemy za zlecenie! Przyjęliśmy je do realizacji i wkrótce się z Tobą skontaktujemy.', '/przyjete', 1),
('Prośba o materiały', 'Potrzebujemy dodatkowych materiałów do realizacji zlecenia. Proszę o przesłanie:\n- \n- ', '/materialy', 2),
('Projekt gotowy do akceptacji', 'Projekt jest gotowy do Twojej akceptacji. Link do podglądu znajdziesz powyżej. Czekamy na informację zwrotną!', '/gotowe', 3),
('Prośba o doprecyzowanie', 'Mamy kilka pytań dotyczących zlecenia:\n1. \n2. \nProszę o odpowiedź, abyśmy mogli kontynuować pracę.', '/pytania', 4),
('Zlecenie zakończone', 'Zlecenie zostało zrealizowane! Pliki do pobrania znajdziesz w sekcji "Gotowe pliki". Dziękujemy za współpracę!', '/koniec', 5);
