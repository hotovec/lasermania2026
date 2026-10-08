# Datové formáty Lasermanie

Vše se generuje z `original-sources/` skriptem `js-demo/tools/build_data.py` (`npm run data`) do
`js-demo/data/lasermania.json` (pro monorepo) a `js-demo/js/data.js` (pro demo z `file://`).

| Klíč v datech | Zdroj | Obsah |
| --- | --- | --- |
| `font1`, `font2` | `a400_ingame1.fnt`, `a800_ingame2.fnt` | fonty dlaždic (horní / dolní řádek), base64 |
| `levels[]` | `compression/levels.xex` | 53 levelů `{n, pf, meta, image}` |
| `tankPmg` | `tool_stuff/lmdump0300` | PMG data tanku `$8700–$88FF` (P0 pak P1, 512 B), base64 |
| `musicMem` | `tool_stuff/lmdump0300` | RAM `$7700–$8FFF`: hudba CMC + přehrávač, base64 |

`lmdump0300` je RAM od `$0300`: adresa `A` je v souboru na offsetu `A - $300`.

## Levely (`levels.xex`, načteno na `$1A00`)

- Ukazatele: lo `$1A00+n`, hi `$1A80+n`. Na adrese levelu 1 bajt (nepoužitý), pak RLE mapa:
  bajt ≥ `$80` = dlaždice `bajt & $7F` opakovaná `další bajt + 1`×; jinak jedna dlaždice. 192 dlaždic (16×12).
- Za mapou 21 bajtů metadat: 0–3 ovladače dveří (`L_BFB0`), 4–7 dveře (`L_BFB4`), 8–15 relé (`L_BFB8`,
  páry i ↔ i^4), 16 emitor, 17 směr 0–7, 18 start tanku, 19 východ, 20 ?. Pozice = řádek×16 + sloupec, 255 = nic.
- Level 05 nemá emitor (jen sbírání kapslí). Čísla obrázků: level n = `original-sources/levels/atari{n+2:03}.tiff`.

## Typy dlaždic (`element_types`, `$5D00`)

Bity: `$80` odráží, `$40` posuvné, `$20` východ, `$10` průjezdné pro tank, `$08` kapsle,
`$04` „inverse“ (pixel 11 kreslí barvou PF3 místo PF2), `$02` animace přes časovač, `$01` rutina při zásahu.

Pozor: remake 2020 změnil **jen bit `$04`** u několika dlaždic (emitor, dveře, kapsle, ovladač, relé, východ,
průjezdné dlaždice) kvůli nové grafice. Pro originální grafiku platí tabulka z dumpu originálu (`INV_ORIG`
v `js-demo/js/lm-graphics.js`); herní bity jsou v obou stejné (`TYPES` v `lm-core.js`).

## Grafika dlaždic (ANTIC mód 4)

- Dlaždice `t` = znaky `2t` a `2t+1`; horní řádek z `font1`, dolní z `font2`. Znak 4×8 px, 2 bity na pixel:
  `00` pozadí, `01` PF0, `10` PF1, `11` PF2 (PF3 u inverse). Pixely jsou dvojitě široké → dlaždice 16×16.
- Paleta PAL (barvy ověřené ze screenshotů): pozadí `#000000`, PF0 `$22` `#590f00`, PF1 `$C4` `#246200`,
  PF2 `$7C` `#a9aee0`, PF3 `$96` `#2e699c`. Tank: `$A4` `#c96ed7`, `$C8` `#dfd777`.
- Screenshoty `levels/*.tiff`: 384×240, hrací plocha 256×192 na x 64, y 12, stavový řádek y 208–231.
  Na screenshotu je mapa po `createState` (s dlaždicí východu na `meta[19]`), paprsek a tank.
- Indexy barev dlaždic, glyfů paprsku i tanku dekóduje `js-demo/js/lm-tiles.js` (`decodeTiles`, `decodeBeam`,
  `decodeTank`), sdíleně pro demo i port.
- Vykreslení z dat (mapa + paprsek + tank) sedí na screenshoty pixel po pixelu ve všech 53 levelech, mimo stavový
  řádek (`npm run compare -- --all`). 45 screenshotů je ze startu levelu, 6 přesně po K herních krocích
  (level 2: 5, 3: 4, 22: 4, 23: 1, 24: 5, 38: 31 – paprsek mezitím zničil senzory, přerušovač, pojistku, otevřel se
  východ). Levely 14 a 44: na screenshotu chybí ovladač dveří (14 i emitor), krokováním bez pohybu tanku to nejde
  zopakovat. U 6 levelů je paprsek nedokreslený (viz Animace paprsku). Vše v `js-demo/data/screens.json`, hodnoty
  znovu najde `node js-demo/tools/compare_screen.js --search <level>`.
- Pozor: už první `runLaser` může mapu změnit (level 32: výbuch); screenshot ze startu ukazuje mapu před ním.

## Tank (PMG, `$8700` P0 žlutá, `$8800` P1 růžová)

- 16 snímků po 16 B: 16 řádků, 8 bitů na řádek, pixel dvojitě široký → 16×16. Bity P0 a P1 se nepřekrývají.
- Snímek (`$9C60`): `(směr | zablokovaný·4)·2 + fáze`, směr originálu (`ZP_96`) 0 doprava, 1 doleva, 2 nahoru,
  3 dolů; fáze pásů `(ZP_99 >> 2) & 1` při pohybu, zablokovaný (`ZP_AB`) = tank přirážející do překážky
  (snímky 8–15, posunuté). `LMTiles.tankFrame(face, fáze, zablokovaný)` převádí `GameState.face`
  (0 nahoru, 1 doleva, 2 dolů, 3 doprava).
- Snímek 0 (doprava, stojí) přesně odpovídá tanku na screenshotech. `buld-p0/p1.dat` v `original-sources`
  jsou jiná data (remake), nepoužívat.

## Animace paprsku

VBI (`$9BBA`) každé 4 snímky kopíruje 16 bajtů z `L_9F79` (`$9F7A + fáze*16`, fáze = `(RTCLOK & $0C) >> 2`)
do znaků 2 a 3 (`/`, `\`) a pozpátku do znaků 4 a 5. Barvy tak tečou ve směru letu. Data: `BEAM_ANIM`
v `lm-tiles.js`, znak podle směru `BEAM_CHAR = [3,2,2,5,5,4,4,3]`, glyf `beamGlyph(fáze, směr)`.

- Glyf je průhledný: pixel `00` nechá vidět dlaždici pod buňkou, `01`–`11` = PF0–PF2 (PF3 nikdy).
- Pořadí: dlaždice → paprsek → tank. Tank (PMG) má přednost před playfieldem, paprsek vede i pod tankem.
- Na screenshotech je fáze 0–3 podle okamžiku snímku (`beamPhase` v `screens.json`).
- Originál kreslí paprsek během `run_laser` do druhého obrazového bufferu (`ZP_84_vram2`) a VBI buffery přepíná
  v pevném rytmu (`L_9B31_switch_buffers`). Dlouhý paprsek proto může být na obrazovce nedokreslený: screenshoty
  levelů 0, 23, 24, 32, 44 ukazují jen prvních N buněk (19/20, 0/2, 109/122, 115/128, 1/12). Port kreslí celý
  paprsek.

## Hudba a zvuk

- Přehrávač CMC na `$8900` (init `$8946`, play `$8903` voláno z VBI 50×/s), data na `$7700`
  (= `msx/7700_lm_music.cmc.dat`). Init: `A=$70, X=$00, Y=$77`; skladba: `A=$00, X=pozice`; ticho `A=$40`.
- Skladby: **3 = titulka** (`$6E3A`), **ve hře 1 a 2** střídané po 4 levelech (`$9897`: level n s `n & 4` → 2, jinak 1).
- Originál **nemá zvukové efekty**. Efekty v demu jsou nové (`SFXPlayer` v `atari-audio.js`, druhý POKEY).
