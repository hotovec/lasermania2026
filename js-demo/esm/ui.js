// ESM vstup pro stavový řádek, titulku a barvy Atari: spustí klasické skripty js/atari-audio.js (CPU 6502)
// a js/lm-ui.js (globalThis.LMUi) a vrátí LMUi jako ES modul.
import '../js/atari-audio.js';
import '../js/lm-ui.js';
const LMUi = globalThis.LMUi;
export default LMUi;
export const { atariRGB, KNOWN_RGB, decodeChar4, decodeChar2, STATUS_COLS, STATUS_ROWS, STATUS_PANELS, STATUS_FONT_CHARS,
               EQ_COL, EQ_WIDTH, statusbarCells, Equalizer, toBcd, TITLE_MEM_BASE, CYCLES_PER_FRAME, TitleMachine,
               TITLE } = LMUi;
