-- Wszystkie pliki trafiają do magazynu S3 (MEGA S4): zdjęcia, nakładki
-- szablonów, pliki źródłowe PSD, eksporty i logo klubu.

-- Plik źródłowy szablonu (PSD) trzymamy razem z resztą jego zasobów,
-- żeby powrót do oryginału nie znaczył szukania po dyskach grafika.
ALTER TABLE cg_template_assets
  MODIFY kind ENUM('overlay','background','mask','font','image','source') NOT NULL;

-- Klucze obiektów w buckecie bywają dłuższe od dotychczasowych ścieżek lokalnych.
ALTER TABLE cg_template_assets
  MODIFY object_key VARCHAR(700) NOT NULL;
