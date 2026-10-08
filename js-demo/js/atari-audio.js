// Minimal 6502 CPU + POKEY for playing the original Lasermania CMC music.
// The CMC player code ($8900) and music data ($7700) come from the game's memory dump.
(function (root) {
'use strict';

// ---------------- 6502 ----------------
function CPU(mem, io) {
  this.m = mem; this.io = io; this.a = 0; this.x = 0; this.y = 0; this.s = 0xff; this.p = 0x24; this.pc = 0;
  this.unknown = 0;
}
CPU.prototype.rd = function (a) { return (a & 0xff00) === 0xd200 ? this.io.read(a) : this.m[a]; };
CPU.prototype.wr = function (a, v) { if ((a & 0xff00) === 0xd200) this.io.write(a, v); else this.m[a] = v & 0xff; };
CPU.prototype.call = function (addr, a, x, y) {
  this.a = a & 0xff; this.x = x & 0xff; this.y = y & 0xff;
  this.push(0xff); this.push(0xfe); this.pc = addr;          // RTS -> $FFFF = stop
  for (let n = 0; n < 200000 && this.pc !== 0xffff; n++) this.step();
};
CPU.prototype.push = function (v) { this.m[0x100 | this.s] = v & 0xff; this.s = (this.s - 1) & 0xff; };
CPU.prototype.pull = function () { this.s = (this.s + 1) & 0xff; return this.m[0x100 | this.s]; };
CPU.prototype.nz = function (v) { v &= 0xff; this.p = (this.p & 0x7d) | (v & 0x80) | (v ? 0 : 2); return v; };
CPU.prototype.step = function () {
  const m = this.m, op = m[this.pc]; let pc = (this.pc + 1) & 0xffff;
  const b1 = m[pc], w = b1 | (m[(pc + 1) & 0xffff] << 8);
  const C = this.p & 1;
  // addressing helpers
  const zp = () => { pc = (pc + 1) & 0xffff; return b1; };
  const zpx = () => { pc = (pc + 1) & 0xffff; return (b1 + this.x) & 0xff; };
  const zpy = () => { pc = (pc + 1) & 0xffff; return (b1 + this.y) & 0xff; };
  const ab = () => { pc = (pc + 2) & 0xffff; return w; };
  const abx = () => { pc = (pc + 2) & 0xffff; return (w + this.x) & 0xffff; };
  const aby = () => { pc = (pc + 2) & 0xffff; return (w + this.y) & 0xffff; };
  const izx = () => { pc = (pc + 1) & 0xffff; const z = (b1 + this.x) & 0xff; return m[z] | (m[(z + 1) & 0xff] << 8); };
  const izy = () => { pc = (pc + 1) & 0xffff; return ((m[b1] | (m[(b1 + 1) & 0xff] << 8)) + this.y) & 0xffff; };
  const imm = () => { const a = pc; pc = (pc + 1) & 0xffff; return a; };
  const modes = [imm, zp, zpx, ab, abx, aby, izx, izy];
  const adc = v => {
    if (this.p & 8) {   // decimal
      let lo = (this.a & 15) + (v & 15) + C, hi = (this.a >> 4) + (v >> 4);
      if (lo > 9) { lo += 6; hi++; }
      const bin = this.a + v + C;
      this.p = (this.p & 0x3c) | ((~(this.a ^ v) & (this.a ^ bin) & 0x80) ? 0x40 : 0) | ((bin & 0xff) ? 0 : 2);
      if (hi > 9) hi += 6;
      this.p |= (hi > 15 ? 1 : 0) | ((hi << 4) & 0x80);
      this.a = ((hi << 4) | (lo & 15)) & 0xff;
    } else {
      const r = this.a + v + C;
      this.p = (this.p & 0xbe) | (r > 255 ? 1 : 0) | ((~(this.a ^ v) & (this.a ^ r) & 0x80) ? 0x40 : 0);
      this.a = this.nz(r);
    }
  };
  const sbc = v => {
    if (this.p & 8) {
      const r = this.a - v - (1 - C);
      let lo = (this.a & 15) - (v & 15) - (1 - C), hi = (this.a >> 4) - (v >> 4);
      if (lo < 0) { lo -= 6; hi--; } if (hi < 0) hi -= 6;
      this.p = (this.p & 0xbe) | (r >= 0 ? 1 : 0) | (((this.a ^ v) & (this.a ^ r) & 0x80) ? 0x40 : 0);
      this.nz(r); this.a = ((hi << 4) | (lo & 15)) & 0xff;
    } else adc(v ^ 0xff);
  };
  const cmp = (r, v) => { const t = r - v; this.p = (this.p & 0xfe) | (t >= 0 ? 1 : 0); this.nz(t); };
  const branch = cond => { pc = (pc + 1) & 0xffff; if (cond) pc = (pc + ((b1 ^ 0x80) - 0x80)) & 0xffff; };
  const rmw = (addr, f) => { this.wr(addr, f(this.rd(addr))); };
  const asl = v => { this.p = (this.p & 0xfe) | (v >> 7); return this.nz(v << 1); };
  const lsr = v => { this.p = (this.p & 0xfe) | (v & 1); return this.nz(v >> 1); };
  const rol = v => { const c = v >> 7; v = this.nz((v << 1) | (this.p & 1)); this.p = (this.p & 0xfe) | c; return v; };
  const ror = v => { const c = v & 1; v = this.nz((v >> 1) | ((this.p & 1) << 7)); this.p = (this.p & 0xfe) | c; return v; };

  // group 01 (ORA AND EOR ADC STA LDA CMP SBC) with regular addressing
  if ((op & 3) === 1) {
    const mode = [izx, zp, imm, ab, izy, zpx, aby, abx][(op >> 2) & 7], addr = mode(), g = op >> 5;
    if (g === 4) this.wr(addr, this.a);
    else {
      const v = this.rd(addr);
      if (g === 0) this.a = this.nz(this.a | v); else if (g === 1) this.a = this.nz(this.a & v);
      else if (g === 2) this.a = this.nz(this.a ^ v); else if (g === 3) adc(v);
      else if (g === 5) this.a = this.nz(v); else if (g === 6) cmp(this.a, v); else sbc(v);
    }
    this.pc = pc; return;
  }
  switch (op) {
    case 0x00: this.pc = 0xffff; return;     // BRK -> stop
    case 0xEA: break;
    // loads/stores
    case 0xA2: this.x = this.nz(m[imm()]); break; case 0xA6: this.x = this.nz(this.rd(zp())); break;
    case 0xB6: this.x = this.nz(this.rd(zpy())); break; case 0xAE: this.x = this.nz(this.rd(ab())); break;
    case 0xBE: this.x = this.nz(this.rd(aby())); break;
    case 0xA0: this.y = this.nz(m[imm()]); break; case 0xA4: this.y = this.nz(this.rd(zp())); break;
    case 0xB4: this.y = this.nz(this.rd(zpx())); break; case 0xAC: this.y = this.nz(this.rd(ab())); break;
    case 0xBC: this.y = this.nz(this.rd(abx())); break;
    case 0x86: this.wr(zp(), this.x); break; case 0x96: this.wr(zpy(), this.x); break; case 0x8E: this.wr(ab(), this.x); break;
    case 0x84: this.wr(zp(), this.y); break; case 0x94: this.wr(zpx(), this.y); break; case 0x8C: this.wr(ab(), this.y); break;
    // transfers
    case 0xAA: this.x = this.nz(this.a); break; case 0xA8: this.y = this.nz(this.a); break;
    case 0x8A: this.a = this.nz(this.x); break; case 0x98: this.a = this.nz(this.y); break;
    case 0xBA: this.x = this.nz(this.s); break; case 0x9A: this.s = this.x; break;
    // inc/dec
    case 0xE8: this.x = this.nz(this.x + 1); break; case 0xCA: this.x = this.nz(this.x - 1); break;
    case 0xC8: this.y = this.nz(this.y + 1); break; case 0x88: this.y = this.nz(this.y - 1); break;
    case 0xE6: { const a = zp(); rmw(a, v => this.nz(v + 1)); break; } case 0xF6: { const a = zpx(); rmw(a, v => this.nz(v + 1)); break; }
    case 0xEE: { const a = ab(); rmw(a, v => this.nz(v + 1)); break; } case 0xFE: { const a = abx(); rmw(a, v => this.nz(v + 1)); break; }
    case 0xC6: { const a = zp(); rmw(a, v => this.nz(v - 1)); break; } case 0xD6: { const a = zpx(); rmw(a, v => this.nz(v - 1)); break; }
    case 0xCE: { const a = ab(); rmw(a, v => this.nz(v - 1)); break; } case 0xDE: { const a = abx(); rmw(a, v => this.nz(v - 1)); break; }
    // shifts
    case 0x0A: this.a = asl(this.a); break; case 0x4A: this.a = lsr(this.a); break;
    case 0x2A: this.a = rol(this.a); break; case 0x6A: this.a = ror(this.a); break;
    case 0x06: rmw(zp(), asl); break; case 0x16: rmw(zpx(), asl); break; case 0x0E: rmw(ab(), asl); break; case 0x1E: rmw(abx(), asl); break;
    case 0x46: rmw(zp(), lsr); break; case 0x56: rmw(zpx(), lsr); break; case 0x4E: rmw(ab(), lsr); break; case 0x5E: rmw(abx(), lsr); break;
    case 0x26: rmw(zp(), rol); break; case 0x36: rmw(zpx(), rol); break; case 0x2E: rmw(ab(), rol); break; case 0x3E: rmw(abx(), rol); break;
    case 0x66: rmw(zp(), ror); break; case 0x76: rmw(zpx(), ror); break; case 0x6E: rmw(ab(), ror); break; case 0x7E: rmw(abx(), ror); break;
    // compares
    case 0xE0: cmp(this.x, m[imm()]); break; case 0xE4: cmp(this.x, this.rd(zp())); break; case 0xEC: cmp(this.x, this.rd(ab())); break;
    case 0xC0: cmp(this.y, m[imm()]); break; case 0xC4: cmp(this.y, this.rd(zp())); break; case 0xCC: cmp(this.y, this.rd(ab())); break;
    case 0x24: case 0x2C: { const v = this.rd(op === 0x24 ? zp() : ab()); this.p = (this.p & 0x3d) | (v & 0xc0) | ((v & this.a) ? 0 : 2); break; }
    // branches
    case 0x10: branch(!(this.p & 0x80)); break; case 0x30: branch(this.p & 0x80); break;
    case 0x50: branch(!(this.p & 0x40)); break; case 0x70: branch(this.p & 0x40); break;
    case 0x90: branch(!(this.p & 1)); break; case 0xB0: branch(this.p & 1); break;
    case 0xD0: branch(!(this.p & 2)); break; case 0xF0: branch(this.p & 2); break;
    // jumps
    case 0x4C: pc = w; break;
    case 0x6C: pc = m[w] | (m[(w & 0xff00) | ((w + 1) & 0xff)] << 8); break;
    case 0x20: { const r = (pc + 1) & 0xffff; this.push(r >> 8); this.push(r); pc = w; break; }
    case 0x60: { const lo = this.pull(), hi = this.pull(); pc = (((hi << 8) | lo) + 1) & 0xffff; break; }
    case 0x40: { this.p = this.pull() | 0x20; const lo = this.pull(), hi = this.pull(); pc = (hi << 8) | lo; break; }
    // stack / flags
    case 0x48: this.push(this.a); break; case 0x68: this.a = this.nz(this.pull()); break;
    case 0x08: this.push(this.p | 0x30); break; case 0x28: this.p = this.pull() | 0x20; break;
    case 0x18: this.p &= ~1; break; case 0x38: this.p |= 1; break; case 0x58: this.p &= ~4; break; case 0x78: this.p |= 4; break;
    case 0xB8: this.p &= ~0x40; break; case 0xD8: this.p &= ~8; break; case 0xF8: this.p |= 8; break;
    default: this.unknown++; this.pc = 0xffff; return;
  }
  this.pc = pc;
};

// ---------------- POKEY ----------------
const CLK = 1773447;                      // PAL
function poly(bits, taps) {               // LFSR bit sequence
  const len = (1 << bits) - 1, out = new Uint8Array(len); let r = 1;
  for (let i = 0; i < len; i++) { out[i] = r & 1; const fb = taps(r); r = (r >> 1) | (fb << (bits - 1)); }
  return out;
}
const P4 = poly(4, r => ((r >> 0) ^ (r >> 1)) & 1);
const P5 = poly(5, r => ((r >> 0) ^ (r >> 2)) & 1);
const P9 = poly(9, r => ((r >> 0) ^ (r >> 5)) & 1);
const P17 = poly(17, r => ((r >> 0) ^ (r >> 5)) & 1);

function POKEY(rate) {
  this.reg = new Uint8Array(16);
  this.cnt = [1, 1, 1, 1]; this.out = [0, 0, 0, 0]; this.hp = [0, 0];
  this.cyc = 0; this.base = 0; this.cpsamp = CLK / rate; this.acc = 0; this.dc = 0;
}
POKEY.prototype.write = function (a, v) { this.reg[a & 15] = v; };
POKEY.prototype.read = function (a) { return (a & 15) === 10 ? (Math.random() * 256) | 0 : 0xff; };
POKEY.prototype.period = function (ch) {
  const r = this.reg, ctl = r[8];
  const fast = (ch === 0 && ctl & 0x40) || (ch === 2 && ctl & 0x20);
  if (ch === 1 && ctl & 0x10) return ((r[2] << 8) | r[0]) + (ctl & 0x40 ? 7 : 1);
  if (ch === 3 && ctl & 0x08) return ((r[6] << 8) | r[4]) + (ctl & 0x20 ? 7 : 1);
  return r[ch * 2] + (fast ? 4 : 1);
};
POKEY.prototype.fast = function (ch) {   // clocked from 1.79 MHz?
  const ctl = this.reg[8];
  if (ch === 0 || (ch === 1 && ctl & 0x10)) return !!(ctl & 0x40);
  if (ch === 2 || (ch === 3 && ctl & 0x08)) return !!(ctl & 0x20);
  return false;
};
POKEY.prototype.render = function (buf, from, to) {
  const r = this.reg, divBase = (r[8] & 1) ? 114 : 28;
  for (let i = from; i < to; i++) {
    this.acc += this.cpsamp; let n = this.acc | 0; this.acc -= n; let sum = 0, cnt = 0;
    while (n-- > 0) {
      this.cyc++; let baseTick = false;
      if (++this.base >= divBase) { this.base = 0; baseTick = true; }
      for (let ch = 0; ch < 4; ch++) {
        if ((ch === 0 && r[8] & 0x10) || (ch === 2 && r[8] & 0x08)) continue;   // low byte of 16-bit pair
        if (!(this.fast(ch) || baseTick)) continue;
        if (--this.cnt[ch] > 0) continue;
        this.cnt[ch] = this.period(ch);
        const c = r[ch * 2 + 1], k = this.cyc;
        if (!(c & 0x80) && !P5[k % 31]) {}
        else if (c & 0x20) this.out[ch] ^= 1;
        else this.out[ch] = (c & 0x40) ? P4[k % 15] : ((r[8] & 0x80) ? P9[k % 511] : P17[k % 131071]);
        if (ch === 2) this.hp[0] = this.out[0];   // hi-pass latch ch1 by ch3
        if (ch === 3) this.hp[1] = this.out[1];   // hi-pass latch ch2 by ch4
      }
      let v = 0;
      for (let ch = 0; ch < 4; ch++) {
        const c = r[ch * 2 + 1], vol = c & 15;
        if (c & 0x10) { v += vol; continue; }
        let o = this.out[ch];
        if (ch === 0 && r[8] & 0x04) o ^= this.hp[0];
        if (ch === 1 && r[8] & 0x02) o ^= this.hp[1];
        if (o) v += vol;
      }
      sum += v; cnt++;
    }
    const s = cnt ? sum / cnt / 60 : 0;
    this.dc += (s - this.dc) * 0.0005;
    buf[i] = (s - this.dc) * 0.9;
  }
};

// ---------------- music player ----------------
function CMCPlayer(memImage, base, rate) {
  this.mem = new Uint8Array(65536); this.mem.set(memImage, base);
  this.pokey = new POKEY(rate); this.cpu = new CPU(this.mem, this.pokey);
  this.spf = rate / 49.86; this.left = 0;
  this.cpu.call(0x8900, 0x70, 0x00, 0x77);     // music data at $7700
}
CMCPlayer.prototype.song = function (pos) { this.pokey.reg.fill(0); this.cpu.call(0x8900, 0x00, pos, 0); this.left = 0; };
CMCPlayer.prototype.generate = function (buf) {
  let i = 0;
  while (i < buf.length) {
    if (this.left <= 0) { this.cpu.call(0x8903, 0, 0, 0); this.left += this.spf; }   // VBI: jsr $8903
    const n = Math.min(buf.length - i, Math.ceil(this.left));
    this.pokey.render(buf, i, i + n); i += n; this.left -= n;
  }
};

// ---------------- zvukové efekty ----------------
// Originální hra efekty nemá (POKEY obsluhuje jen přehrávač CMC). Tyto efekty jsou nové,
// ale generuje je stejný emulovaný POKEY: sekvence (AUDF, AUDC) po snímcích 50 Hz.
// AUDC: $Ax čistý tón, $8x šum (poly17), $Cx bzučák (poly4), $2x tón přes poly5; x = hlasitost 0-15.
const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i, n));
const SFX = {
  step:     () => [[0x30, 0xA3], [0x30, 0xA1]],
  push:     () => seq(7, (i, n) => [0x60 + i * 8, 0x80 | Math.round(9 * (1 - i / n))]),
  pickup:   () => [0x50, 0x50, 0x3C, 0x3C, 0x2D, 0x2D, 0x22, 0x22, 0x22, 0x22].map((f, i) => [f, 0xA0 | Math.max(2, 12 - i)]),
  bump:     () => seq(4, (i) => [0x90, 0xC0 | (8 - i * 2)]),
  door:     () => seq(5, (i) => [0x70 - i * 6, 0xC0 | (7 - i)]),
  aim:      () => [[0x18, 0xA8], [0x14, 0xA6], [0x10, 0xA3]],
  sensor:   () => seq(10, (i) => [0x10 + i * 12, 0xA0 | (12 - i)]),
  gone:     () => seq(6, (i) => [0x08 + i * 3, 0x20 | (10 - i)]),
  explode:  () => seq(28, (i, n) => [0x20 + i * 4, 0x80 | Math.round(14 * (1 - i / n))]),
  breaker:  () => seq(12, (i) => [0x40 + (i & 1) * 0x20, 0xC0 | (10 - (i >> 1))]),
  exitOpen: () => [0x51, 0x40, 0x35, 0x28].flatMap((f, k) => seq(4, (i) => [f, 0xA0 | (10 - i - k)])),
  laserDead:() => seq(40, (i, n) => [0x80 + i * 3, 0x80 | Math.round(12 * (1 - i / n))]),
  win:      () => [0x79, 0x60, 0x51, 0x40, 0x35, 0x28, 0x1F, 0x1A].flatMap((f) => seq(4, (i) => [f, 0xA0 | (11 - i * 2)])),
};
function SFXPlayer(rate) {
  this.pokey = new POKEY(rate); this.spf = rate / 49.86; this.left = 0;
  this.voices = [null, null, null, null]; this.next = 0;
}
SFXPlayer.prototype.play = function (name) {
  const make = SFX[name]; if (!make) return;
  let ch = this.voices.findIndex(v => !v); if (ch < 0) { ch = this.next; this.next = (this.next + 1) & 3; }
  this.voices[ch] = { frames: make(), pos: 0 };
};
SFXPlayer.prototype.frame = function () {
  const r = this.pokey.reg;
  for (let ch = 0; ch < 4; ch++) {
    const v = this.voices[ch];
    if (!v) { r[ch * 2 + 1] = 0; continue; }
    const [f, c] = v.frames[v.pos++]; r[ch * 2] = f; r[ch * 2 + 1] = c;
    if (v.pos >= v.frames.length) this.voices[ch] = null;
  }
};
SFXPlayer.prototype.generate = function (buf) {
  // ticho: žádný hlas a všechny hlasitosti nulové -> nic neemulovat
  if (this.voices.every(v => !v) && [1, 3, 5, 7].every(k => !(this.pokey.reg[k] & 15))) { buf.fill(0); return; }
  let i = 0;
  while (i < buf.length) {
    if (this.left <= 0) { this.frame(); this.left += this.spf; }
    const n = Math.min(buf.length - i, Math.ceil(this.left));
    this.pokey.render(buf, i, i + n); i += n; this.left -= n;
  }
};

root.AtariAudio = { CPU, POKEY, CMCPlayer, SFXPlayer, SFX_NAMES: Object.keys(SFX) };
if (typeof module !== 'undefined') module.exports = root.AtariAudio;
})(typeof window !== 'undefined' ? window : globalThis);
