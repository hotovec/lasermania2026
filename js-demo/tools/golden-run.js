// Deterministický běh herní logiky pro golden testy: pro každý level pevná sekvence vstupů
// a otisk stavu po každém kroku. Sdílí ho record_golden.js i tests/core.golden.test.js.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import LMCore from '../esm/core.js';

export const STEPS = 400;
const MOVES = [[1, 0], [0, -1], [-1, 0], [0, 1], [1, 0], [1, 0], [0, 1], [-1, 0]];

function withSeededRandom(fn) {          // bomba $27 volá Math.random -> v testu deterministicky
  const orig = Math.random; let s = 0x2468ace;
  Math.random = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  try { return fn(); } finally { Math.random = orig; }
}

export function runLevel(level) {
  return withSeededRandom(() => {
    const st = LMCore.createState(level), h = createHash('sha256');
    for (let k = 0; k < STEPS; k++) {
      LMCore.tick(st);
      if (k % 3 === 0) { const [dx, dy] = MOVES[(k / 3) % MOVES.length]; LMCore.move(st, dx, dy); }
      h.update(Uint8Array.from(st.pf)); h.update(Uint8Array.from([st.emitter, st.dir, st.tank, st.pause & 255, st.won ? 1 : 0]));
      h.update(JSON.stringify(st.cells)); h.update(LMCore.takeEvents(st).join(','));
    }
    return { hash: h.digest('hex').slice(0, 16), tank: st.tank, emitter: st.emitter, dir: st.dir, won: st.won };
  });
}

export function loadLevels() {
  return JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8')).levels;
}
