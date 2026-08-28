-- 004: harmonogram produkcji materiałów meczowych
-- Pakiet grafik przypisany do meczu potrzebuje terminu i osoby odpowiedzialnej,
-- inaczej dashboard nie ma z czego zbudować harmonogramu dnia meczowego.
ALTER TABLE cg_match_templates
  ADD COLUMN deadline_at DATETIME NULL AFTER status,
  ADD COLUMN owner_role ENUM('admin','designer','social','photographer') NULL AFTER deadline_at,
  ADD COLUMN note VARCHAR(255) NULL AFTER owner_role;

-- Sezon: dokładne daty pozwalają wyliczyć, który sezon jest bieżący.
ALTER TABLE cg_seasons
  ADD COLUMN starts_on DATE NULL AFTER name,
  ADD COLUMN ends_on DATE NULL AFTER starts_on;

-- Wyszukiwanie meczów po dacie w obrębie sezonu to najczęstsze zapytanie aplikacji.
ALTER TABLE cg_matches
  ADD INDEX idx_cg_matches_season_date (season_id, match_date);
