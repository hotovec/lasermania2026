# js-demo – Lasermania Laser Lab

Referenční JS demo v monorepu (balíček `@lasermania/js-demo`). Je to ověřená specifikace pro port
do blit386: logika, grafika i zvuk odpovídají originálu (viz `../project/docs/`).

Hratelná ukázka mechaniky laseru z Lasermanie (Atari 8bit, L.K. Avalon 1990) postavená na
originálních datech z tohoto repozitáře. Spuštění: otevřete `index.html` v prohlížeči (dvojklikem,
server není potřeba). Bez internetu se jen použije náhradní písmo.

## Soubory

| Soubor | Obsah |
| --- | --- |
| `index.html`, `css/style.css` | stránka a vzhled |
| `js/data.js` | vygenerovaná data: fonty dlaždic, levely, PMG data tanku, RAM s hudbou a přehrávačem (`window.LM_DATA`) |
| `js/lm-core.js` | herní logika bez DOMu: laser (`run_laser`), dveře, senzory, tank, dekodér levelů (`window.LMCore`, v Node `require`) |
| `js/lm-tiles.js` | dlaždice, glyfy paprsku a tank jako indexy barev bez DOMu, sdílené s portem (`window.LMTiles`, `@lasermania/js-demo/tiles`) |
| `js/lm-graphics.js` | canvasy dlaždic, paprsku a tanku z `lm-tiles.js`, vykreslení (`window.LMGraphics`) |
| `js/atari-audio.js` | emulátor 6502 + POKEY a přehrávač CMC (`window.AtariAudio`, v Node `require`) |
| `js/game.js` | UI: výběr levelu, editor, ovládání, hudba |
| `esm/core.js`, `esm/audio.js`, `esm/tiles.js` (+ `.d.ts`) | ES modulové vstupy pro ostatní části monorepa (`@lasermania/js-demo/core`, `/audio`, `/tiles`) |
| `data/lasermania.json` | stejná data jako `js/data.js`, pro import `@lasermania/js-demo/data.json` |
| `golden/core.json`, `tests/` | golden otisky herní logiky a test (`npm test`) |
| `tools/build_data.py` | znovu vygeneruje `js/data.js` a `data/lasermania.json` z `../original-sources` |
| `tools/render_music.js` | vyrenderuje hudbu nebo efekt do WAV v Node |
| `tools/compare_screen.js` | porovná referenční render (`lm-tiles.js`) a snímek portu se screenshoty originálu (`npm run compare` z kořene) |
| `tools/record_golden.js` | nahraje nové golden otisky (jen po vědomé změně logiky) |
| `prototypes/` | první port rutiny laseru (`laser.js`) a jeho ASCII test |

Pořadí skriptů v `index.html` je důležité: data → zvuk → logika → dlaždice → grafika → UI. Skripty jsou
klasické (ne ES moduly), aby fungovaly i z `file://`.

## Data

```sh
npm run data                                         # z kořene monorepa: všech 53 levelů
python3 js-demo/tools/build_data.py --levels 0-2     # jen vybrané
```

Čte z `../original-sources`: `a400_ingame1.fnt`, `a800_ingame2.fnt`, `compression/levels.xex` a `tool_stuff/lmdump0300`.
Podrobný popis formátů: `../project/docs/game-data.md`.

Formát levelu v `levels.xex` (načteno na `$1A00`): tabulka ukazatelů lo `$1A00` / hi `$1A80`,
na adrese levelu 1 bajt, pak RLE mapa 16×12 (bajt ≥ `$80` = dlaždice `bajt & $7F` opakovaná
`další bajt + 1`×) a 21 bajtů metadat:

| Bajty meta | Význam |
| --- | --- |
| 0–3 | pozice ovladačů dveří (`L_BFB0`) |
| 4–7 | pozice dveří k ovladačům (`L_BFB4`) |
| 8–15 | pozice relé, páry i ↔ i^4 (`L_BFB8`) |
| 16 | emitor (pozice) |
| 17 | směr emitoru 0–7 |
| 18 | start tanku |
| 19 | východ |

Pozice = řádek × 16 + sloupec, `255` = nepoužito.

## Použití v jiném projektu

```js
import LMCore from '@lasermania/js-demo/core';
import data from '@lasermania/js-demo/data.json';
const C = LMCore;
const st = C.createState(data.levels[0]);
C.tick(st);            // jeden herní krok: laser, animace, východ
st.cells;              // políčka paprsku na mřížce 32×24 znaků: {x, y, dir}
C.move(st, 1, 0);      // tank doprava; vrací 'win' při vjezdu do východu
```

```js
import AtariAudio from '@lasermania/js-demo/audio';
const A = AtariAudio;
const player = new A.CMCPlayer(ramFrom7700, 0x7700, 44100);   // ramFrom7700 = base64 data.musicMem
player.song(1);                 // 3 = titulka, 1/2 = ve hře (střídání po 4 levelech)
player.generate(float32Buffer); // vyplní buffer vzorky (mono, -1..1)
```

```sh
node tools/render_music.js 1 60 hra.wav
node tools/render_music.js sfx:explode 2 vybuch.wav
```

## Poznámky

- Laser, odrazy a animace paprsku odpovídají originálu (tabulky `L_A390`, `L_A398`, `L_A3D0`, `L_9F79`).
- Pohyb tanku je skokový, originál ho plynule animuje (snímky pásů a „zablokovaný“ tank jsou v PMG datech, demo kreslí jen fázi 0).
- Zvukové efekty originál nemá; demo je generuje druhým emulovaným POKEY (`AtariAudio.SFXPlayer`), spouští je události z `LMCore.takeEvents()`.
- Emulace POKEY je zjednodušená, hudba nezní úplně stejně jako na skutečném Atari.
- `$22` zafixuje délku paprsku, která pak každý krok klesá; na nule emitor vybuchne. Kapsle délku obnoví.
- Laserová bomba `$27` odpálí náhodnou dlaždici (pravidla z `L_A2E5`), výbuch je animace `$2B`–`$2F`.
- Relé se v editoru párují podle pořadí na mapě; v levelech se berou z metadat.
