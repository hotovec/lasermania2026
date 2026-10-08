#!/usr/bin/env node
// Vyrenderuje originální hudbu Lasermanie (nebo zvukový efekt) do WAV, bez prohlížeče.
// Použití: node tools/render_music.js [skladba=1] [sekund=60] [vystup.wav]
//          node tools/render_music.js sfx:explode [sekund=2] [vystup.wav]
//   skladba 3 = titulka, 1 a 2 = ve hře (střídají se po 4 levelech), 0 = další skladba v datech
import fs from 'node:fs';
import AtariAudio from '../esm/audio.js';
const data = JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8'));
const arg = process.argv[2] ?? '1', secs = +(process.argv[3] ?? (arg.startsWith('sfx:') ? 2 : 60));
const rate = 44100, buf = new Float32Array(Math.round(rate * secs));
let out = process.argv[4];
if (arg.startsWith('sfx:')) {
  const p = new AtariAudio.SFXPlayer(rate); p.play(arg.slice(4)); p.generate(buf);
  out ??= `lasermania_${arg.slice(4)}.wav`;
} else {
  const p = new AtariAudio.CMCPlayer(Buffer.from(data.musicMem, 'base64'), 0x7700, rate); p.song(+arg); p.generate(buf);
  out ??= `lasermania_song${arg}.wav`;
}
const n = buf.length, b = Buffer.alloc(44 + n * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 30000))), 44 + i * 2);
fs.writeFileSync(out, b); console.log('zapsáno', out, secs + ' s');
