// Přesné snímky hry (BT.captureFrame({ size: 'display' }), 320x240 z indexovaného bufferu) přes `blit play`.
//   node scripts/shot-display.mjs <out.png> [--backend software] [--wait 3000]
//   node scripts/shot-display.mjs --all <dir> [--backend software]     -> <dir>/l00.png … l52.png
// `blit play shot` volá captureFrame() bez `size`, proto snímek přes eval a base64.
// --all: každý level přes dev hook __game.load(n, kroky, fáze) ve stavu screenshotu (@lasermania/js-demo/screens.json).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import data from '@lasermania/js-demo/data.json' with { type: 'json' };
import screens from '@lasermania/js-demo/screens.json' with { type: 'json' };

const args = process.argv.slice(2);
const opt = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : def;
};
const backend = opt('--backend', null);
const wait = opt('--wait', '3000');
const all = args[0] === '--all';
// npm run z kořene běží v lasermania-blit386/, cestu brát vůči složce, odkud se volalo
const out = path.resolve(process.env.INIT_CWD ?? process.cwd(), (all ? args[1] : args[0]) ?? 'screenshots/display.png');

const CAPTURE =
    'eval:(async()=>{const b=await BT.captureFrame({size:"display"});' +
    'const u=new Uint8Array(await b.arrayBuffer());let s="";for(const x of u)s+=String.fromCharCode(x);return btoa(s)})()';

// jeden běh blit play; vrací base64 PNG pro každý capture krok v pořadí
function play(steps) {
    const playArgs = ['blit', 'play', ...(backend ? ['--backend', backend] : []), ...steps];
    const lines = execFileSync('npx', playArgs, { encoding: 'utf8', maxBuffer: 256 << 20 })
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l));
    const done = lines.at(-1);
    if (done.step !== 'done' || done.errors.length) throw new Error(`blit play selhal: ${JSON.stringify(done)}`);
    const active = lines.find((l) => l.step === 'eval:BT.activeBackend')?.result;
    return { active, shots: lines.filter((l) => l.step === CAPTURE).map((l) => l.result) };
}

if (all) {
    const steps = [`wait:${wait}`, 'eval:BT.activeBackend'];
    for (let n = 0; n < data.levels.length; n++) {
        const s = screens.levels[n] ?? {};
        steps.push(`eval:__game.load(${n}, ${s.ticks ?? 0}, ${s.beamPhase ?? 0})`, 'wait:100', CAPTURE);
    }
    const { active, shots } = play(steps);
    if (shots.length !== data.levels.length) throw new Error(`čekám ${data.levels.length} snímků, mám ${shots.length}`);
    fs.mkdirSync(out, { recursive: true });
    shots.forEach((b64, n) => fs.writeFileSync(path.join(out, `l${String(n).padStart(2, '0')}.png`), Buffer.from(b64, 'base64')));
    console.log(`${out}: ${shots.length} snímků (backend ${active})`);
} else {
    const { active, shots } = play([`wait:${wait}`, 'eval:BT.activeBackend', CAPTURE]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(shots[0], 'base64'));
    console.log(`${out} (backend ${active})`);
}
