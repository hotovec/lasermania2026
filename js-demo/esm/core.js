// ESM vstup pro herní logiku: spustí klasický skript js/lm-core.js (ten se zaregistruje
// jako globalThis.LMCore) a vrátí ho jako ES modul. Logika zůstává v jediném souboru,
// takže demo z file:// i port do blit386 používají přesně stejný kód.
import '../js/lm-core.js';
const LMCore = globalThis.LMCore;
export default LMCore;
export const { W, H, TYPES, DX, DY, START, REFLECT, ARROW, FIRST, T, NAME,
               createState, runLaser, tick, move, takeEvents, pairRelays, decodeLevel } = LMCore;
