// Lasermania – grafika: dlaždice z originálních fontů, animované znaky paprsku, tank z PMG dat.
// Potřebuje LM_DATA (data.js), LMCore (lm-core.js) a LMTiles (lm-tiles.js).
(function (root) {
'use strict';
const { W, H, DX, DY } = root.LMCore;
const D = root.LM_DATA;
const { PAL, b64 } = root.LMTiles;
// 64 dlaždic jako indexy barev (lm-tiles.js), tady jen převod na canvasy přes PAL
const TILES = root.LMTiles.decodeTiles(b64(D.font1), b64(D.font2));
const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));

function tileCanvas(code) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d'), img = g.createImageData(16, 16);
  for (let i = 0; i < 256; i++) {
    const [r, gg, bl] = RGB[TILES[code * 256 + i]];
    img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = bl; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
const ATLAS = Array.from({ length: 64 }, (_, i) => tileCanvas(i));

// tank: 16 originálních PMG snímků (lm-tiles.js), index snímku z LMTiles.tankFrame(face, fáze, zablokovaný)
const { TANK_PAL, tankFrame } = root.LMTiles;
const TANK_PX = root.LMTiles.decodeTank(b64(D.tankPmg));
const TANK = Array.from({ length: root.LMTiles.TANK_FRAMES }, (_, f) => {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d');
  for (let i = 0; i < 256; i++) { const v = TANK_PX[f * 256 + i]; if (v) { g.fillStyle = TANK_PAL[v - 1]; g.fillRect(i & 15, i >> 4, 1, 1); } }
  return c;
});

// ---- paprsek: 16 glyfů z lm-tiles.js ([fáze][znak-2]), průhledné pozadí ----
const { beamGlyph, beamPhase } = root.LMTiles;
const BEAM_PX = root.LMTiles.decodeBeam();
function glyphCanvas(g) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; const ctx = c.getContext('2d');
  for (let i = 0; i < 64; i++) { const v = BEAM_PX[g * 64 + i]; if (v) { ctx.fillStyle = PAL[v]; ctx.fillRect(i & 7, i >> 3, 1, 1); } }
  return c;
}
const BEAM_GLYPH = [0,1,2,3].map(f => [0,1,2,3].map(k => glyphCanvas(f * 4 + k)));   // [fáze][znak-2]
const beamFrame = time => beamPhase(Math.floor(time / 20));   // RTCLOK (50 Hz) & $0C

// vykreslí stav hry; opts = { scale, beamMode: 'pixel'|'blink', grid }
function render(ctx, st, time, opts) {
  const SC = opts.scale, cv = ctx.canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < W*H; i++) if (st.pf[i]) ctx.drawImage(ATLAS[st.pf[i] & 63], (i & 15) * 16 * SC, (i >> 4) * 16 * SC, 16 * SC, 16 * SC);
  if (opts.beamMode === 'pixel') {
    const f = beamFrame(time);
    for (const p of st.cells) ctx.drawImage(BEAM_GLYPH[f][beamGlyph(0, p.dir)], p.x * 8 * SC, p.y * 8 * SC, 8 * SC, 8 * SC);
  } else {
    const phase = Math.floor(time / 120);
    for (const p of st.cells) {
      ctx.fillStyle = ((p.x + p.y + phase) & 1) ? PAL[3] : PAL[2];
      const slash = DX[p.dir] === -DY[p.dir], x0 = p.x * 8 * SC, y0 = p.y * 8 * SC;
      for (let r = 0; r < 8; r++) ctx.fillRect(x0 + (slash ? (7 - r) >> 1 : r >> 1) * 2 * SC, y0 + r * SC, 2 * SC, SC);
    }
  }
  ctx.drawImage(TANK[tankFrame(st.face)], (st.tank & 15) * 16 * SC, (st.tank >> 4) * 16 * SC, 16 * SC, 16 * SC);
  if (opts.grid) {
    for (let gx = 0; gx <= 2*W; gx++) { ctx.fillStyle = gx % 2 ? 'rgba(169,174,224,.18)' : 'rgba(169,174,224,.45)'; ctx.fillRect(gx * 8 * SC, 0, 1, cv.height); }
    for (let gy = 0; gy <= 2*H; gy++) { ctx.fillStyle = gy % 2 ? 'rgba(169,174,224,.18)' : 'rgba(169,174,224,.45)'; ctx.fillRect(0, gy * 8 * SC, cv.width, 1); }
  }
  if (st.pause > 0) { ctx.fillStyle = '#dfd777'; ctx.font = 7 * SC + 'px Silkscreen, monospace'; ctx.fillText('LASER VYPNUT ' + st.pause, 5 * SC, 10 * SC); }
}

// náhled 4 fází znaků 2–5 (karta "Znaky paprsku")
function renderBeamPreview(ctx, time) {
  const f = beamFrame(time), Z = 6, gap = 10;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let fr = 0; fr < 4; fr++) for (let ch = 0; ch < 4; ch++) {
    const x = 8 + ch * (8 * Z + gap), y = 8 + fr * (8 * Z + gap);
    ctx.drawImage(BEAM_GLYPH[fr][ch], x, y, 8 * Z, 8 * Z);
    if (fr === f) { ctx.strokeStyle = '#a9aee0'; ctx.lineWidth = 2; ctx.strokeRect(x - 3, y - 3, 8 * Z + 6, 8 * Z + 6); }
  }
}

root.LMGraphics = { PAL, ATLAS, TANK, tankFrame, BEAM_GLYPH, beamFrame, render, renderBeamPreview };
})(window);
