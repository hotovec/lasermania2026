// Lasermania (L.K. Avalon 1990, Atari 8-bit) – laser beam mechanic.
// Faithful port of run_laser ($A016) from the commented disassembly
// in lasermania2020 (MatoSimi), file Lasermania.asm.
//
// Playfield: 16 x 12 tiles, index = row*16 + col.
// Each tile = 2 x 2 characters, so the beam runs on a 32 x 24 char grid.

const W = 16, H = 12;

// element_types ($5D00), one byte per tile code $00-$3F
// bit7 $80 = reflects the beam, bit1 $02 = animated via timer (AE00),
// bit6 $40 = pushable, bit3 $08 = capsule, bit5 $20 = exit, bit4 $10 = tank can pass
const TYPES = [
  0x00,0x00,0x00,0x44,0x80,0x80,0x80,0x80,0x04,0x04,0x04,0x04,0x04,0x80,0x04,0x04,
  0x04,0x04,0x04,0x04,0x00,0x00,0x00,0x00,0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x04,
  0xC4,0x0C,0x01,0x86,0x01,0x01,0x05,0x01,0x14,0x14,0x06,0x02,0x02,0x02,0x02,0x02,
  0x04,0x04,0x04,0x04,0x24,0x01,0x02,0x02,0x02,0x14,0x14,0x14,0x14,0x10,0x00,0x44,
];

// 8 directions = 4 diagonals x 2 "phases" (which tile edge is crossed first)
//            0    1    2    3    4    5    6    7
//           UL   UR   UR   DR   DR   DL   DL   UL
const DX   = [-1,  1,   1,   1,   1,  -1,  -1,  -1];   // L_A3C8
const DY   = [-1, -1,  -1,   1,   1,   1,   1,  -1];   // L_A3B8/C0 (+-40 bytes = 1 char line)
// start cell inside the source tile (0..1, 0..1)            // L_A390
const START = [[1,0],[0,0],[1,1],[1,0],[0,1],[1,1],[0,0],[0,1]];
// new direction after reflection: REFLECT[dir][n & 1], n = step number (1-based)  // L_A398
const REFLECT = [[2,5],[7,4],[4,7],[1,6],[6,1],[3,0],[0,3],[5,2]];
// beam glyph per direction (char codes 2-5 = '/' and '\' variants)             // L_A3D0
const GLYPH = ['\\','/','/','\\','\\','/','/','\\'];

class Laser {
  constructor(playfield, emitterTile, emitterDir, relays = []) {
    this.pf = playfield;          // Uint8Array(192), bit7 = "hit by laser this frame"
    this.emitter = emitterTile;   // L_AC00[0], 0xFF = destroyed
    this.dir = emitterDir;        // L_AD00[0]
    this.relays = relays;         // L_BFB8: 8 tile indices, pairs i <-> i^4
    this.limit = Infinity;        // ZP_B2/B3 ($FFFF = unlimited)
    this.pause = 0;               // ZP_A8 (frames remaining)
    this.lensesLeft = playfield.filter(t => (t & 0x7f) === 0x35).length;
  }

  // one frame; returns beam cells {x,y,ch} (char grid) to be drawn over the map
  frame() {
    const cells = [];
    if (this.pause > 0) { this.pause--; return cells; }      // temporary beam breaker
    if (this.emitter === 0xFF) return cells;
    if (this.limit === 0) { this.pf[this.emitter] = 0x2B; this.emitter = 0xFF; return cells; } // L_A166
    if (this.limit !== Infinity) this.limit--;

    this.pf[this.emitter] = 0x10;                             // emitter tile
    const occupied = new Set();                               // beam already drawn this frame
    const queue = [{ tile: this.emitter, dir: this.dir }];
    for (let i = 0; i < queue.length && queue.length < 255; i++)
      this.trace(queue[i], queue, cells, occupied);
    return cells;
  }

  trace({ tile, dir }, queue, cells, occupied) {
    let x = (tile & 15) * 2 + START[dir][0];
    let y = (tile >> 4) * 2 + START[dir][1];
    for (let n = 1; ; n++) {
      x += DX[dir]; y += DY[dir];
      if (x < 0 || x >= 2 * W || y < 0 || y >= 2 * H) return;  // edge of playfield
      const t = (y >> 1) * W + (x >> 1);                      // tile the cell belongs to
      const key = y * 64 + x;
      const empty = (this.pf[t] & 0x3F) === 0 && !occupied.has(key);

      if (empty) {                                            // L_A148: draw beam char
        if (cells.length >= this.limit) return;               // length limit (fuse)
        cells.push({ x, y, ch: GLYPH[dir] }); occupied.add(key);
        continue;
      }

      // hit something (a tile, or a beam segment drawn earlier this frame)
      let code = this.pf[t] & 0x3F;
      if (code >= 0x20) {
        if (TYPES[code] & 0x02) this.schedule(t);             // animated element
        else this.element(code, t, dir, cells, queue);
      }
      this.pf[t] |= 0x80;                                      // "hit" flag for switches
      code = this.pf[t] & 0x3F;                                // element may have changed
      if (TYPES[code] & 0x80)                                   // reflective -> new segment
        queue.push({ tile: t, dir: REFLECT[dir][n & 1] });
      return;                                                  // segment ends here
    }
  }

  element(code, t, dir, cells, queue) {                       // element_routine_lookup
    switch (code) {
      case 0x22: this.limit = cells.length; this.pf[t] = 0x2B; break; // beam starts burning down
      case 0x24: this.dir = (this.dir + 1) & 7; break;          // aim controller: rotate emitter
      case 0x25: this.pause = 32; this.pf[t] = 0; break;        // temporary beam breaker
      case 0x26: {                                              // beam relay: continue from pair
        const i = this.relays.indexOf(t);
        if (i >= 0) queue.push({ tile: this.relays[i ^ 4], dir });
        break;
      }
      case 0x27: this.pf[t] = 0x2B; /* + explodes one random tile */ break; // laser bomb
      case 0x35: this.pf[t] = 0x36; break;                      // alarm sensor -> destroy anim
    }
  }
  schedule(t) { /* door controller ($23) / explosion animation: timer in L_AE00, see doc */ }
}

module.exports = { Laser, TYPES, DX, DY, START, REFLECT, W, H };
