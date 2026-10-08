const { Laser, W, H } = require('./laser.js');
function render(pf, cells) {
  const g = [];
  for (let y = 0; y < 2*H; y++) { g.push([]); for (let x = 0; x < 2*W; x++) {
    const t = pf[(y>>1)*W + (x>>1)] & 0x3f;
    g[y].push(t === 0 ? '.' : t === 0x10 ? 'E' : t === 0x20 ? 'M' : t === 0x03 ? 'B' : t===0x35?'S':'#'); } }
  for (const c of cells) g[c.y][c.x] = c.ch;
  return g.map(r => r.join('')).join('\n');
}
function level() {
  const pf = new Uint8Array(W*H);
  for (let i = 0; i < W; i++) { pf[i] = 0x0E; pf[(H-1)*W+i] = 0x0E; }
  for (let r = 0; r < H; r++) { pf[r*W] = 0x0E; pf[r*W+W-1] = 0x0E; }
  return pf;
}
// scene like the screenshot: emitter bottom-left, beam UR, reflective block, absorbing box
let pf = level();
pf[9*W+2] = 0x10;          // emitter
pf[4*W+7] = 0x20;          // reflective block (hit from below)
pf[8*W+11] = 0x03;         // pushable box (absorbs)
let L = new Laser(pf, 9*W+2, 1);
let c = L.frame(); console.log(render(pf, c)); console.log('cells', c.length, '\n');
// closed loop of reflective walls -> must terminate
pf = level(); for (let i=0;i<W*H;i++) if (pf[i]) pf[i]=0x0D;
pf[6*W+3] = 0x10; pf[3*W+9]=0x35;
L = new Laser(pf, 6*W+3, 2);
c = L.frame(); console.log(render(pf, c)); console.log('cells', c.length, 'sensor tile now', (pf[3*W+9]&0x3f).toString(16));
