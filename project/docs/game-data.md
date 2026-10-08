# Datové formáty Lasermanie

Vše se generuje z `original-sources/` skriptem `js-demo/tools/build_data.py` (`npm run data`) do
`js-demo/data/lasermania.json` (pro monorepo) a `js-demo/js/data.js` (pro demo z `file://`).

| Klíč v datech | Zdroj | Obsah |
| --- | --- | --- |
| `font1`, `font2` | `a400_ingame1.fnt`, `a800_ingame2.fnt` | fonty dlaždic (horní / dolní řádek), base64 |
| `levels[]` | `compression/levels.xex` | 53 levelů `{n, pf, meta, image}` |
| `tank` | screenshot | sprite tanku 16×16 (`Y` žlutá, `P` růžová), míří doprava |
| `musicMem` | `tool_stuff/lmdump0300` | RAM `$7700–$8FFF`: hudba CMC + přehrávač, base64 |

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
- Indexy barev dlaždic dekóduje `js-demo/js/lm-tiles.js` (`decodeTiles`), sdíleně pro demo i port.
- Vykreslení z dat sedí na screenshoty `levels/*.tiff` pixel po pixelu (ověřeno pro všech 53 levelů,
  rozdíly jen tam, kde screenshot není ze startu levelu).

## Animace paprsku

VBI (`$9BBA`) každé 4 snímky kopíruje 16 bajtů z `L_9F79` (`$9F7A + fáze*16`, fáze = `(RTCLOK & $0C) >> 2`)
do znaků 2 a 3 (`/`, `\`) a pozpátku do znaků 4 a 5. Barvy tak tečou ve směru letu. Data: `BEAM_ANIM`
v `lm-graphics.js`, znak podle směru `BEAM_CHAR = [3,2,2,5,5,4,4,3]`.

## Hudba a zvuk

- Přehrávač CMC na `$8900` (init `$8946`, play `$8903` voláno z VBI 50×/s), data na `$7700`
  (= `msx/7700_lm_music.cmc.dat`). Init: `A=$70, X=$00, Y=$77`; skladba: `A=$00, X=pozice`; ticho `A=$40`.
- Skladby: **3 = titulka** (`$6E3A`), **ve hře 1 a 2** střídané po 4 levelech (`$9897`: level n s `n & 4` → 2, jinak 1).
- Originál **nemá zvukové efekty**. Efekty v demu jsou nové (`SFXPlayer` v `atari-audio.js`, druhý POKEY).
- Tank PMG data v originále `$8700–$88FF` (4 směry) – zatím nevytažená, demo otáčí jeden sprite.
