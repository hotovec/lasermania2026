// Lasermania – dlaždice z originálních fontů, glyfy paprsku a tank z PMG dat jako indexy barev (bez DOM).
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

// ---- paprsek: VBI ($9BBA) kopíruje každé 4 snímky 16 bajtů z L_9F79 ($9F7A + fáze*16) do znaků 2–5 ----
const BEAM_ANIM = [
  [0x02,0x03,0x0C,0x08,0x20,0x10,0x40,0x80, 0x80,0x40,0x10,0x20,0x08,0x0C,0x03,0x02],
  [0x03,0x02,0x08,0x04,0x10,0x20,0x80,0xC0, 0x40,0x80,0x20,0x30,0x0C,0x08,0x02,0x01],
  [0x02,0x01,0x04,0x08,0x20,0x30,0xC0,0x80, 0x80,0xC0,0x30,0x20,0x08,0x04,0x01,0x02],
  [0x01,0x02,0x08,0x0C,0x30,0x20,0x80,0x40, 0xC0,0x80,0x20,0x10,0x04,0x08,0x02,0x03],
];
const BEAM_CHAR = [3,2,2,5,5,4,4,3];   // L_A3D0: znak paprsku podle směru
const BEAM_GLYPHS = 16;                // 4 fáze × znaky 2–5
function beamBytes(phase, ch) {        // znaky 4,5 = data pozpátku (smyčka L_9BDB)
  const d = BEAM_ANIM[phase], all = ch < 4 ? d : d.slice().reverse();
  const o = (ch & 1) * 8; return all.slice(o, o + 8);
}
// 16 glyfů 8×8 za sebou (glyf = fáze*4 + znak-2), 0 průhledné (vidět dlaždice pod paprskem), 1–3 PF0–PF2;
// pixel znaku je 2× široký jako u dlaždic
function decodeBeam() {
  const out = new Uint8Array(BEAM_GLYPHS * 64);
  for (let phase = 0; phase < 4; phase++) for (let ch = 2; ch < 6; ch++) {
    const g = (phase * 4 + ch - 2) * 64;
    beamBytes(phase, ch).forEach((b, row) => {
      for (let px = 0; px < 4; px++) { const v = (b >> (6 - 2 * px)) & 3; out[g + row * 8 + px * 2] = v; out[g + row * 8 + px * 2 + 1] = v; }
    });
  }
  return out;
}
const beamGlyph = (phase, dir) => phase * 4 + BEAM_CHAR[dir] - 2;
const beamPhase = ticks => (ticks & 0x0C) >> 2;   // RTCLOK (50 Hz) & $0C

// mapa 16×12 dlaždic → 256×192 indexů (referenční render hrací plochy), pořadí jako v originále:
// dlaždice, paprsek (`beam` = { cells, phase, glyphs }, průhledný), tank (`tank` = { pos, frame, pixels },
// PMG má přednost před playfieldem) s indexy 5 (P0) a 6 (P1)
function renderPlayfield(tiles, pf, tank, beam) {
  const W = 16, SW = W * TILE, out = new Uint8Array(SW * 12 * TILE);
  for (let i = 0; i < pf.length; i++) {
    const t = (pf[i] & 63) * TILE * TILE, x0 = (i % W) * TILE, y0 = Math.floor(i / W) * TILE;
    for (let y = 0; y < TILE; y++) out.set(tiles.subarray(t + y * TILE, t + y * TILE + TILE), (y0 + y) * SW + x0);
  }
  if (beam) for (const c of beam.cells) {
    const g = beamGlyph(beam.phase, c.dir) * 64;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = beam.glyphs[g + y * 8 + x]; if (v) out[(c.y * 8 + y) * SW + c.x * 8 + x] = v;
    }
  }
  if (tank && tank.pos < pf.length) {
    const x0 = (tank.pos % W) * TILE, y0 = Math.floor(tank.pos / W) * TILE, f = tank.frame * TILE * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = tank.pixels[f + y * TILE + x]; if (v) out[(y0 + y) * SW + x0 + x] = 4 + v;
    }
  }
  return out;
}

root.LMTiles = { TILE, COUNT, INV_ORIG, PAL, TANK_PAL, TANK_FRAMES, BEAM_ANIM, BEAM_CHAR, BEAM_GLYPHS, b64, decodeTiles,
                 decodeTank, tankFrame, beamBytes, decodeBeam, beamGlyph, beamPhase, renderPlayfield };
if (typeof module !== 'undefined') module.exports = root.LMTiles;
})(typeof window !== 'undefined' ? window : globalThis);
