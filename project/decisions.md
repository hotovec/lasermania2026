# Záznam rozhodnutí

Nové rozhodnutí přidat nahoru: datum, rozhodnutí, důvod.

- **2026-10-08 Glyfy paprsku v `lm-tiles.js`.** `BEAM_ANIM`, `BEAM_CHAR`, `decodeBeam`, `beamGlyph`, `beamPhase`
  přesunuté z `lm-graphics.js` (demo je používá, glyfy ověřené shodné). Průhledné pozadí glyfu, pořadí dlaždice →
  paprsek → tank. Důvod: sedí na všechny screenshoty, tank v originále je PMG nad playfieldem.
- **2026-10-08 Port kreslí celý paprsek.** Nedokreslený paprsek na 6 screenshotech je artefakt double bufferu
  originálu (VBI přepne buffer dřív, než `run_laser` doběhne), ne herní pravidlo. `screens.json` má `beamCells`
  jen pro porovnání; u snímku portu se maskuje jen nedokreslený konec.
- **2026-10-08 Dev hook `load(n, kroky, fáze)`.** Drží i fázi paprsku; při 0 krocích paprsek z `runLaser` na kopii
  stavu (mapa ze startu), stejně jako `levelState` v `compare_screen.js`.

- **2026-10-08 Tank z PMG dat dumpu, demo i port.** `build_data.py` bere `$8700–$88FF` z `lmdump0300`
  (`tankPmg`), `lm-tiles.js` dekóduje 16 snímků; demo přestalo sprite otáčet, ruční přepis `tank` ze screenshotu
  zmizel. Důvod: originální snímky pro všechny směry (a pro M4 fáze pásů), demo a port kreslí stejné pixely.
- **2026-10-08 Výběr levelu PageDown / PageUp, restart R.** Originál má jen joystick; šipky a WASD zůstávají
  pro tank (M4). Cyklicky přes 53 levelů jako tlačítka v demu.
- **2026-10-08 Dev hook `window.__game`.** Jen při `BT.isDevMode`: `state()` pro `blit play state`,
  `load(n, kroky)` provede kroky a zastaví logiku. Důvod: deterministické snímky pro porovnání (logika jinak
  běží dál a už první krok mění mapu).
- **2026-10-08 Stav screenshotů v `js-demo/data/screens.json`.** Počet herních kroků, po kterém screenshot
  přesně odpovídá (nalezeno prohledáním 0–300 kroků), místo seznamu ignorovaných políček; políčka jen tam, kde
  stav nejde zopakovat (14, 44). Export `@lasermania/js-demo/screens.json` pro skript portu.

- **2026-10-08 Dlaždice sdílí `js-demo/js/lm-tiles.js`.** Čistý klasický skript (bez DOM): `INV_ORIG`, `PAL`,
  `decodeTiles` → indexy 0–4, `renderPlayfield`. Demo z indexů dělá canvasy, port sheet přes
  `SpriteSheet.fromIndexedPixels` (index v → paletový slot v + 1). Důvod: zákaz kopírování kódu mezi částmi.
- **2026-10-08 Hrací plocha na (32, 12).** Displej 320×240 je výřez screenshotu originálu (384×240, plocha na
  x 64, y 12) od x = 32, takže snímek portu jde se screenshotem porovnat 1:1; stavový řádek zůstane na y 208.
- **2026-10-08 Ověření snímků.** `js-demo/tools/compare_screen.js` (Node, bez závislostí) porovná referenci,
  screenshot a snímek portu s maskou tanku, paprsku a stavového řádku. Snímek portu bere
  `lasermania-blit386/scripts/shot-display.mjs` přes `blit play` (devDependency `playwright-core`) a
  `BT.captureFrame({ size: 'display' })` – krok `shot` v `blit play` velikost nepředává.
- **2026-10-08 Bez ikonky overlaye.** `isOverlayToggleHintVisible: false`: ikonka v levém dolním rohu byla ve
  snímcích. Overlay zůstává dostupný klávesou Backquote.

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
