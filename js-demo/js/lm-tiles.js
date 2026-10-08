// Lasermania – dlaždice z originálních fontů a sprite tanku z PMG dat jako indexy barev (bez DOM).
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

const TANK_PAL = ['#dfd777', '#c96ed7'];   // tank: P0 žlutá $C8, P1 růžová $A4 (L_9FBE_gamecolors)
const TANK_FRAMES = 16;

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

// tank: PMG data z $8700 (P0) a $8800 (P1), 16 snímků po 16 B, 8 bitů na řádek, pixel 2× široký → 16×16
// výsledek: 16 snímků za sebou, 0 průhledné, 1 P0 žlutá, 2 P1 růžová (bity P0 a P1 se nepřekrývají)
function decodeTank(pmg) {
  const out = new Uint8Array(TANK_FRAMES * TILE * TILE);
  for (let f = 0; f < TANK_FRAMES; f++) {
    for (let row = 0; row < 16; row++) {
      const p0 = pmg[f * 16 + row], p1 = pmg[256 + f * 16 + row];
      for (let bit = 0; bit < 8; bit++) {
        const m = 0x80 >> bit, v = p0 & m ? 1 : p1 & m ? 2 : 0, o = f * TILE * TILE + row * TILE + bit * 2;
        out[o] = v; out[o + 1] = v;
      }
    }
  }
  return out;
}
// snímek tanku ($9C60): (směr | zablokovaný·4)·2 + fáze pásů; směr originálu 0 doprava, 1 doleva, 2 nahoru, 3 dolů
const FACE_DIR = [2, 1, 3, 0];   // LMCore face: 0 nahoru, 1 doleva, 2 dolů, 3 doprava
const tankFrame = (face, phase = 0, blocked = false) => (FACE_DIR[face] | (blocked ? 4 : 0)) * 2 + (phase & 1);

// mapa 16×12 dlaždic → 256×192 indexů (referenční render hrací plochy bez paprsku);
// s `tank` = { pos, frame, pixels } navíc tank s indexy 5 (P0) a 6 (P1)
function renderPlayfield(tiles, pf, tank) {
  const W = 16, SW = W * TILE, out = new Uint8Array(SW * 12 * TILE);
  for (let i = 0; i < pf.length; i++) {
    const t = (pf[i] & 63) * TILE * TILE, x0 = (i % W) * TILE, y0 = Math.floor(i / W) * TILE;
    for (let y = 0; y < TILE; y++) out.set(tiles.subarray(t + y * TILE, t + y * TILE + TILE), (y0 + y) * SW + x0);
  }
  if (tank && tank.pos < pf.length) {
    const x0 = (tank.pos % W) * TILE, y0 = Math.floor(tank.pos / W) * TILE, f = tank.frame * TILE * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = tank.pixels[f + y * TILE + x]; if (v) out[(y0 + y) * SW + x0 + x] = 4 + v;
    }
  }
  return out;
}

root.LMTiles = { TILE, COUNT, INV_ORIG, PAL, TANK_PAL, TANK_FRAMES, b64, decodeTiles, decodeTank, tankFrame, renderPlayfield };
if (typeof module !== 'undefined') module.exports = root.LMTiles;
})(typeof window !== 'undefined' ? window : globalThis);
