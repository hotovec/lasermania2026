# Záznam rozhodnutí

Nové rozhodnutí přidat nahoru: datum, rozhodnutí, důvod.

- **2026-10-08 Titulka a stavový řádek podle originálu 1990, životy jako originál.** Volba uživatele (verze 2020
  od PG má jinou grafiku titulky, návod přes SELECT a stavový řádek bez ekvalizéru).
- **2026-10-08 Titulka = originální kód v emulátoru 6502.** Engine létajících písmen (`$5DC0`) je samomodifikující
  kód se softwarovými sprity; místo přepisu běží `$6AB7` v `CPU` z `atari-audio.js` nad RAM z dumpu
  (`lm-ui.js` `TitleMachine`) a kreslí se jeho obrazovka a fonty. Tempo z počtu cyklů (rozpočet 20 000 na snímek,
  odhad). Stavový řádek je jednoduchý, ten je přepsaný do JS.
- **2026-10-08 Barvy Atari mimo screenshoty z modelu.** Přesnou paletu emulátoru screenshotů nemáme; `atariRGB`
  vrací známé barvy přesně a ostatní z YUV modelu nafitovaného na ně (odchylka ~10). Oprava: tank má barvy
  `$1E`/`$4A` (`L_9FBE`), ne `$C8`/`$A4` – RGB ve hře byly správně, popisky ne.
- **2026-10-08 Titulka hraje skladbu 0, skladba 3 je vítězná obrazovka.** Podle kódu (`$6D4E`, `$6E3A`); dřívější
  záznam „titulka 3“ byl omyl.
- **2026-10-08 Ekvalizér z předpočítaných hlasitostí.** blit386 1.7.1 neumí pozici přehrávané hudby; `vu.json`
  má hlasitosti kanálů po snímcích, port je čte podle času od startu skladby (`BT.ticks`) se smyčkou z `music.json`.

- **2026-10-08 Zvuk portu předrenderovaný z emulátoru dema.** `render_music.js --all` (Node) renderuje skladby 1–3
  a efekty stejným kódem jako demo (`atari-audio.js`); port je hraje jako `AudioClip`. Důvod: blit386 hraje jen
  klipy (`BT.musicPlay` / `BT.soundPlay`), živá emulace by obcházela engine; render 200 s hudby za běhu trvá
  sekundy.
- **2026-10-08 Smyčka z periody registrů POKEY.** Nejmenší perioda, se kterou se registry po snímcích VBI opakují
  (okno 40 min), `loopStart`/`loopEnd` v sekundách (`music.json`); render do `loopEnd + 2 s`. Konstantní posun
  dekodéru MP3 smyčce nevadí (oba body se posunou stejně). Kontrola obálkou, ne vzorky – fáze čítačů POKEY se na
  švu liší.
- **2026-10-08 OGG + MP3, efekty WAV, enkodér `wasm-media-encoders`.** `AudioClip.load([ogg, mp3])` (MP3 záloha
  kvůli Safari), mono 44,1 kHz, Vorbis q4 / MP3 96 kb/s (~12 MB v `js-demo/data/sound/`, commitnuto jako ostatní
  generovaná data). Efekty WAV bez zpoždění enkodéru. Enkodér je WASM devDependency `js-demo` (žádný systémový
  `ffmpeg`). Soubory sdílí `js-demo` (export `./sound/*`), port je importuje přes Vite `?url`.
- **2026-10-08 Klávesy M / N** ztlumí hudbu / efekty (`BT.audioMuteSet`); demo má tlačítka, originál nic.

- **2026-10-08 Vstup podle `control2` (remake 2020).** Každý snímek se uloží první směr od posledního kroku
  (`BT.isDown` nebo `BT.isPressed`, aby prošlo i krátké ťuknutí), pohyb se provede na hranici kroku
  (`BT.ticks % 8`). Priorita při diagonále doprava > doleva > dolů > nahoru (`$94D4`). WASD + šipky hráče 0.
  Pauza před opakováním: nový stisk pohne o 1 políčko, stejný směr držený nepřetržitě se zopakuje až po 480 ms
  od stisku (`REPEAT_TICKS = 24`), pak jede každý krok; změna směru za jízdy bez pauzy, Shift / fire ji přeskočí.
  Vyhodnocuje se při ukládání směru. Důvod: bez pauzy běžný stisk (~200 ms) posunul tank o 2 políčka; pauza
  podle remaku (`repeat_delay_first`, 2 kroky od hranice kroku) kolísá 330–480 ms podle fáze stisku a občas
  dávala 2 políčka dál (hlášeno při testu, změřeno přes `blit play`). 480 ms = horní mez remaku, bez kolísání.
- **2026-10-08 Plynulý pohyb jen v kreslení.** `LMCore.move` proběhne hned (golden testy beze změny), tank a tlačená
  dlaždice se 8 snímků kreslí z výchozího políčka s posunem z `L_9F21` / `beam_data+1` (`LMTiles.tankOffset`).
  Paprsek se přepočítá hned po kroku (v originále až po dojetí) – rozdíl je kratší než jeden krok.
- **2026-10-08 Výhra → další level za 1,6 s, po levelu 52 konec.** Jako demo. Animace dalšího levelu (`L_9720`)
  a život navíc patří do M6; hlášky jsou zatím `BT.systemPrint` ve stavovém řádku.
- **2026-10-08 Dev fixture `setTank`, `setTile`, `tile`, `beamCells`.** Jen v dev režimu, pro testy pohybu a výhry
  bez řešení hlavolamu.

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
- **2026-10-08 Skladby: titulka 3, hra 1/2 po 4 levelech.** Podle kódu originálu (`$6E3A`, `$9897`). *Opraveno výše:
  titulka je skladba 0.*
- **2026-10-08 Herní krok 160 ms (8 snímků PAL).** Podle hlavní smyčky originálu.
