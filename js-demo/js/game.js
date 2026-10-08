// Lasermania Laser Lab – propojení logiky, grafiky a hudby s uživatelským rozhraním.
(function () {
'use strict';
const C = window.LMCore, G = window.LMGraphics, D = window.LM_DATA;
const { W, H, T, ARROW, FIRST } = C;
const SC = 4;   // plocha 256×192 px kreslená 4× na canvas 1024×768

let st, levelNo = 0, editing = false, showGrid = false, beamMode = 'pixel';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');

function setMsg(s) { $('msg').textContent = s; }
function load(n) {
  levelNo = n; st = C.createState(D.levels[n]);
  if (typeof syncSong === 'function') syncSong();
  $('levelSel').value = n;
  setMsg(''); step();
}
function step() { ui(C.tick(st)); playSfx(C.takeEvents(st)); }
function ui({ sensors, caps }) {
  $('stLevel').textContent = String(D.levels[levelNo].n ?? levelNo).padStart(2, '0') + ' / ' + D.levels.length;
  $('stSensors').textContent = sensors; $('stCaps').textContent = caps; $('stSegs').textContent = st.segs.length;
  $('stDir').textContent = st.noLaser ? 'žádný (level bez laseru)' : st.emitter === 255 ? 'zničen' : st.dir + ' ' + ARROW[st.dir] + ' nejdřív ' + FIRST[st.dir] + (st.limit !== Infinity ? ', dohoří za ' + st.limit : '');
  if (st.emitter === 255 && !st.noLaser && !st.won && !$('msg').textContent) setMsg('Laser je zničený. Restart levelu ho vrátí.');
  const xy = i => '(' + (i & 15) + ',' + (i >> 4) + ')';
  $('segs').innerHTML = '<li class="hd"><span>#</span><span>start</span><span>směr</span><span>konec</span></li>' +
    st.segs.slice(0, 40).map((s, k) => `<li><span>${k}</span><span>${xy(s.tile)}</span><span>${s.dir} ${ARROW[s.dir]}</span><span>${s.n} polí, ${s.end}</span></li>`).join('');
  if (!st.won && st.pf[st.exit] === T.EXIT_OPEN && !$('msg').textContent) setMsg('Východ je otevřený, dojeďte k němu.');
}
function move(dx, dy) {
  if (editing) return;
  const r = C.move(st, dx, dy); playSfx(C.takeEvents(st));
  if (r === 'win') {
    if (levelNo < D.levels.length - 1) { setMsg('Level hotový! Za chvíli začne další.'); setTimeout(() => load(levelNo + 1), 1600); }
    else setMsg('Všechny levely hotové! Gratulace.');
  }
}

// ---- výběr levelu ----
const sel = $('levelSel');
D.levels.forEach((L, i) => {
  const o = document.createElement('option'); o.value = i;
  o.textContent = 'Level ' + String(L.n ?? i).padStart(2, '0') + (L.image ? ' (' + L.image + ')' : ''); sel.append(o);
});
sel.addEventListener('change', () => { load(+sel.value); sel.blur(); });
$('btnPrev').addEventListener('click', () => load((levelNo + D.levels.length - 1) % D.levels.length));
$('btnNext').addEventListener('click', () => load((levelNo + 1) % D.levels.length));

// ---- editor ----
const TOOLS = [[0,'smazat'],[T.STONE,'kámen'],[T.MIRROR,'zrcadlo'],[T.BOX,'box'],[T.WALL,'zeď'],[T.SENSOR,'senzor'],
  [T.CAPS,'kapsle'],[T.RELAY,'relé'],[T.AIM,'zaměření'],[T.BREAK,'přerušovač'],[T.EMITTER,'emitor'],[T.EXIT,'východ'],['tank','tank']];
let tool = T.MIRROR;
const pal = $('palette');
TOOLS.forEach(([code, label]) => {
  const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', code === tool);
  const ic = document.createElement('canvas'); ic.width = 16; ic.height = 16;
  const g = ic.getContext('2d'); if (code === 'tank') g.drawImage(G.TANK[G.tankFrame(3)], 0, 0); else if (code) g.drawImage(G.ATLAS[code], 0, 0);
  b.append(ic, document.createTextNode(label));
  b.addEventListener('click', () => { tool = code; pal.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  pal.append(b);
});
cv.addEventListener('click', e => {
  if (!editing) return;
  const r = cv.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left) / r.width * W), ty = Math.floor((e.clientY - r.top) / r.height * H);
  if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
  const i = ty * W + tx;
  if (tool === 'tank') { if (st.pf[i] === 0) st.tank = i; }
  else if (i === st.tank && tool !== 0) return;
  else {
    if (i === st.emitter) st.emitter = 255;
    if (tool === T.EMITTER) { if (st.emitter !== 255) st.pf[st.emitter] = 0; st.emitter = i; }
    if (tool === T.EXIT) { if (st.pf[st.exit] >= T.EXIT && st.pf[st.exit] <= T.EXIT_OPEN) st.pf[st.exit] = 0; st.exit = i; }
    st.pf[i] = tool; st.timers[i] = 0;
  }
  if (tool === T.RELAY || st.relays.includes(i)) C.pairRelays(st);
  st.won = false; setMsg(''); step();
});

// ---- tlačítka a klávesy ----
$('btnReset').addEventListener('click', () => load(levelNo));
$('btnEdit').addEventListener('click', e => { editing = !editing; e.currentTarget.setAttribute('aria-pressed', editing); $('editCard').hidden = !editing; cv.classList.toggle('edit', editing); });
$('btnGrid').addEventListener('click', e => { showGrid = !showGrid; e.currentTarget.setAttribute('aria-pressed', showGrid); });
$('btnBeam').addEventListener('click', e => { beamMode = beamMode === 'pixel' ? 'blink' : 'pixel'; e.currentTarget.setAttribute('aria-pressed', beamMode === 'pixel'); e.currentTarget.textContent = beamMode === 'pixel' ? 'Animace: originál' : 'Animace: blikání'; });
$('btnRotate').addEventListener('click', () => { st.dir = (st.dir + 1) & 7; step(); });
document.querySelectorAll('.dpad button').forEach(b => b.addEventListener('click', () => { const [dx, dy] = b.dataset.d.split(',').map(Number); move(dx, dy); }));
const KEYS = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0], W:[0,-1], S:[0,1], A:[-1,0], D:[1,0] };
document.addEventListener('keydown', e => { const k = KEYS[e.key]; if (!k) return; e.preventDefault(); move(k[0], k[1]); });

// ---- zvuk: hudba (originální přehrávač CMC na emulovaném 6502) + efekty (druhý POKEY) ----
const MUSIC_MEM = Uint8Array.from(atob(D.musicMem), c => c.charCodeAt(0));   // RAM $7700–$8FFF
// skladby podle kódu originálu: 3 = titulka ($6E3A), ve hře 1/2 střídané po 4 levelech ($9897)
const SONGS = [['auto', 'Podle levelu (jako originál)'], [3, 'Titulka (3)'], [1, 'Hra A (1)'], [2, 'Hra B (2)'], [0, 'Skladba 0']];
const levelSong = n => (n & 4) ? 2 : 1;
let actx = null, node = null, musicGain = null, sfxGain = null, music = null, sfx = null;
let musicOn = false, sfxOn = true, songSel = 'auto', curSong = -1;
const mBuf = { a: null }, sBuf = { a: null };
function audioStart() {   // jeden výstup pro hudbu i efekty; spustí se až po gestu uživatele
  if (actx) { actx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  actx = new AC();
  music = new AtariAudio.CMCPlayer(MUSIC_MEM, 0x7700, actx.sampleRate);
  sfx = new AtariAudio.SFXPlayer(actx.sampleRate);
  node = actx.createScriptProcessor(4096, 0, 1);
  node.onaudioprocess = e => {
    const out = e.outputBuffer.getChannelData(0), n = out.length;
    if (!mBuf.a || mBuf.a.length !== n) { mBuf.a = new Float32Array(n); sBuf.a = new Float32Array(n); }
    if (musicOn) music.generate(mBuf.a); else mBuf.a.fill(0);
    sfx.generate(sBuf.a);
    const mv = $('vol').value / 100, sv = sfxOn ? $('volSfx').value / 50 : 0;   // efekty 2× (jsou tišší než hudba)
    for (let i = 0; i < n; i++) out[i] = mBuf.a[i] * mv + sBuf.a[i] * sv;
  };
  node.connect(actx.destination); actx.resume();
  syncSong(); return true;
}
function wantedSong() { return songSel === 'auto' ? levelSong(D.levels[levelNo].n ?? levelNo) : songSel; }
function syncSong() { const s = wantedSong(); if (music && s !== curSong) { music.song(s); curSong = s; } }
function playSfx(list) { if (sfx && sfxOn) list.forEach(name => sfx.play(name)); }
// první stisk klávesy nebo klik odemkne zvuk (pravidlo prohlížečů)
['keydown', 'pointerdown'].forEach(ev => document.addEventListener(ev, () => audioStart(), { once: true }));

$('btnMusic').addEventListener('click', e => {
  if (!audioStart()) { setMsg('Prohlížeč nepodporuje Web Audio.'); return; }
  musicOn = !musicOn;
  e.currentTarget.setAttribute('aria-pressed', musicOn); e.currentTarget.textContent = musicOn ? 'Zastavit hudbu' : 'Přehrát hudbu';
});
$('btnSfx').addEventListener('click', e => {
  sfxOn = !sfxOn; e.currentTarget.setAttribute('aria-pressed', sfxOn); e.currentTarget.textContent = sfxOn ? 'Efekty: zapnuté' : 'Efekty: vypnuté';
});
const songSelEl = $('songSel');
SONGS.forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; songSelEl.append(o); });
songSelEl.addEventListener('change', () => { songSel = songSelEl.value === 'auto' ? 'auto' : +songSelEl.value; curSong = -1; syncSong(); songSelEl.blur(); });
// náhled efektů
const sfxList = $('sfxList');
AtariAudio.SFX_NAMES.forEach(name => {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = name;
  b.addEventListener('click', () => { audioStart(); if (sfx) sfx.play(name); });
  sfxList.append(b);
});

// ---- smyčky ----
load(0);
setInterval(step, 160);   // herní smyčka originálu: 8 snímků při 50 Hz
const pv = $('beamPreview').getContext('2d');
(function loop(t) {
  G.render(ctx, st, t, { scale: SC, beamMode, grid: showGrid });
  G.renderBeamPreview(pv, t);
  requestAnimationFrame(loop);
})(0);
})();
