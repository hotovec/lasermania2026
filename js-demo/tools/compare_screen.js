// Porovná snímek hrací plochy se screenshotem originálu (original-sources/levels/atari*.tiff).
//   node tools/compare_screen.js <level> [capture.png] [--diff out.png]
//   node tools/compare_screen.js --all [captureDir] [--diff-dir dir]     (captureDir/l00.png … l52.png)
// Reference = mapa levelu po createState (s východem a emitorem) + tank z lm-tiles.js (stejné indexy jako js-demo),
// umístěná jako v portu. Výřez screenshotu 320×240 od x=32 (hrací plocha 256×192 na (32,12), jako v originále).
// Screenshot nemusí být ze startu: data/screens.json říká, po kolika herních krocích vznikl, v jaké fázi je animace
// paprsku a kolik buněk paprsku originál stihl nakreslit (double buffer); reference i snímek portu se dělají ve
// stejném stavu (port přes __game.load(n, kroky, fáze)). Políčka `tiles` se liší z jiného důvodu.
// Stavový řádek: reference ho kreslí s životy n + 5 (hra od levelu 0) a prázdným ekvalizérem; maskuje se
// ekvalizér (podle hudby) a u screenshotů od levelu 12 číslice životů a horní levý roh noty (screenshoty jsou
// zřejmě z upravené verze: jiná hodnota životů a jiný glyf ve sloupcích 24-25 řádku 0). U snímku
// portu se maskuje nedokreslený konec paprsku. Snímek portu musí s referencí souhlasit vždy (mimo ekvalizér).
// Exit 1 při jiném rozdílu.
//   node tools/compare_screen.js --search <level>     najde stav screenshotu (kroky, fáze, počet buněk paprsku)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import LMCore from '../esm/core.js';
import LMTiles from '../esm/tiles.js';
import LMUi from '../esm/ui.js';

export const SCREEN_W = 320, SCREEN_H = 240, PF_X = 32, PF_Y = 12, CROP_X = 32, STATUS_Y = 208;
const EQ_X = LMUi.EQ_COL * 8, LIVES_X = 8 * 8, NOTE_X = 24 * 8, LIVES_RELIABLE = 12;   // screenshoty od levelu 12: jiné životy
const ROOT = new URL('../../', import.meta.url);

// ---- minimální čtečky: TIFF (nekomprimované RGB 8 bit, strips) a PNG (8 bit RGB/RGBA, bez prokládání) ----
export function readTiff(buf) {
  const le = buf.toString('latin1', 0, 2) === 'II';
  const u16 = o => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = o => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const ifd = u32(4), tags = {};
  for (let i = 0, n = u16(ifd); i < n; i++) {
    const e = ifd + 2 + i * 12, type = u16(e + 2), count = u32(e + 4), size = type === 3 ? 2 : 4;
    if (type !== 3 && type !== 4) continue;   // jen SHORT/LONG (ICC profil apod. přeskočit)
    const at = count * size > 4 ? u32(e + 8) : e + 8;
    tags[u16(e)] = Array.from({ length: count }, (_, k) => (size === 2 ? u16(at + k * 2) : u32(at + k * 4)));
  }
  const width = tags[256][0], height = tags[257][0];
  if ((tags[259]?.[0] ?? 1) !== 1 || tags[277][0] < 3 || tags[258].some(b => b !== 8)) throw new Error('TIFF: čekám nekomprimované RGB 8 bit');
  const spp = tags[277][0], raw = Buffer.concat(tags[273].map((o, k) => buf.subarray(o, o + tags[279][k])));
  return toRgb(width, height, raw, spp);
}

export function readPng(buf) {
  let p = 8, width, height, depth, ctype, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { width = d.readUInt32BE(0); height = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; if (d[12]) throw new Error('PNG: prokládání není podporováno'); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = { 2: 3, 6: 4 }[ctype];
  if (depth !== 8 || !bpp) throw new Error('PNG: čekám RGB/RGBA 8 bit');
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[o - stride + x] : 0, c = x >= bpp && y ? out[o - stride + x - bpp] : 0;
      const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[o + x] = (raw[src + x] + pred) & 255;
    }
  }
  return toRgb(width, height, out, bpp);
}

function toRgb(width, height, raw, spp) {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) rgb.set(raw.subarray(i * spp, i * spp + 3), i * 3);
  return { width, height, rgb };
}

export function writePng(file, { width, height, rgb }) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  const crc = b => { let c = ~0; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (type, d) => { const t = Buffer.concat([Buffer.from(type, 'latin1'), d]);
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(t)); return Buffer.concat([l, t, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// ---- reference, screenshot, maska ----
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const REF_PAL = [...LMTiles.PAL, ...LMTiles.TANK_PAL].map(hexRgb);   // indexy renderPlayfield: 0–4 dlaždice a paprsek, 5–6 tank
let TILES = null, TANK_PX = null, BEAM_PX = null;

// stav levelu po `ticks` herních krocích; při 0 krocích mapa ze startu (runLaser umí mapu změnit, např. výbuch
// v levelu 32) a paprsek (st.cells) z runLaser na samostatném stavu
export function levelState(level, ticks = 0) {
  const st = LMCore.createState(level);
  for (let k = 0; k < ticks; k++) LMCore.tick(st);
  if (!ticks) { const beam = LMCore.createState(level); LMCore.runLaser(beam); st.cells = beam.cells; }
  return st;
}

// snímek ze stavu: dlaždice, paprsek (prvních `beamCells` buněk ve fázi `beamPhase`), tank – jako port
let STATUS_FONT;
// stavový řádek jako v portu: panely, inverzní font $8400, životy n + 5 a level n, ekvalizér prázdný
function renderStatus(rgb, level) {
  STATUS_FONT ??= LMTiles.b64(DATA.statusFont);
  const cells = LMUi.statusbarCells(LMUi.toBcd((level + 5) % 100), LMUi.toBcd(level % 100), null), g = new Uint8Array(64);
  for (const p of LMUi.STATUS_PANELS) {
    const c = LMUi.atariRGB(p.color);
    for (let y = 0; y < 24; y++) for (let x = p.col * 8; x < (p.col + p.cols) * 8; x++) rgb.set(c, ((STATUS_Y + y) * SCREEN_W + x) * 3);
  }
  for (let i = 0; i < cells.length; i++) {
    LMUi.decodeChar2(STATUS_FONT, cells[i], g, 0, 8);
    const x0 = (i % 40) * 8, y0 = STATUS_Y + Math.floor(i / 40) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g[y * 8 + x]) rgb.set([0, 0, 0], ((y0 + y) * SCREEN_W + x0 + x) * 3);
  }
}

export function renderState(st, beamPhase = 0, beamCells = Infinity, level = 0) {
  TILES ??= LMTiles.decodeTiles(LMTiles.b64(DATA.font1), LMTiles.b64(DATA.font2));
  TANK_PX ??= LMTiles.decodeTank(LMTiles.b64(DATA.tankPmg));
  BEAM_PX ??= LMTiles.decodeBeam();
  const pf = LMTiles.renderPlayfield(TILES, st.pf, { pos: st.tank, frame: LMTiles.tankFrame(st.face), pixels: TANK_PX },
    { cells: st.cells.slice(0, beamCells), phase: beamPhase, glyphs: BEAM_PX });
  const rgb = new Uint8Array(SCREEN_W * SCREEN_H * 3);   // mimo hrací plochu černá (pozadí)
  for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) rgb.set(REF_PAL[pf[y * 256 + x]], ((PF_Y + y) * SCREEN_W + PF_X + x) * 3);
  renderStatus(rgb, level);
  return { width: SCREEN_W, height: SCREEN_H, rgb };
}

export function referenceFrame(level, { ticks = 0, beamPhase = 0, beamCells = Infinity } = {}) {
  return renderState(levelState(level, ticks), beamPhase, beamCells, level.n ?? 0);
}

export function screenshotFrame(level) {
  const n = level.n ?? 0, file = new URL(`original-sources/levels/atari${String(n + 2).padStart(3, '0')}.tiff`, ROOT);
  const img = readTiff(fs.readFileSync(file)), rgb = new Uint8Array(SCREEN_W * SCREEN_H * 3);
  for (let y = 0; y < SCREEN_H; y++) rgb.set(img.rgb.subarray((y * img.width + CROP_X) * 3, (y * img.width + CROP_X + SCREEN_W) * 3), y * SCREEN_W * 3);
  return { width: SCREEN_W, height: SCREEN_H, rgb };
}

const same = (a, b, o) => a.rgb[o] === b.rgb[o] && a.rgb[o + 1] === b.rgb[o + 1] && a.rgb[o + 2] === b.rgb[o + 2];
const tileOf = i => { const x = (i % SCREEN_W) - PF_X, y = Math.floor(i / SCREEN_W) - PF_Y;
  return x >= 0 && x < 256 && y >= 0 && y < 192 ? (y >> 4) * 16 + (x >> 4) : -1; };

// 1 = očekávaný rozdíl: ekvalizér; se `screenshot` (level n) u levelů od 12 číslice životů a roh noty; s `full`/`partial`
// navíc pixely, kde se plný a nedokreslený paprsek liší (pro snímek portu vs. screenshot)
export function expectedMask({ full, partial, screenshot = null } = {}) {
  const m = new Uint8Array(SCREEN_W * SCREEN_H);
  const box = (x0, w, h = 24) => { for (let y = STATUS_Y; y < STATUS_Y + h; y++) m.fill(1, y * SCREEN_W + x0, y * SCREEN_W + x0 + w); };
  box(EQ_X, LMUi.EQ_WIDTH * 8);
  if (screenshot !== null && screenshot >= LIVES_RELIABLE) { box(LIVES_X, 32); box(NOTE_X, 16, 8); }
  if (full && partial) for (let i = 0; i < STATUS_Y * SCREEN_W; i++) if (!same(full, partial, i * 3)) m[i] = 1;
  return m;
}

// rozdíly: mimo masku / v masce / povolené výjimkou (políčka `allowed`); `tiles` = políčka s nepovoleným rozdílem
export function diff(a, b, mask, allowed = new Set()) {
  const r = { outside: 0, inside: 0, allowed: 0, tiles: new Set() };
  for (let i = 0; i < a.width * a.height; i++) {
    if (same(a, b, i * 3)) continue;
    if (mask?.[i]) { r.inside++; continue; }
    const t = tileOf(i);
    if (allowed.has(t)) { r.allowed++; continue; }
    r.outside++; r.tiles.add(t);
  }
  return r;
}

// rozdílový obrázek: shoda ztmavená, nepovolený rozdíl červeně, v masce žlutě, výjimka modře
function diffImage(a, b, mask, allowed = new Set()) {
  const rgb = new Uint8Array(a.rgb.length);
  for (let i = 0; i < a.width * a.height; i++) {
    const o = i * 3;
    rgb.set(same(a, b, o) ? [a.rgb[o] >> 2, a.rgb[o + 1] >> 2, a.rgb[o + 2] >> 2]
      : mask[i] ? [255, 220, 0] : allowed.has(tileOf(i)) ? [60, 140, 255] : [255, 0, 0], o);
  }
  return { width: a.width, height: a.height, rgb };
}

const DATA = JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8'));
const SCREENS = JSON.parse(fs.readFileSync(new URL('../data/screens.json', import.meta.url), 'utf8')).levels;
// stav na screenshotu levelu n (neuvedený level = start, fáze 0, celý paprsek)
export const screenState = n => ({ ticks: SCREENS[n]?.ticks ?? 0, beamPhase: SCREENS[n]?.beamPhase ?? 0,
  beamCells: SCREENS[n]?.beamCells ?? Infinity });
export const allowedTiles = n => new Set((SCREENS[n]?.tiles ?? []).map(([c, r]) => r * 16 + c));

function compareLevel(n, captureFile, diffFile) {
  const level = DATA.levels[n], { ticks, beamPhase, beamCells } = screenState(n), allowed = allowedTiles(n);
  const full = referenceFrame(level, { ticks, beamPhase }), partial = referenceFrame(level, { ticks, beamPhase, beamCells });
  const shot = screenshotFrame(level), statusMask = expectedMask({ screenshot: n });
  const tailMask = expectedMask({ full, partial, screenshot: n });
  const rows = [['reference vs. screenshot', diff(partial, shot, statusMask, allowed)]];
  let cap = null;
  if (captureFile) {
    cap = readPng(fs.readFileSync(captureFile));
    if (cap.width !== SCREEN_W || cap.height !== SCREEN_H) throw new Error(`${captureFile}: ${cap.width}×${cap.height}, čekám ${SCREEN_W}×${SCREEN_H}`);
    rows.push(['capture vs. reference', diff(cap, full, expectedMask())], ['capture vs. screenshot', diff(cap, shot, tailMask, allowed)]);
  }
  if (diffFile) writePng(diffFile, cap ? diffImage(cap, shot, tailMask, allowed) : diffImage(partial, shot, statusMask, allowed));
  return rows;
}

// najde stav screenshotu: nejmenší počet kroků, fázi a počet nakreslených buněk paprsku s nejmenším rozdílem
export function searchScreen(n, maxTicks = 300) {
  const level = DATA.levels[n], shot = screenshotFrame(level), mask = expectedMask({ screenshot: n }), allowed = allowedTiles(n);
  let best = null;
  for (let ticks = 0; ticks <= maxTicks; ticks++) {
    const st = levelState(level, ticks);
    // mapa a tank bez paprsku: pixely buněk paprsku ignorovat (zjistí, jestli má smysl zkoušet fáze a délky)
    const noBeam = renderState(st, 0, 0, n), beamMask = mask.slice();
    for (const c of st.cells) for (let y = 0; y < 8; y++) beamMask.fill(1, (PF_Y + c.y * 8 + y) * SCREEN_W + PF_X + c.x * 8, (PF_Y + c.y * 8 + y) * SCREEN_W + PF_X + c.x * 8 + 8);
    const mapDiff = diff(noBeam, shot, beamMask, allowed).outside;
    if (best && mapDiff > best.diff) continue;
    for (let beamPhase = 0; beamPhase < 4; beamPhase++) for (let cells = st.cells.length; cells >= 0; cells--) {
      const d = diff(renderState(st, beamPhase, cells, n), shot, mask, allowed).outside;
      if (!best || d < best.diff) best = { ticks, beamPhase, beamCells: cells, of: st.cells.length, diff: d };
      if (!d) return best;
    }
  }
  return best;
}

const fmtTiles = (r, pf) => [...r.tiles].filter(t => t >= 0).sort((x, y) => x - y)
  .map(t => `[${t & 15},${t >> 4}]=$${pf[t].toString(16).padStart(2, '0')}`).join(' ') + (r.tiles.has(-1) ? ' mimo plochu' : '');

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
  const here = f => f && path.resolve(process.env.INIT_CWD ?? process.cwd(), f);   // npm run z kořene běží v js-demo/
  const diffFile = here(opt('--diff')), diffDir = here(opt('--diff-dir'));
  let failed = false;
  if (args[0] === '--search') {
    const r = searchScreen(Number(args[1]));
    console.log(`level ${args[1]}: kroky ${r.ticks}, fáze ${r.beamPhase}, buněk paprsku ${r.beamCells} z ${r.of}, rozdíl ${r.diff} px`);
    failed = r.diff > 0;
  } else if (args[0] === '--all') {
    const capDir = here(args[1]);
    if (diffDir) fs.mkdirSync(diffDir, { recursive: true });
    for (let n = 0; n < DATA.levels.length; n++) {
      const id = 'l' + String(n).padStart(2, '0'), { ticks, beamPhase, beamCells } = screenState(n);
      const rows = compareLevel(n, capDir && path.join(capDir, id + '.png'), diffDir && path.join(diffDir, id + '-diff.png'));
      const pf = levelState(DATA.levels[n], ticks).pf, bad = rows.filter(([, r]) => r.outside);
      failed ||= bad.length > 0;
      const note = `fáze ${beamPhase}` + (ticks ? `, po ${ticks} krocích` : '') + (beamCells !== Infinity ? `, paprsek ${beamCells} buněk` : '')
        + (rows[0][1].allowed ? `, výjimka ${rows[0][1].allowed} px` : '');
      console.log(`${id} ${bad.length ? 'ROZDÍL' : 'ok    '} (${note})` + bad.map(([name, r]) => `\n     ${name}: ${r.outside} px ${fmtTiles(r, pf)}`).join(''));
    }
  } else {
    const n = Number(args[0] ?? 0), rows = compareLevel(n, here(args[1]), diffFile);
    for (const [name, r] of rows) console.log(`${name.padEnd(26)} mimo masku ${String(r.outside).padStart(6)}   v masce ${r.inside}   výjimka ${r.allowed}`);
    if (diffFile) console.log(`rozdíl uložen: ${diffFile}`);
    failed = rows.some(([, r]) => r.outside);
  }
  process.exit(failed ? 1 : 0);
}
