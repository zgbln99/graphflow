# Tabler UI — kopia dystrybucyjna

Zestaw komponentów panelu, na którym zbudowany jest interfejs aplikacji.

- Wersja: 1.4.0
- Licencja: MIT (https://github.com/tabler/tabler)
- Pliki: `css/tabler.min.css`, `js/tabler.min.js`

Trzymamy tu kopię zamiast zależności npm, bo pakiet `@tabler/core` waży ~47 MB
na dysku, a potrzebne są z niego dwa pliki (CSS nie ma zewnętrznych zasobów —
wszystkie grafiki są w data-URI).

## Aktualizacja

    npm pack @tabler/core@<wersja>
    tar -xzf tabler-core-<wersja>.tgz
    cp package/dist/css/tabler.min.css public/vendor/tabler/css/
    cp package/dist/js/tabler.min.js   public/vendor/tabler/js/
    rm -rf package tabler-core-<wersja>.tgz

Ikony w `src/views/club/_icons.ejs` pochodzą z pakietu `@tabler/icons` (MIT)
i są wygenerowane jako sprite — nie wymagają żadnej zależności w czasie działania.
