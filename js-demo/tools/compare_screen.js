// Porovná snímek hrací plochy se screenshotem originálu (original-sources/levels/atari*.tiff).
//   node tools/compare_screen.js <level> [capture.png] [--diff out.png]
// Reference = mapa levelu po createState (s východem a emitorem) z lm-tiles.js (stejné indexy jako js-demo), umístěná jako v portu.
// Výřez screenshotu 320×240 od x=32 (hrací plocha 256×192 na (32,12), jako v originále).
// Maska očekávaných rozdílů: tank, buňky paprsku, stavový řádek. Exit 1 při rozdílu mimo masku.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import LMCore from '../esm/core.js';
import LMTiles from '../esm/tiles.js';

export const SCREEN_W = 320, SCREEN_H = 240, PF_X = 32, PF_Y = 12, CROP_X = 32, STATUS_Y = 204;
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
export function referenceFrame(level) {
  const tiles = LMTiles.decodeTiles(LMTiles.b64(DATA.font1), LMTiles.b64(DATA.font2));
  const pf = LMTiles.renderPlayfield(tiles, LMCore.createState(level).pf), rgbPal = LMTiles.PAL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const rgb = new Uint8Array(SCREEN_W * SCREEN_H * 3);   // mimo hrací plochu černá (pozadí)
  for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) rgb.set(rgbPal[pf[y * 256 + x]], ((PF_Y + y) * SCREEN_W + PF_X + x) * 3);
  return { width: SCREEN_W, height: SCREEN_H, rgb };
}

export function screenshotFrame(level) {
  const n = level.n ?? 0, file = new URL(`original-sources/levels/atari${String(n + 2).padStart(3, '0')}.tiff`, ROOT);
  const img = readTiff(fs.readFileSync(file)), rgb = new Uint8Array(SCREEN_W * SCREEN_H * 3);
  for (let y = 0; y < SCREEN_H; y++) rgb.set(img.rgb.subarray((y * img.width + CROP_X) * 3, (y * img.width + CROP_X + SCREEN_W) * 3), y * SCREEN_W * 3);
  return { width: SCREEN_W, height: SCREEN_H, rgb };
}

// 1 = očekávaný rozdíl (tank, paprsek, stavový řádek a vše pod hrací plochou)
export function expectedMask(level) {
  const m = new Uint8Array(SCREEN_W * SCREEN_H), st = LMCore.createState(level);
  LMCore.runLaser(st);
  const box = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) m.fill(1, y * SCREEN_W + x0, y * SCREEN_W + x0 + w); };
  box(PF_X + (st.tank & 15) * 16, PF_Y + (st.tank >> 4) * 16, 16, 16);
  for (const c of st.cells) box(PF_X + c.x * 8, PF_Y + c.y * 8, 8, 8);
  box(0, STATUS_Y, SCREEN_W, SCREEN_H - STATUS_Y);
  return m;
}

export function diff(a, b, mask) {
  const r = { outside: 0, inside: 0 };
  for (let i = 0; i < a.width * a.height; i++) {
    const o = i * 3;
    if (a.rgb[o] !== b.rgb[o] || a.rgb[o + 1] !== b.rgb[o + 1] || a.rgb[o + 2] !== b.rgb[o + 2]) r[mask?.[i] ? 'inside' : 'outside']++;
  }
  return r;
}

// rozdílový obrázek: shoda ztmavená, rozdíl mimo masku červeně, uvnitř masky žlutě
function diffImage(a, b, mask) {
  const rgb = new Uint8Array(a.rgb.length);
  for (let i = 0; i < a.width * a.height; i++) {
    const o = i * 3, same = a.rgb[o] === b.rgb[o] && a.rgb[o + 1] === b.rgb[o + 1] && a.rgb[o + 2] === b.rgb[o + 2];
    rgb.set(same ? [a.rgb[o] >> 2, a.rgb[o + 1] >> 2, a.rgb[o + 2] >> 2] : mask[i] ? [255, 220, 0] : [255, 0, 0], o);
  }
  return { width: a.width, height: a.height, rgb };
}

const DATA = JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), di = args.indexOf('--diff'), diffFile = di >= 0 ? args.splice(di, 2)[1] : null;
  const here = f => path.resolve(process.env.INIT_CWD ?? process.cwd(), f);   // npm run z kořene běží v js-demo/
  const [levelArg, captureFile] = args, level = DATA.levels[Number(levelArg ?? 0)];
  const ref = referenceFrame(level), shot = screenshotFrame(level), mask = expectedMask(level);
  const rows = [['reference vs. screenshot', diff(ref, shot, mask)]];
  let cap = null;
  if (captureFile) {
    cap = readPng(fs.readFileSync(here(captureFile)));
    if (cap.width !== SCREEN_W || cap.height !== SCREEN_H) { console.error(`capture má ${cap.width}×${cap.height}, čekám ${SCREEN_W}×${SCREEN_H}`); process.exit(1); }
    rows.push(['capture vs. reference', diff(cap, ref, null)], ['capture vs. screenshot', diff(cap, shot, mask)]);
  }
  for (const [name, r] of rows) console.log(`${name.padEnd(26)} mimo masku ${String(r.outside).padStart(6)}   v masce ${r.inside}`);
  if (diffFile) { writePng(here(diffFile), diffImage(cap ?? ref, shot, mask)); console.log(`rozdíl uložen: ${here(diffFile)}`); }
  process.exit(rows.some(([, r]) => r.outside) ? 1 : 0);
}
