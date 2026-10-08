// Lasermania – dlaždice z originálních fontů jako indexy barev (bez DOM).
// Sdílí demo (lm-graphics.js) i port do blit386 (esm/tiles.js). Indexy: 0 pozadí, 1 PF0, 2 PF1, 3 PF2, 4 PF3.
(function (root) {
'use strict';
const TILE = 16, COUNT = 64;
// bit2 ("inverse" = PF3) z ORIGINÁLNÍ tabulky element_types (lmdump0300, $5D00);
// remake 2020 ho u několika dlaždic změnil kvůli nové grafice, herní bity jsou stejné
const INV_ORIG = [
  0x00,0x00,0x00,0x44,0x80,0x80,0x80,0x80,0x04,0x04,0x04,0x04,0x04,0x80,0x04,0x04,
  0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x04,
  0xC4,0x08,0x01,0x82,0x01,0x01,0x01,0x01,0x10,0x10,0x02,0x02,0x02,0x02,0x02,0x02,
  0x00,0x00,0x00,0x00,0x20,0x01,0x02,0x02,0x02,0x10,0x10,0x10,0x10,0x10,0x00,0x44,
].map(t => t & 4);
const PAL = ['#000000', '#590f00', '#246200', '#a9aee0', '#2e699c'];   // pozadí, PF0 $22, PF1 $C4, PF2 $7C, PF3 $96

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// ANTIC mód 4: znak 4×8 px, 2 bity na pixel (00 pozadí, 01 PF0, 10 PF1, 11 PF2 / PF3 u "inverse" znaků)
// dlaždice t = znaky 2t a 2t+1; nahoře z font1, dole z font2; pixely dvojitě široké → 16×16
// výsledek: 64 dlaždic za sebou, každá 16×16 indexů (řádek po řádku)
function decodeTiles(font1, font2) {
  const out = new Uint8Array(COUNT * TILE * TILE);
  for (let code = 0; code < COUNT; code++) {
    const inv = INV_ORIG[code], base = code * TILE * TILE;
    for (let half = 0; half < 2; half++) {
      const font = half ? font2 : font1;
      for (let cx = 0; cx < 2; cx++) {
        const ch = (code * 2 + cx) & 0x7f;
        for (let row = 0; row < 8; row++) {
          const b = font[ch * 8 + row];
          for (let px = 0; px < 4; px++) {
            let v = (b >> (6 - 2 * px)) & 3; if (v === 3 && inv) v = 4;
            const o = base + (half * 8 + row) * TILE + cx * 8 + px * 2;
            out[o] = v; out[o + 1] = v;
          }
        }
      }
    }
  }
  return out;
}

// mapa 16×12 dlaždic → 256×192 indexů (referenční render hrací plochy bez paprsku a tanku)
function renderPlayfield(tiles, pf) {
  const W = 16, out = new Uint8Array(W * TILE * 12 * TILE);
  for (let i = 0; i < pf.length; i++) {
    const t = (pf[i] & 63) * TILE * TILE, x0 = (i % W) * TILE, y0 = Math.floor(i / W) * TILE;
    for (let y = 0; y < TILE; y++) out.set(tiles.subarray(t + y * TILE, t + y * TILE + TILE), (y0 + y) * W * TILE + x0);
  }
  return out;
}

root.LMTiles = { TILE, COUNT, INV_ORIG, PAL, b64, decodeTiles, renderPlayfield };
if (typeof module !== 'undefined') module.exports = root.LMTiles;
})(typeof window !== 'undefined' ? window : globalThis);
