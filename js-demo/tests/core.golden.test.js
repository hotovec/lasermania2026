// Hlídá, že herní logika (js/lm-core.js) dává stejné výsledky jako ověřená verze.
// Po vědomé změně logiky: npm run golden:record -w @lasermania/js-demo
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runLevel, loadLevels } from '../tools/golden-run.js';

const golden = JSON.parse(fs.readFileSync(new URL('../golden/core.json', import.meta.url), 'utf8'));
const levels = loadLevels();

test('počet levelů', () => assert.equal(levels.length, golden.levels.length));
for (const g of golden.levels) {
  test(`level ${String(g.n).padStart(2, '0')} se chová stejně`, () => {
    assert.deepEqual({ n: g.n, ...runLevel(levels.find(l => l.n === g.n)) }, g);
  });
}
