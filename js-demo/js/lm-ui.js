// Lasermania – stavový řádek, titulka a barvy Atari (bez DOM). Sdílí demo i port do blit386 (esm/ui.js).
// Titulka a vítězná obrazovka: originální kód (engine létajících písmen $5DC0, smyčka $6AC8, scroller $6C4C)
// běží v emulátoru 6502 z atari-audio.js nad RAM z dumpu; kreslí se jeho obrazovka a fonty (TitleMachine).
// Stavový řádek: rutiny $9DF5 / $9E43 / $9E77 originálu přepsané do JS (statusbarCells, Equalizer).
(function (root) {
'use strict';

// ---------------- barvy ----------------
// Barvy ověřené ze screenshotů originálu (original-sources/levels); ostatní z modelu PAL palety (YUV),
// parametry nafitované na tyto barvy (odchylka ~10 na kanál): jas 15,3 na stupeň, odstín 147° - 26,5° na hue,
// sytost 0,21. Přesnou paletu emulátoru, ze kterého screenshoty jsou, nemáme.
const KNOWN_RGB = {
  0x00: [0, 0, 0], 0x06: [94, 93, 94], 0x08: [121, 120, 121], 0x0A: [153, 153, 153],
  0x1E: [223, 215, 119], 0x22: [89, 15, 0], 0x4A: [201, 110, 215], 0x7C: [169, 174, 224], 0x96: [46, 105, 156],
  0xC4: [36, 98, 0],
};
function atariRGB(v) {
  v &= 0xfe;
  if (KNOWN_RGB[v]) return KNOWN_RGB[v].slice();
  const hue = v >> 4, y = (v & 15) * 15.3 / 255;
  let u = 0, w = 0;
  if (hue) { const a = (147 - (hue - 1) * 26.5) * Math.PI / 180; u = Math.cos(a) * 0.21; w = Math.sin(a) * 0.21; }
  return [y + 1.140 * w, y - 0.395 * u - 0.581 * w, y + 2.032 * u].map(x => Math.round(255 * Math.min(1, Math.max(0, x))));
}

// ---------------- znaky ANTIC ----------------
// mód 4: znak 4×8 px po 2 bitech, pixel 2× široký -> 8×8 indexů 0 pozadí, 1-3 PF0-PF2, 4 PF3 ("11" u znaku s bitem 7)
function decodeChar4(font, code, out, o, stride) {
  const ch = code & 0x7f, inv = code & 0x80;
  for (let row = 0; row < 8; row++) {
    const b = font[ch * 8 + row];
    for (let px = 0; px < 4; px++) {
      let v = (b >> (6 - 2 * px)) & 3; if (v === 3 && inv) v = 4;
      out[o + row * stride + px * 2] = v; out[o + row * stride + px * 2 + 1] = v;
    }
  }
}
// mód 2 (hires): 8×8 bitů, 1 = bit fontu nastavený
function decodeChar2(font, code, out, o, stride) {
  for (let row = 0; row < 8; row++) {
    const b = font[(code & 0x7f) * 8 + row];
    for (let px = 0; px < 8; px++) out[o + row * stride + px] = (b >> (7 - px)) & 1;
  }
}

// ---------------- stavový řádek ----------------
// 3 řádky ANTIC 2 (40 znaků) na scanline 216 (VRAM $5D40), font $8400 kreslený inverzně: nulový bit = šedá
// panelu (PMG hráči v quad šířce, prioritou pod písmem), jedničkový = černá; mimo panely černá.
const STATUS_COLS = 40, STATUS_ROWS = 3;
const STATUS_PANELS = [   // sloupce panelů (HPOSP0-3 $40,$68,$90,$A0, 32 color clocků) a barva hráče
  { col: 4, cols: 8, color: 0x08 }, { col: 14, cols: 8, color: 0x06 },
  { col: 24, cols: 8, color: 0x0A }, { col: 28, cols: 8, color: 0x0A },
];
const STATUS_FONT_CHARS = 0x5B;   // $00-$5A
const EQ_COL = 28, EQ_WIDTH = 8, EQ_PEAK_HOLD = 0xDC;

// $9E43: blok n znaků od kódu ch na buňce pos (řádek*40 + sloupec), šířka n/2 - 1
function putBlock(cells, ch, n, pos) {
  const w = (n >> 1) - 2 + 1;
  for (let k = 0; k < n; k++) cells[pos + Math.floor(k / w) * STATUS_COLS + (k % w)] = ch + k;
}
// $9DF5 / $9E08: dvě BCD číslice (2×3 znaky) od sloupce col
function putBcd(cells, bcd, col) {
  putBlock(cells, 0x1E + (bcd >> 4) * 6, 6, col);
  putBlock(cells, 0x1E + (bcd & 15) * 6, 6, col + 2);
}
const toBcd = n => ((Math.floor(n / 10) % 10) << 4) | (n % 10);
const bcdSub1 = b => { const n = (b >> 4) * 10 + (b & 15); return toBcd((n + 99) % 100); };

/** Kódy znaků stavového řádku (3×40): ikony ($9E28), životy - 1 a level v BCD ($9DF5), ekvalizér (eq.cells). */
function statusbarCells(livesBcd, levelBcd, eq, out) {
  const cells = out ?? new Uint8Array(STATUS_COLS * STATUS_ROWS);
  cells.fill(0);
  putBlock(cells, 0x03, 9, 4);    // tank
  putBlock(cells, 0x0C, 9, 14);   // šrafovaný čtverec (level)
  putBlock(cells, 0x15, 9, 24);   // nota
  putBcd(cells, bcdSub1(livesBcd), 8);
  putBcd(cells, levelBcd, 18);
  if (eq) for (let r = 0; r < 3; r++) cells.set(eq.cells[r], r * STATUS_COLS + EQ_COL);
  return cells;
}

// $9E77: ekvalizér 3 kanálů CMC (hlasitost $8906-$8908 & 15), voláno z VBI každý snímek po přehrávači.
// Řádek k: vol/2 dílků $02, při lichém $01; špička $5A drží 36 snímků (časovač $DC -> $00), pak spadne.
class Equalizer {
  constructor() { this.peak = [0, 0, 0]; this.timer = [0, 0, 0]; this.cells = [0, 1, 2].map(() => new Uint8Array(EQ_WIDTH)); }
  reset() { this.peak.fill(0); this.timer.fill(0); this.cells.forEach(c => c.fill(0)); }
  step(vols) {
    for (let x = 0; x < 3; x++) {
      const c = this.cells[x], vol = vols[x] & 15, n = vol >> 1;
      c.fill(0);
      let y = this.peak[x];
      this.timer[x] = (this.timer[x] + 1) & 255;
      if (this.timer[x] === 0 || y === 0) this.peak[x] = 0;
      else c[y] = 0x5A;
      for (let k = 0; k < n; k++) c[k] = 0x02;
      c[n] = vol & 1;
      if (n >= this.peak[x]) { this.timer[x] = EQ_PEAK_HOLD; this.peak[x] = n; if (n) c[n] = 0x5A; }
    }
  }
}

// ---------------- titulka v emulátoru ----------------
// RAM $5400-$93FF z dumpu (data.titleMem): fonty $5400/$5800, engine $5DC0, kód titulky $6900-$6FFF, text $7003,
// sinus $75C3, hudba $7700 (přehrávač $8900 se nahradí RTS - hudbu hraje hostitel), font textu $9000.
const TITLE_MEM_BASE = 0x5400;
const ENTRY = { title: 0x6AB7, win: 0x6B92 };   // vítězná: jsr L_6DF1 (init) + smyčka $6B95
// konec: L_6B7D = titulka skončila STARTem (dál by šla hra na $9400); vítězná obrazovka po STARTu skočí na titulku
const EXIT = { title: 0x6B7D, win: 0x6AB7 };
const WAITS = [0x6386, 0x6E92];             // čekání na změnu RTCLOK ($14): konec snímku
// Cykly CPU, které hlavní smyčce zbudou za snímek PAL (35568) po DMA úzkého playfieldu ANTIC 4 (~7300),
// refreshi (~2800), PMG, DLI a VBI s přehrávačem CMC. Odhad: dává ~3 snímky na iteraci animace.
const CYCLES_PER_FRAME = 20000;
// základní počty cyklů 6502 (bez přechodu stránky); neznámé opkódy 2
const CYC = new Uint8Array(256).fill(2);
[[7, [0x00]], [6, [0x01, 0x21, 0x41, 0x61, 0x81, 0xA1, 0xC1, 0xE1, 0x16, 0x36, 0x56, 0x76, 0xD6, 0xF6, 0x0E, 0x2E, 0x4E, 0x6E, 0xCE, 0xEE, 0x20, 0x40, 0x60]],
 [5, [0x11, 0x31, 0x51, 0x71, 0x91, 0xB1, 0xD1, 0xF1, 0x06, 0x26, 0x46, 0x66, 0xC6, 0xE6, 0x6C, 0x9D, 0x99]],
 [7, [0x1E, 0x3E, 0x5E, 0x7E, 0xDE, 0xFE]],
 [4, [0x15, 0x35, 0x55, 0x75, 0x95, 0xB5, 0xD5, 0xF5, 0x0D, 0x2D, 0x4D, 0x6D, 0x8D, 0xAD, 0xCD, 0xED, 0x1D, 0x3D, 0x5D, 0x7D,
      0xBD, 0xDD, 0xFD, 0x19, 0x39, 0x59, 0x79, 0xB9, 0xD9, 0xF9, 0xB6, 0x96, 0xB4, 0x94, 0xAE, 0x8E, 0xBE, 0xAC, 0x8C, 0xBC,
      0xEC, 0xCC, 0x2C, 0x68, 0x28]],
 [3, [0x05, 0x25, 0x45, 0x65, 0x85, 0xA5, 0xC5, 0xE5, 0xA6, 0x86, 0xA4, 0x84, 0xE4, 0xC4, 0x24, 0x4C, 0x48, 0x08]]]
  .forEach(([c, ops]) => ops.forEach(op => { CYC[op] = c; }));

class TitleMachine {
  /** @param {Uint8Array} titleMem RAM $5400-$93FF, @param {'title'|'win'} entry */
  constructor(titleMem, entry = 'title') {
    const m = this.mem = new Uint8Array(65536);
    m.set(titleMem, TITLE_MEM_BASE);
    m[0x8900] = 0x60; m[0x8903] = 0x60;            // CMC init / play -> RTS
    // POKEY: RANDOM $D20A (zrcadlení písmen na vítězné obrazovce) z deterministického LFSR, ostatní $FF
    let rnd = 0x1ff;
    this.cpu = new root.AtariAudio.CPU(m, { read: a => {
      if ((a & 15) !== 10) return 0xff;
      for (let k = 0; k < 8; k++) rnd = (rnd >> 1) | ((((rnd >> 0) ^ (rnd >> 4)) & 1) << 8);
      return rnd & 0xff;
    }, write: () => {} });
    this.exit = EXIT[entry];
    this.frames = 0; this.iterations = 0; this.budget = 0; this.spinning = false;
    this.setInput(false);
    const c = this.cpu; c.s = 0xff; c.push(0xff); c.push(0xfe); c.pc = ENTRY[entry];   // RTS -> $FFFF = konec
  }
  /** START / fire: v originále čte CONSOL $D01F a TRIG0/1 $D010/$D011 (0 = stisknuto). */
  setInput(start) { this.mem[0xD01F] = start ? 6 : 7; this.mem[0xD010] = this.mem[0xD011] = 1; }
  /** Originál opustil titulku (START po ~5,1 s) nebo vítěznou obrazovku – hostitel pokračuje. */
  get done() { return this.cpu.pc === 0xffff; }
  /** Jeden snímek PAL: CPU běží do vyčerpání cyklů nebo do čekání na VBI, pak VBI (RTCLOK). */
  frame() {
    const c = this.cpu, m = this.mem;
    this.budget += CYCLES_PER_FRAME;
    while (this.budget > 0 && c.pc !== 0xffff) {
      if ((c.pc === WAITS[0] || c.pc === WAITS[1]) && c.a === m[0x14]) { this.budget = 0; break; }
      if (c.pc === this.exit) { c.pc = 0xffff; break; }
      if (c.pc === 0x639C) this.iterations++;
      this.budget -= CYC[m[c.pc]];
      c.step();
    }
    if (this.budget > 0) this.budget = 0;
    this.frames++;
    if (++m[0x14] === 256 || m[0x14] === 0) { m[0x14] = 0; m[0x13] = (m[0x13] + 1) & 255; if (!m[0x13]) m[0x12]++; }
  }
  /** Zobrazený buffer: display list ($230; titulka $6A07/$6A50, vítězná $6913/$694D) určí obrazovku $BC00/$BD00,
   *  ZP_F3 font horních řádků (dolní = +4 stránky). */
  get screen() { const dl = this.mem[0x231] << 8 | this.mem[0x230]; return dl === 0x6A50 || dl === 0x694D ? 0xBD00 : 0xBC00; }
  /** Pole 16×8 dlaždic (32×16 znaků, řádky dlaždic po 2 módových řádcích) -> 256×128 indexů 0-4. */
  renderField(out) {
    const m = this.mem, scr = this.screen, upper = m[0xF3] << 8, lower = (m[0xF3] + 4) << 8;
    for (let line = 0; line < 16; line++) {
      const font = m.subarray(line & 1 ? lower : upper), row = scr + (line >> 1) * 32;
      for (let col = 0; col < 32; col++) decodeChar4(font, m[row + col], out, line * 8 * 256 + col * 8, 256);
    }
    return out;
  }
  /** Okno scrolleru: 5 řádků po 32 znacích od $5C00, jemný posun VSCROL = ZP_B9. */
  get scrollRows() { return this.mem.subarray(0x5C00, 0x5C00 + 5 * 32); }
  get vscroll() { return this.mem[0xB9] & 7; }
}

// Rozložení titulky originálu (display list $6A07): scanline -> displej y = scanline - 8, úzký playfield x 32-287.
const TITLE = {
  fieldY: 16, creditsY: [146, 155, 164], scrollY: 180, scrollH: 40, maskY: 212, maskH: 8, copyrightY: 221, x: 32,
  credits: [0x6987, 0x69A7, 0x69C7], copyright: 0x69E7, textFont: 0x9000,
  colors: { field: [0x62, 0x86, 0x1A, 0xA8], text: [0xB2, 0xC4, 0xD6, 0xE8], scroll: [0x24, 0x36, 0xAA, 0x28] },
  startDelayFrames: 256,   // START/fire až po ZP_13 != 0 (~5,1 s)
};

root.LMUi = {
  atariRGB, KNOWN_RGB, decodeChar4, decodeChar2,
  STATUS_COLS, STATUS_ROWS, STATUS_PANELS, STATUS_FONT_CHARS, EQ_COL, EQ_WIDTH, statusbarCells, Equalizer, toBcd,
  TITLE_MEM_BASE, CYCLES_PER_FRAME, TitleMachine, TITLE,
};
if (typeof module !== 'undefined') module.exports = root.LMUi;
})(typeof window !== 'undefined' ? window : globalThis);
