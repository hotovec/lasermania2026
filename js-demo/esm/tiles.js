// ESM vstup pro dlaždice: spustí klasický skript js/lm-tiles.js (globalThis.LMTiles) a vrátí ho jako ES modul.
// Demo (lm-graphics.js) i port do blit386 tak kreslí ze stejných indexů barev.
import '../js/lm-tiles.js';
const LMTiles = globalThis.LMTiles;
export default LMTiles;
export const { TILE, COUNT, INV_ORIG, PAL, b64, decodeTiles, renderPlayfield } = LMTiles;
