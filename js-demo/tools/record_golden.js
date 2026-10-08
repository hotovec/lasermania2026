#!/usr/bin/env node
// Nahraje golden otisky herní logiky (golden/core.json). Spouštět JEN po vědomé změně logiky.
import fs from 'node:fs';
import { runLevel, loadLevels, STEPS } from './golden-run.js';
const out = { steps: STEPS, levels: loadLevels().map(l => ({ n: l.n, ...runLevel(l) })) };
fs.writeFileSync(new URL('../golden/core.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log('golden/core.json:', out.levels.length, 'levelů');
