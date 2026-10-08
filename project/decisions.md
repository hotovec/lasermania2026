# Záznam rozhodnutí

Nové rozhodnutí přidat nahoru: datum, rozhodnutí, důvod.

- **2026-10-08 Monorepo s npm workspaces.** `js-demo` je balíček `@lasermania/js-demo`, port na něm závisí.
  Důvod: jediný zdroj pravdy pro logiku a data, port i demo používají stejný kód.
- **2026-10-08 Logika zůstává klasický skript + ESM obal.** `js-demo/js/lm-core.js` se registruje jako
  `globalThis.LMCore`, `js-demo/esm/core.js` ho vrací jako ES modul (s typy `core.d.ts`).
  Důvod: demo musí běžet z `file://` (ES moduly tam prohlížeče nenačtou) a port potřebuje ESM.
- **2026-10-08 Golden testy logiky.** `js-demo/golden/core.json` + `npm test`. Bomba používá `Math.random`,
  test ji nahrazuje deterministickým generátorem. Nové nahrávání jen po vědomé změně logiky.
- **2026-10-08 blit386 připnutý na 1.7.1, šablona v TypeScriptu, `skipLibCheck`.** Čistá šablona neprojde
  `tsc` (chybí typy WebGPU uvnitř balíčku).
- **2026-10-08 Hudba v portu předrenderovaná.** blit386 nemá API pro streamování vzorků ani vlastní audio uzly.
- **2026-10-08 Barevný bit `$04` z originální tabulky.** Remake ho u několika dlaždic změnil, sedí to na screenshoty.
- **2026-10-08 Skladby: titulka 3, hra 1/2 po 4 levelech.** Podle kódu originálu (`$6E3A`, `$9897`).
- **2026-10-08 Herní krok 160 ms (8 snímků PAL).** Podle hlavní smyčky originálu.
