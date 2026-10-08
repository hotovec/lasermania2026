// Přesný snímek hry (BT.captureFrame({ size: 'display' }), 320x240 z indexovaného bufferu) přes `blit play`.
//   node scripts/shot-display.mjs <out.png> [--backend software] [--wait 3000]
// `blit play shot` volá captureFrame() bez `size`, proto snímek přes eval a base64.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : def;
};
const backend = opt('--backend', null);
const wait = opt('--wait', '3000');
// npm run z kořene běží v lasermania-blit386/, cestu brát vůči složce, odkud se volalo
const out = path.resolve(process.env.INIT_CWD ?? process.cwd(), args[0] ?? 'screenshots/display.png');

const capture =
    'eval:(async()=>{const b=await BT.captureFrame({size:"display"});' +
    'const u=new Uint8Array(await b.arrayBuffer());let s="";for(const x of u)s+=String.fromCharCode(x);return btoa(s)})()';
const playArgs = ['blit', 'play', ...(backend ? ['--backend', backend] : []), `wait:${wait}`, 'eval:BT.activeBackend', capture];
const lines = execFileSync('npx', playArgs, { encoding: 'utf8', maxBuffer: 64 << 20 })
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
const shot = lines.find((l) => l.step?.startsWith('eval:(async'));
if (!shot?.result) throw new Error(`snímek se nepodařil: ${JSON.stringify(lines.at(-1))}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(shot.result, 'base64'));
console.log(`${out} (backend ${lines.find((l) => l.step === 'eval:BT.activeBackend')?.result})`);
