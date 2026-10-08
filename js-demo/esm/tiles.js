// ESM vstup pro dlaždice a tank: spustí klasický skript js/lm-tiles.js (globalThis.LMTiles) a vrátí ho jako ES modul.
// Demo (lm-graphics.js) i port do blit386 tak kreslí ze stejných indexů barev.
import '../js/lm-tiles.js';
const LMTiles = globalThis.LMTiles;
export default LMTiles;
export const { TILE, COUNT, INV_ORIG, PAL, TANK_PAL, TANK_FRAMES, b64, decodeTiles, decodeTank, tankFrame,
               renderPlayfield } = LMTiles;
