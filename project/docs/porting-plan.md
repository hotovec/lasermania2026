# Plán portu do blit386

Každý milník má automatické ověření. Stav odškrtávat zde. Postup: plan mode → schválení → jeden milník
→ ověření → commit.

- [x] **M0 Start** – monorepo, šablona create-blit386 1.7.1 (TS), import logiky a dat z `js-demo` funguje
  (`npm run check`, `npm run build`, kostra v `lasermania-blit386/src/game.ts`).
- [x] **M1 Paleta a dlaždice** – sheet 64 dlaždic z fontů přes `SpriteSheet.fromIndexedPixels`
  (barevný bit z `INV_ORIG`), vykreslení mapy levelu 0.
  *Ověření:* `BT.captureFrame({ size: 'display' })` porovnat s `js-demo` (stejná data → stejné pixely)
  a se screenshotem `original-sources/levels/atari002.tiff`.
  *Stav:* dlaždice ze sdíleného `js-demo/js/lm-tiles.js` (`@lasermania/js-demo/tiles`). Snímek portu
  (`npm run shot -- lasermania-blit386/screenshots/l00.png [--backend software]`) = reference pixel po pixelu na WebGPU i Canvas 2D;
  proti screenshotu 0 rozdílů mimo masku tanku, paprsku a stavového řádku
  (`npm run compare -- 0 lasermania-blit386/screenshots/l00.png --diff …`).
- [x] **M2 Všech 53 levelů** – výběr levelu, tank (4 směry; ideálně PMG data z dumpu `$8700–$88FF`).
  *Ověření:* skript projde všechny levely a porovná snímky se screenshoty (očekávané rozdíly: tank, paprsek,
  prvky zničené na screenshotu).
  *Stav:* tank z PMG dat dumpu (16 snímků, demo i port), PageDown/PageUp/R, dev hook `__game.load(n, kroky)`.
  `npm run shot -- --all lasermania-blit386/screenshots/all [--backend software]` + `npm run compare -- --all
  lasermania-blit386/screenshots/all`: snímek portu = reference ve všech 53 levelech na WebGPU i Canvas 2D;
  proti screenshotům 0 rozdílů mimo paprsek a stavový řádek (stav screenshotů v `js-demo/data/screens.json`,
  výjimky jen levely 14 a 44).
- [x] **M3 Paprsek** – 16 glyfů (4 fáze × znaky 2–5), fáze `(BT.ticks & 0x0C) >> 2`.
  *Ověření:* snímky fází proti `js-demo`.
  *Stav:* glyfy ze sdíleného `lm-tiles.js` (`decodeBeam`, demo beze změny chování), pořadí dlaždice → paprsek →
  tank. Level 0 ve 4 fázích (`__game.load(0, 0, f)`): snímek portu = reference, fáze se liší, bez zmrazení se fáze
  mění po 4 snímcích. Všech 53 levelů (WebGPU i Canvas 2D): snímek portu = reference s paprskem; reference =
  screenshot bez masky paprsku (`screens.json`: fáze, nedokreslený paprsek u 6 levelů).
- [x] **M4 Smyčka a vstup** – `Timer(8)` / `BT.ticks % 8`, `BT.isPressed`, gamepad, výhra → další level.
  *Ověření:* golden testy (`npm test`) beze změny; v prohlížeči dohrát level 00.
  *Stav:* hotovo. Vstup jako `control2` remaku (WASD + šipky + gamepad hráče 0, první směr
  od posledního kroku, opakování až po 480 ms držení), krok na hranici 8 snímků, plynulý pohyb tanku i tlačené dlaždice (`tankOffset`), snímky
  pásů a „zablokovaného“ tanku, výhra → za 1,6 s další level, po levelu 52 konec. Ověřeno přes `blit play`
  (WebGPU i Canvas 2D): stisk 60–445 ms = vždy 1 políčko (63 stisků s náhodnou fází), 500 ms = 2, držení 1 s = 5 políček,
  dvě rychlá ťuknutí = 2, náraz, tlačení zrcadla, výhra (fixture
  `setTile`/`setTank`), konec; snímky M1–M3 beze změny. Ručně: level 00 dohrán klávesnicí, výhra přepnula na
  další level (uživatel). Gamepad netestovaný (uživatel ho nemá, headless ho nenasimuluje).
- [x] **M5 Hudba a efekty** – detekce bodu smyčky CMC, render skladeb 1, 2, 3 do OGG + MP3,
  `BT.musicPlay` s `loopStart/loopEnd`, skladba podle levelu; efekty do WAV → `BT.soundPlay`
  na `LMCore.takeEvents()`.
  *Ověření:* render v Node (`js-demo/tools/render_music.js`), přehrání v prohlížeči.
  *Stav:* `npm run sound` (`render_music.js --all`) najde smyčky (1: 23,1 + 173,3 s, 2: 15,4 + 207,9 s, 3: 3,9 +
  107,8 s), vyrenderuje `js-demo/data/sound/` (OGG + MP3 přes `wasm-media-encoders`, `music.json`, 13 efektů WAV),
  export `@lasermania/js-demo/sound/*`. Kontrola švu: rozdíl obálky 3–18 %, o 1 snímek vedle 38–62 %;
  `render_music.js --seam n` = 10 s WAV kolem švu na poslech. Port `src/sound.ts`: skladba podle levelu (`n & 4`),
  efekty na události `move` i `tick`, M / N ztlumí hudbu / efekty. `blit play` (WebGPU i Canvas 2D): po stisku
  `audioUnlocked`, `musicPlaying`, level 0 → skladba 1, level 4 → 2, kroky → `step`, `sensor`; M/N ztlumí; snímky
  53 levelů beze změny. Titulka (skladba 0, viz M6). Poslech v prohlížeči: uživatel.
- [ ] **M6 UI** – titulka a stavový řádek podle originálu 1990, životy jako originál (volba uživatele).
  - [x] **M6a Data a dekodéry** – `statusFont` ($8400) a `titleMem` (RAM $5400–$93FF) v `lasermania.json`,
    `js-demo/js/lm-ui.js` (`@lasermania/js-demo/ui`): `statusbarCells`, `Equalizer`, `atariRGB`, `TitleMachine`
    (originální kód titulky v emulátoru 6502), skladba 0 a `vu.json` v `npm run sound`.
    *Stav:* testy `tests/ui.test.js`; render stavového řádku = screenshoty levelů 0–11 pixel po pixelu (mimo
    ekvalizér), titulka z emulátoru vykreslená do PNG (pole, písmena, titulky, scroller, ©).
  - [x] **M6b Stavový řádek + životy v portu** – ESC = −1 život, výhra +1, konec hry; ekvalizér.
    *Stav:* `src/statusbar.ts` (panely + inverzní font, všech 120 buněk), ekvalizér z `vu.json` podle času od
    startu skladby (`Sound.volumes`). Životy: start 5, ESC / gamepad SELECT = −1 a restart, na „00“ konec hry
    (zatím nová hra od levelu 0), výhra +1. `compare_screen.js` kreslí stavový řádek (životy n + 5) a maskuje jen
    ekvalizér (+ životy a roh noty u screenshotů od levelu 12, upravená verze): reference = 53 screenshotů,
    snímek portu = reference na WebGPU i Canvas 2D. `blit play`: ESC 5 → 4, 1 → konec hry, výhra 5 → 6,
    ekvalizér se hýbe s hudbou.
  - [x] **M6c Titulka v portu** – scény titulka → hra → titulka / vítězná obrazovka, START/fire, skladba 0.
    *Stav:* `src/title.ts`: `TitleMachine` každý snímek, pole se po iteraci animace dekóduje do sprite sheetu,
    titulky/©/scroller po znacích fontu `$9000`, černá maska scrolleru. Scény `title` (skladba 0) → START
    (Enter, mezerník, gamepad START/A; originál bere START až po ~5,1 s) → hra → konec hry → titulka; po levelu 52
    vítězná obrazovka (`$6B92` v emulátoru, skladba 3) → START → titulka. Hudba: na startu jen skladba 0 a
    efekty, ostatní na pozadí. Ověřeno `blit play` (WebGPU i Canvas 2D): START ve 2 s ignorován, v 6 s hra;
    5× ESC → titulka; snímky titulky (2 s, 22 s se scrollerem) a vítězné obrazovky; snímky 53 levelů beze
    změny. Barvy titulky jsou aproximace (screenshot titulky z originálu nemáme).
  - [ ] **M6d** Animace dalšího levelu (`L_9720`), editor (pointer), případně HTML kolem canvasu.
- [ ] **M7 Doladění** – CRT efekty jen na WebGPU, test `?backend=software`, Safari (MP3), build a nasazení.
