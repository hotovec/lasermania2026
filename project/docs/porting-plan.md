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
- [ ] **M5 Hudba a efekty** – detekce bodu smyčky CMC, render skladeb 1, 2, 3 do OGG + MP3,
  `BT.musicPlay` s `loopStart/loopEnd`, skladba podle levelu; efekty do WAV → `BT.soundPlay`
  na `LMCore.takeEvents()`.
  *Ověření:* render v Node (`js-demo/tools/render_music.js`), přehrání v prohlížeči.
- [ ] **M6 UI** – stavový řádek (originální `8400_statusbar.fnt`), editor (pointer), případně HTML kolem canvasu.
- [ ] **M7 Doladění** – CRT efekty jen na WebGPU, test `?backend=software`, Safari (MP3), build a nasazení.
