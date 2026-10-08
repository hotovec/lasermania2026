// Lasermania – herní logika (bez DOMu). Port z Lasermania.asm (L.K. Avalon 1990, disassembly MatoSimi).
// Funguje v prohlížeči (window.LMCore) i v Node (require('./lm-core.js')).
(function (root) {
'use strict';

const W = 16, H = 12;   // hrací plocha v dlaždicích; dlaždice = 2×2 znaky

// element_types ($5D00): bit7 $80 odráží, bit6 $40 posuvné, bit5 $20 východ, bit4 $10 průjezdné,
// bit3 $08 kapsle, bit2 $04 "inverse" barva, bit1 $02 animace přes časovač, bit0 $01 rutina při zásahu
const TYPES = [
  0x00,0x00,0x00,0x44,0x80,0x80,0x80,0x80,0x04,0x04,0x04,0x04,0x04,0x80,0x04,0x04,
  0x04,0x04,0x04,0x04,0x00,0x00,0x00,0x00,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x04,
  0xC4,0x0C,0x01,0x86,0x01,0x01,0x05,0x01,0x14,0x14,0x06,0x02,0x02,0x02,0x02,0x02,
  0x04,0x04,0x04,0x04,0x24,0x01,0x02,0x02,0x02,0x14,0x14,0x14,0x14,0x10,0x00,0x44,
];
// 8 směrů = 4 diagonály × 2 fáze (kterou hranici dlaždice paprsek překročí dřív)
const DX = [-1, 1, 1, 1, 1,-1,-1,-1];                               // L_A3C8
const DY = [-1,-1,-1, 1, 1, 1, 1,-1];                               // L_A3B8/C0
const START = [[1,0],[0,0],[1,1],[1,0],[0,1],[1,1],[0,0],[0,1]];    // L_A390: startovní znak v dlaždici
const REFLECT = [[2,5],[7,4],[4,7],[1,6],[6,1],[3,0],[0,3],[5,2]];  // L_A398: [směr][krok & 1]
const ARROW = ['↖','↗','↗','↘','↘','↙','↙','↖'];
const FIRST = ['nahoru','nahoru','doprava','doprava','dolů','dolů','doleva','doleva'];
const T = { BOX:0x03, WALL:0x0B, STONE:0x0D, EMITTER:0x10, DOOR:0x11, MIRROR:0x20, CAPS:0x21, DOORCTL:0x23,
            AIM:0x24, BREAK:0x25, RELAY:0x26, EXIT:0x30, EXIT_OPEN:0x34, SENSOR:0x35 };
const NAME = { 0x03:'box', 0x0D:'kámen', 0x10:'emitor', 0x11:'dveře', 0x12:'dveře', 0x13:'dveře', 0x20:'zrcadlo', 0x21:'kapsle',
  0x22:'pojistka', 0x23:'ovl. dveří', 0x27:'bomba', 0x2A:'výbuch', 0x2B:'výbuch', 0x2C:'výbuch', 0x2D:'výbuch', 0x2E:'výbuch', 0x2F:'výbuch', 0x24:'ovl. zaměření', 0x25:'přerušovač', 0x26:'relé', 0x35:'senzor', 0x36:'senzor', 0x37:'senzor', 0x38:'senzor' };

// level = { pf: 192 kódů dlaždic, meta: 21 bajtů za mapou (viz README) }
function createState(level) {
  const m = level.meta;
  const st = { pf: Uint8Array.from(level.pf), timers: new Uint8Array(W*H), emitter: m[16], dir: m[17], tank: m[18], face: 3,
               exit: m[19], switches: m.slice(0, 4), doors: m.slice(4, 8), phase: [0,0,0,0], relays: m.slice(8, 16),
               pause: 0, limit: Infinity, won: false, events: [], cells: [], segs: [], hits: new Set(), bumps: new Set() };
  if (st.exit < W*H) st.pf[st.exit] = T.EXIT;
  if (st.emitter < W*H) st.pf[st.emitter] = T.EMITTER; else { st.emitter = 255; st.dir = 0; st.noLaser = true; }   // level 05 nemá emitor
  return st;
}

// ---- laser: port run_laser ($A016) ----
function runLaser(st) {
  st.cells = []; st.segs = [];
  if (st.pause > 0) { st.pause--; return; }               // ZP_A8: dočasný přerušovač
  if (st.emitter === 255) return;
  if (st.limit === 0) { explode(st, st.emitter); st.emitter = 255; st.events.push('laserDead'); return; }   // L_A166: paprsek dohořel, emitor vybuchne
  if (st.limit !== Infinity) st.limit--;                    // ZP_B2/B3 se každý krok zmenšuje
  const occupied = new Set(), queue = [{ tile: st.emitter, dir: st.dir }];
  for (let q = 0; q < queue.length && queue.length < 255; q++) trace(st, queue[q], queue, occupied);
}
function trace(st, seg, queue, occupied) {
  const { tile, dir } = seg;
  const info = { tile, dir, n: 0, end: 'okraj' }; st.segs.push(info);
  let x = (tile & 15) * 2 + START[dir][0], y = (tile >> 4) * 2 + START[dir][1];
  for (let n = 1; ; n++) {
    x += DX[dir]; y += DY[dir];
    if (x < 0 || x >= 2*W || y < 0 || y >= 2*H) return;
    const t = (y >> 1) * W + (x >> 1), key = y * 64 + x;
    if (st.pf[t] === 0 && !occupied.has(key)) {
      if (st.cells.length >= st.limit) { info.end = 'dohořívá'; return; }   // L_A148: délka omezena
      st.cells.push({ x, y, dir }); occupied.add(key); info.n++; continue; }
    let code = st.pf[t];
    if (code >= 0x20) {
      if (TYPES[code] & 0x02) { if (!st.timers[t]) st.timers[t] = 3; }   // L_A171: naplánuj animaci
      else element(st, code, t, dir, queue);
    }
    st.hits.add(t);                                           // bit7 v playfieldu: zasaženo v tomto kroku
    code = st.pf[t];
    if (TYPES[code] & 0x80) { const nd = REFLECT[dir][n & 1]; queue.push({ tile: t, dir: nd }); info.end = 'odraz: ' + (NAME[code] || 'zeď') + ' → ' + nd; }
    else info.end = code === 0 ? 'vlastní stopa' : 'pohlceno: ' + (NAME[code] || 'zeď');
    return;
  }
}
// L_A30A: dlaždice se změní na výbuch $2B a naplánuje se animace $2B -> $2C -> ... -> $2F -> prázdno
function explode(st, i) { st.events.push('explode'); st.pf[i] = 0x2B; if (!st.timers[i]) st.timers[i] = 3; }

function element(st, code, t, dir, queue) {                  // element_routine_lookup
  switch (code) {
    case 0x22: st.limit = st.cells.length; explode(st, t); break;        // L_A341: paprsek začne dohořívat
    case 0x27: {                                                          // l_a2e2: laserová bomba
      explode(st, t);
      for (let k = 0; k < 1000; k++) {                                    // L_A2E5: náhodná dlaždice
        const x = (Math.random() * 256) & 0xBF, c = st.pf[x] & 0x7F;
        if (!c || (c >= 0x10 && c < 0x14) || c === 0x26 || (c >= 0x30 && c < 0x39 && c !== 0x35)) continue;
        explode(st, x); break;
      }
      break;
    }
    case T.AIM: st.dir = (st.dir + 1) & 7; st.events.push('aim'); break;
    case T.BREAK: st.pause = 32; st.pf[t] = 0; st.events.push('breaker'); break;
    case T.RELAY: { const i = st.relays.indexOf(t); if (i >= 0 && st.relays[i ^ 4] !== 255) queue.push({ tile: st.relays[i ^ 4], dir }); break; }
    case T.SENSOR: st.pf[t] = 0x36; st.events.push('sensor'); break;
  }
}
// L_A1BE: dlaždice s běžícím časovačem (zničení senzoru, ovladač dveří L_A217)
function animate(st, code, i) {
  if (code === 0x2A || code === 0x2B || code === 0x2D || code === 0x2E) st.pf[i] = code + 1;   // výbuch
  else if (code === 0x2C) { st.timers[i] = 4; st.pf[i] = 0x2D; }
  else if (code === 0x2F) st.pf[i] = 0;
  else if (code === 0x36 || code === 0x37) st.pf[i] = code + 1;
  else if (code === 0x38) { st.pf[i] = 0; st.events.push('gone'); }
  else if (code === T.DOORCTL) {
    const k = st.switches.indexOf(i); if (k < 0) return;
    const door = st.doors[k];
    if (st.hits.has(i)) {
      st.timers[i] = 4;
      if (st.phase[k] < 3) { st.events.push('door'); st.phase[k]++; const v = st.phase[k] + 0x11; st.pf[door] = v >= 0x14 ? 0 : v; }
    } else if (st.phase[k] > 0) { st.events.push('door'); st.phase[k]--; st.pf[door] = st.phase[k] + 0x11; }
  }
}
const count = (st, f) => st.pf.reduce((a, c) => a + (f(c) ? 1 : 0), 0);

// jeden herní krok (originál každých 8 snímků = 160 ms); vrací počty pro stavový řádek
function tick(st) {
  st.hits = new Set(st.bumps); st.bumps.clear();
  runLaser(st);
  for (let i = 0; i < W*H; i++) if (st.timers[i]) { animate(st, st.pf[i], i); st.timers[i]--; }
  const sensors = count(st, c => c >= 0x35 && c <= 0x38), caps = count(st, c => c === T.CAPS);
  if (sensors === 0 && caps === 0 && st.exit < W*H && st.pf[st.exit] >= T.EXIT && st.pf[st.exit] < T.EXIT_OPEN) { st.pf[st.exit]++; if (st.pf[st.exit] === T.EXIT_OPEN) st.events.push('exitOpen'); }
  return { sensors, caps };
}

// události pro zvukové efekty: st.events (step, push, pickup, bump, door, aim, sensor, gone,
// explode, breaker, exitOpen, laserDead, win); hra je po každém tick/move vybere a vyprázdní
function takeEvents(st) { const e = st.events; st.events = []; return e; }

// pohyb tanku o jednu dlaždici; vrací 'win' při vjezdu do otevřeného východu
function move(st, dx, dy) {
  if (st.won) return null;
  st.face = dx > 0 ? 3 : dx < 0 ? 1 : dy < 0 ? 0 : 2;
  const nx = (st.tank & 15) + dx, ny = (st.tank >> 4) + dy;
  if (nx < 0 || nx >= W || ny < 0 || ny >= H) return null;
  const i = ny * W + nx, t = st.pf[i], ty = TYPES[t];
  if (t === 0 || (ty & 0x10 && t !== T.EXIT_OPEN)) { st.tank = i; st.events.push('step'); }
  else if (ty & 0x08) { st.pf[i] = 0; st.tank = i; st.limit = Infinity; st.events.push('pickup'); }    // kapsle (obnoví délku paprsku)
  else if (t === T.EXIT_OPEN) { st.tank = i; st.won = true; st.events.push('win'); return 'win'; }
  else if (t === T.DOORCTL) { st.events.push('bump'); st.bumps.add(i); if (!st.timers[i]) st.timers[i] = 3; }   // náraz otevírá dveře
  else if (ty & 0x40) {                                                       // posuvné
    const bx = nx + dx, by = ny + dy;
    if (bx < 0 || bx >= W || by < 0 || by >= H) return null;
    const b = by * W + bx;
    if (st.pf[b] === 0) { st.pf[b] = t; st.pf[i] = 0; st.tank = i; st.events.push('push'); }
  }
  return null;
}

// editor: relé párujeme podle pořadí na mapě do slotů i <-> i^4 (jako tabulka L_BFB8)
function pairRelays(st) {
  const list = []; st.pf.forEach((t, i) => { if (t === T.RELAY) list.push(i); });
  st.relays = [255,255,255,255,255,255,255,255];
  list.slice(0, 8).forEach((pos, k) => { st.relays[(k >> 1) + (k & 1) * 4] = pos; });
}

// dekódování levelu z levels.xex (načteno na $1A00): RLE + 21 bajtů metadat
function decodeLevel(bytes, n, base = 0x1a00) {
  const p = ((bytes[0x80 + n] << 8) | bytes[n]) - base, pf = [];
  let y = 1;
  while (pf.length < W*H) {
    const b = bytes[p + y];
    if (b & 0x80) { for (let k = 0; k <= bytes[p + y + 1]; k++) pf.push(b & 0x7f); y += 2; }
    else { pf.push(b); y++; }
  }
  return { pf: pf.slice(0, W*H), meta: Array.from(bytes.slice(p + y, p + y + 21)) };
}

root.LMCore = { W, H, TYPES, DX, DY, START, REFLECT, ARROW, FIRST, T, NAME,
                createState, runLaser, tick, move, takeEvents, pairRelays, decodeLevel };
if (typeof module !== 'undefined') module.exports = root.LMCore;
})(typeof window !== 'undefined' ? window : globalThis);
