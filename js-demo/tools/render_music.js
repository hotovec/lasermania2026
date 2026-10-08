#!/usr/bin/env node
// Vyrenderuje originální hudbu Lasermanie (nebo zvukový efekt) do WAV, bez prohlížeče.
// Použití: node tools/render_music.js [skladba=1] [sekund=60] [vystup.wav]
//          node tools/render_music.js sfx:explode [sekund=2] [vystup.wav]
//          node tools/render_music.js --seam skladba [vystup.wav]   5 s před koncem smyčky + 5 s od jejího začátku
//          node tools/render_music.js --all [složka=data/sound]     zvuk pro port (npm run sound)
//   skladba 0 = titulka, 1 a 2 = ve hře (střídají se po 4 levelech), 3 = vítězná obrazovka
// --all: skladby 0-3 do OGG + MP3 (render do konce smyčky + 2 s), music.json s body smyčky (sekundy),
//        vu.json s hlasitostmi 3 kanálů po snímcích (ekvalizér stavového řádku), efekty SFX_NAMES do sfx/<name>.wav.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AtariAudio from '../esm/audio.js';
const data = JSON.parse(fs.readFileSync(new URL('../data/lasermania.json', import.meta.url), 'utf8'));
const RATE = 44100, VBI_HZ = 49.86;   // frekvence volání přehrávače jako CMCPlayer.spf
const SONGS = [0, 1, 2, 3];   // 0 = titulka ($6D4E), 1 a 2 = ve hře, 3 = vítězná obrazovka ($6E3A)
const MUSIC_MEM = Buffer.from(data.musicMem, 'base64');
const SCALE = 30000;

const player = song => { const p = new AtariAudio.CMCPlayer(MUSIC_MEM, 0x7700, RATE); p.song(song); return p; };

// Bod smyčky: od snímku `start` se registry POKEY po snímcích opakují s periodou `period` (nejmenší taková,
// která v okně platí aspoň dvakrát). Emuluje se jen CPU, bez POKEY.
function findLoop(song, minutes = 40) {
  const p = player(song), n = Math.round(VBI_HZ * 60 * minutes), frames = new Array(n);
  for (let f = 0; f < n; f++) { p.cpu.call(0x8903, 0, 0, 0); frames[f] = p.pokey.reg.slice(0, 9).join(','); }
  for (let period = 50; period < n / 3; period++) {
    let start = n - period - 1;
    while (start >= 0 && frames[start] === frames[start + period]) start--;
    start++;
    if (n - period - start > period * 2) return { start, period, loopStart: start / VBI_HZ, loopEnd: (start + period) / VBI_HZ };
  }
  throw new Error(`skladba ${song}: smyčka nenalezena`);
}

// hlasitosti kanálů 1-3 po každém volání přehrávače ($8906-$8908 & 15, čte je ekvalizér $9E77): hex, 3 znaky na snímek
function songVolumes(song, frames) {
  const p = player(song); let out = '';
  for (let f = 0; f < frames; f++) {
    p.cpu.call(0x8903, 0, 0, 0);
    for (let k = 0; k < 3; k++) out += (p.mem[0x8906 + k] & 15).toString(16);
  }
  return out;
}

function renderSong(song, secs) { const buf = new Float32Array(Math.round(RATE * secs)); player(song).generate(buf); return buf; }

function wav(buf) {
  const n = buf.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * SCALE))), 44 + i * 2);
  return b;
}

// efekt: render 3 s, ticho na konci oříznuté (+ 20 ms dozvuku filtru)
function renderSfx(name) {
  const p = new AtariAudio.SFXPlayer(RATE), buf = new Float32Array(RATE * 3);
  p.play(name); p.generate(buf);
  let end = buf.length; while (end > 0 && Math.abs(buf[end - 1] * SCALE) < 1) end--;
  return buf.subarray(0, Math.min(buf.length, end + Math.round(RATE * 0.02)));
}

// obálka: RMS po blocích 20 ms; relativní rozdíl obálek dvou úseků (fáze tónů POKEY se na švu liší, noty ne)
function envDiff(a, x, y, secs = 2) {
  const blk = Math.round(RATE * 0.02); let d = 0, s = 0;
  for (let k = 0; k < Math.round(secs / 0.02); k++) {
    let ex = 0, ey = 0;
    for (let i = 0; i < blk; i++) { ex += a[x + k * blk + i] ** 2; ey += a[y + k * blk + i] ** 2; }
    ex = Math.sqrt(ex / blk); ey = Math.sqrt(ey / blk); d += Math.abs(ex - ey); s += ex;
  }
  return d / s;
}

async function renderAll(dir) {
  const { createMp3Encoder, createOggEncoder } = await import('wasm-media-encoders');
  // pevné ogg serial číslo: render je deterministický (stejné soubory při každém běhu)
  const encode = async (buf, create, config) => {
    const enc = await create(); enc.configure({ channels: 1, sampleRate: RATE, ...config });
    const parts = [Buffer.from(enc.encode([buf])), Buffer.from(enc.finalize())];
    return Buffer.concat(parts);
  };
  fs.mkdirSync(path.join(dir, 'sfx'), { recursive: true });
  const music = {}, vu = { rate: VBI_HZ };
  for (const song of SONGS) {
    const loop = findLoop(song);
    const buf = renderSong(song, loop.loopEnd + 2);
    // šev: 2 s za začátkem a za koncem smyčky mají mít stejnou obálku; pro srovnání posun o 1 snímek vedle
    const a = Math.round(loop.loopStart * RATE), b = Math.round(loop.loopEnd * RATE), f = Math.round(RATE / VBI_HZ);
    console.log(`skladba ${song}: smyčka ${loop.loopStart.toFixed(3)}–${loop.loopEnd.toFixed(3)} s (snímky ${loop.start} + ${loop.period}),`,
      `rozdíl obálky na švu ${(envDiff(buf, a, b) * 100).toFixed(1)} % (o snímek vedle ${(envDiff(buf, a, b - f) * 100).toFixed(1)} %)`);
    fs.writeFileSync(path.join(dir, `song${song}.ogg`), await encode(buf, createOggEncoder, { vbrQuality: 4, oggSerialNo: song }));
    fs.writeFileSync(path.join(dir, `song${song}.mp3`), await encode(buf, createMp3Encoder, { bitrate: 96 }));
    music[song] = { loopStart: +loop.loopStart.toFixed(6), loopEnd: +loop.loopEnd.toFixed(6) };
    vu[song] = songVolumes(song, loop.start + loop.period);
  }
  fs.writeFileSync(path.join(dir, 'music.json'), JSON.stringify(music, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'vu.json'), JSON.stringify(vu) + '\n');
  for (const name of AtariAudio.SFX_NAMES) fs.writeFileSync(path.join(dir, 'sfx', `${name}.wav`), wav(renderSfx(name)));
  console.log('zapsáno', dir, `(${SONGS.length} skladby, ${AtariAudio.SFX_NAMES.length} efektů)`);
}

const arg = process.argv[2] ?? '1';
if (arg === '--all') {
  await renderAll(process.argv[3] ?? fileURLToPath(new URL('../data/sound', import.meta.url)));
} else if (arg === '--seam') {
  const song = +(process.argv[3] ?? 1), loop = findLoop(song), buf = renderSong(song, loop.loopEnd + 1);
  const a = Math.round(loop.loopStart * RATE), b = Math.round(loop.loopEnd * RATE), w = 5 * RATE;
  const out = process.argv[4] ?? `lasermania_song${song}_seam.wav`, seam = new Float32Array(2 * w);
  seam.set(buf.subarray(b - w, b)); seam.set(buf.subarray(a, a + w), w);
  fs.writeFileSync(out, wav(seam)); console.log('zapsáno', out, '(šev smyčky v 5. sekundě)');
} else {
  const secs = +(process.argv[3] ?? (arg.startsWith('sfx:') ? 2 : 60)), buf = new Float32Array(Math.round(RATE * secs));
  let out = process.argv[4];
  if (arg.startsWith('sfx:')) {
    const p = new AtariAudio.SFXPlayer(RATE); p.play(arg.slice(4)); p.generate(buf);
    out ??= `lasermania_${arg.slice(4)}.wav`;
  } else {
    player(+arg).generate(buf);
    out ??= `lasermania_song${arg}.wav`;
  }
  fs.writeFileSync(out, wav(buf)); console.log('zapsáno', out, secs + ' s');
}
