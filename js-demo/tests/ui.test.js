// Stavový řádek a titulka (js/lm-ui.js): rozložení podle rutin originálu, ekvalizér, emulace titulky.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import LMUi from '../esm/ui.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8'));
const b64 = s => Uint8Array.from(Buffer.from(s, 'base64'));
const row = (cells, r) => Array.from(cells.subarray(r * 40, r * 40 + 40));

test('stavový řádek: ikony, životy - 1 a level v BCD ($9E28, $9DF5)', () => {
  const c = LMUi.statusbarCells(0x05, 0x12, null);
  // tank $03-$0B ve sloupcích 4-6, čtverec $0C-$14 v 14-16, nota $15-$1D v 24-26 (3×3 znaky)
  assert.deepEqual(row(c, 0).slice(4, 7), [0x03, 0x04, 0x05]);
  assert.deepEqual(row(c, 2).slice(14, 17), [0x12, 0x13, 0x14]);
  assert.deepEqual(row(c, 1).slice(24, 27), [0x18, 0x19, 0x1A]);
  // životy 5 -> "04": číslice d = znaky $1E + 6d, 2×3 ve sloupcích 8-9 a 10-11
  assert.deepEqual([0, 1, 2].map(r => row(c, r).slice(8, 12)), [[0x1E, 0x1F, 0x36, 0x37], [0x20, 0x21, 0x38, 0x39], [0x22, 0x23, 0x3A, 0x3B]]);
  // level $12 -> "12" ve sloupcích 18-21
  assert.deepEqual(row(c, 0).slice(18, 22), [0x24, 0x25, 0x2A, 0x2B]);
  assert.deepEqual(LMUi.statusbarCells(0x00, 0, null).subarray(8, 12), Uint8Array.from([0x1E + 54, 0x1F + 54, 0x1E + 54, 0x1F + 54]));   // 0 životů -> "99"
});

test('ekvalizér: dílky, půldílek a špička drží 36 snímků ($9E77)', () => {
  const eq = new LMUi.Equalizer();
  eq.step([7, 0, 15]);
  assert.deepEqual(Array.from(eq.cells[0]), [2, 2, 2, 0x5A, 0, 0, 0, 0]);   // vol 7: 3 dílky, špička na pozici 3 (přepíše půldílek)
  assert.deepEqual(Array.from(eq.cells[1]), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(eq.cells[2]), [2, 2, 2, 2, 2, 2, 2, 0x5A]);
  eq.step([2, 0, 0]);
  assert.deepEqual(Array.from(eq.cells[0]), [2, 0, 0, 0x5A, 0, 0, 0, 0]);   // špička zůstává
  for (let i = 0; i < 34; i++) eq.step([2, 0, 0]);
  assert.equal(eq.cells[0][3], 0x5A);
  eq.step([2, 0, 0]);
  assert.deepEqual(Array.from(eq.cells[0]), [2, 0x5A, 0, 0, 0, 0, 0, 0]);   // po 36 snímcích spadne na aktuální úroveň
});

test('barvy: známé barvy ze screenshotů přesně', () => {
  assert.deepEqual(LMUi.atariRGB(0x22), [89, 15, 0]);
  assert.deepEqual(LMUi.atariRGB(0x08), [121, 120, 121]);
  assert.deepEqual(LMUi.atariRGB(0x00), [0, 0, 0]);
});

test('titulka: originální kód běží v emulátoru, START ji ukončí až po ~5,1 s', () => {
  const tm = new LMUi.TitleMachine(b64(data.titleMem));
  for (let f = 0; f < 200; f++) { tm.setInput(f > 10); tm.frame(); }
  assert.equal(tm.done, false, 'START před uplynutím 256 snímků se ignoruje');
  for (let f = 200; f < 400 && !tm.done; f++) { tm.setInput(true); tm.frame(); }
  assert.equal(tm.done, true);
  assert.equal(tm.cpu.unknown, 0);
});

test('titulka: deterministický snímek pole (animace písmen) a tempo ~3 snímky na iteraci', () => {
  const tm = new LMUi.TitleMachine(b64(data.titleMem));
  const hashes = [];
  for (let f = 1; f <= 1200; f++) {
    tm.frame();
    if (f % 400 === 0) hashes.push(crypto.createHash('sha1').update(tm.renderField(new Uint8Array(256 * 128))).digest('hex').slice(0, 12));
  }
  assert.equal(tm.cpu.unknown, 0);
  assert.equal(new Set(hashes).size, 3, 'písmena se pohybují');
  assert.ok(tm.iterations > 300 && tm.iterations < 500, `iterací ${tm.iterations}`);
  // pole s rámem: levý horní roh = dlaždice $FE (PF3), uvnitř mřížka
  const field = tm.renderField(new Uint8Array(256 * 128));
  assert.ok(field.subarray(0, 16).some(v => v === 4));
});
