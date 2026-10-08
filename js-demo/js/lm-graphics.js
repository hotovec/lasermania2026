// Lasermania – grafika: dlaždice z originálních fontů, animované znaky paprsku, sprite tanku.
// Potřebuje LM_DATA (data.js) a LMCore (lm-core.js).
(function (root) {
'use strict';
const { W, H, DX, DY } = root.LMCore;
const D = root.LM_DATA;
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const FONT1 = b64(D.font1);   // a400_ingame1.fnt – horní řádek znaků dlaždic
const FONT2 = b64(D.font2);   // a800_ingame2.fnt – dolní řádek
// bit2 ("inverse" = PF3) z ORIGINÁLNÍ tabulky element_types (lmdump0300, $5D00);
// remake 2020 ho u několika dlaždic změnil kvůli nové grafice, herní bity jsou stejné
const INV_ORIG = [
  0x00,0x00,0x00,0x44,0x80,0x80,0x80,0x80,0x04,0x04,0x04,0x04,0x04,0x80,0x04,0x04,
  0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x04,
  0xC4,0x08,0x01,0x82,0x01,0x01,0x01,0x01,0x10,0x10,0x02,0x02,0x02,0x02,0x02,0x02,
  0x00,0x00,0x00,0x00,0x20,0x01,0x02,0x02,0x02,0x10,0x10,0x10,0x10,0x10,0x00,0x44,
].map(t => t & 4);
const PAL = ['#000000', '#590f00', '#246200', '#a9aee0', '#2e699c'];   // pozadí, PF0 $22, PF1 $C4, PF2 $7C, PF3 $96

// ANTIC mód 4: znak 4×8 px, 2 bity na pixel (00 pozadí, 01 PF0, 10 PF1, 11 PF2 / PF3 u "inverse" znaků)
// dlaždice t = znaky 2t a 2t+1; nahoře z FONT1, dole z FONT2
function tileCanvas(code) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d'), img = g.createImageData(16, 16), inv = INV_ORIG[code];
  for (let half = 0; half < 2; half++) {
    const font = half ? FONT2 : FONT1;
    for (let cx = 0; cx < 2; cx++) {
      const ch = (code * 2 + cx) & 0x7f;
      for (let row = 0; row < 8; row++) {
        const b = font[ch * 8 + row];
        for (let px = 0; px < 4; px++) {
          let v = (b >> (6 - 2 * px)) & 3; if (v === 3 && inv) v = 4;
          const hex = PAL[v], r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
          for (let dx = 0; dx < 2; dx++) {
            const o = ((half * 8 + row) * 16 + cx * 8 + px * 2 + dx) * 4;
            img.data[o] = r; img.data[o+1] = gg; img.data[o+2] = bl; img.data[o+3] = 255;
          }
        }
      }
    }
  }
  g.putImageData(img, 0, 0); return c;
}
const ATLAS = Array.from({ length: 64 }, (_, i) => tileCanvas(i));

const TANK = (() => {   // sprite tanku (PMG), míří doprava
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d');
  D.tank.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ch === 'Y' ? '#dfd777' : '#c96ed7'; g.fillRect(x, y, 1, 1); } }));
  return c;
})();

// ---- animace paprsku: VBI ($9BBA) kopíruje každé 4 snímky 16 bajtů z L_9F79 ($9F7A + fáze*16) do znaků 2–5 ----
const BEAM_ANIM = [
  [0x02,0x03,0x0C,0x08,0x20,0x10,0x40,0x80, 0x80,0x40,0x10,0x20,0x08,0x0C,0x03,0x02],
  [0x03,0x02,0x08,0x04,0x10,0x20,0x80,0xC0, 0x40,0x80,0x20,0x30,0x0C,0x08,0x02,0x01],
  [0x02,0x01,0x04,0x08,0x20,0x30,0xC0,0x80, 0x80,0xC0,0x30,0x20,0x08,0x04,0x01,0x02],
  [0x01,0x02,0x08,0x0C,0x30,0x20,0x80,0x40, 0xC0,0x80,0x20,0x10,0x04,0x08,0x02,0x03],
];
const BEAM_CHAR = [3,2,2,5,5,4,4,3];   // L_A3D0: znak paprsku podle směru
function beamBytes(frame, ch) {        // znaky 4,5 = data pozpátku (smyčka L_9BDB)
  const d = BEAM_ANIM[frame], all = ch < 4 ? d : d.slice().reverse();
  const o = (ch & 1) * 8; return all.slice(o, o + 8);
}
function glyphCanvas(bytes) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
  bytes.forEach((b, row) => { for (let px = 0; px < 4; px++) { const v = (b >> (6 - 2 * px)) & 3; if (v) { g.fillStyle = PAL[v]; g.fillRect(px * 2, row, 2, 1); } } });
  return c;
}
const BEAM_GLYPH = [0,1,2,3].map(f => [2,3,4,5].map(ch => glyphCanvas(beamBytes(f, ch))));   // [fáze][znak-2]
const beamFrame = time => (Math.floor(time / 20) & 0x0C) >> 2;   // RTCLOK (50 Hz) & $0C

// vykreslí stav hry; opts = { scale, beamMode: 'pixel'|'blink', grid }
function render(ctx, st, time, opts) {
  const SC = opts.scale, cv = ctx.canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < W*H; i++) if (st.pf[i]) ctx.drawImage(ATLAS[st.pf[i] & 63], (i & 15) * 16 * SC, (i >> 4) * 16 * SC, 16 * SC, 16 * SC);
  if (opts.beamMode === 'pixel') {
    const f = beamFrame(time);
    for (const p of st.cells) ctx.drawImage(BEAM_GLYPH[f][BEAM_CHAR[p.dir] - 2], p.x * 8 * SC, p.y * 8 * SC, 8 * SC, 8 * SC);
  } else {
    const phase = Math.floor(time / 120);
    for (const p of st.cells) {
      ctx.fillStyle = ((p.x + p.y + phase) & 1) ? PAL[3] : PAL[2];
      const slash = DX[p.dir] === -DY[p.dir], x0 = p.x * 8 * SC, y0 = p.y * 8 * SC;
      for (let r = 0; r < 8; r++) ctx.fillRect(x0 + (slash ? (7 - r) >> 1 : r >> 1) * 2 * SC, y0 + r * SC, 2 * SC, SC);
    }
  }
  const tx = (st.tank & 15) * 16 * SC, ty = (st.tank >> 4) * 16 * SC, half = 8 * SC;
  ctx.save(); ctx.translate(tx + half, ty + half); ctx.rotate([-Math.PI/2, Math.PI, Math.PI/2, 0][st.face]);
  ctx.drawImage(TANK, -half, -half, 16 * SC, 16 * SC); ctx.restore();
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

root.LMGraphics = { PAL, ATLAS, TANK, BEAM_GLYPH, beamFrame, render, renderBeamPreview };
})(window);
