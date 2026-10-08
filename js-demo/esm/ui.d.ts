// Typy pro js/lm-ui.js (stavový řádek, titulka v emulátoru 6502, barvy Atari).

/** RGB barvy Atari (PAL): známé barvy ze screenshotů přesně, ostatní z modelu. */
export declare function atariRGB(value: number): [number, number, number];
export declare const KNOWN_RGB: Record<number, [number, number, number]>;
/** Znak ANTIC 4 -> 8×8 indexů (0 pozadí, 1-3 PF0-PF2, 4 PF3 u kódu s bitem 7) do `out` od `o`, řádek `stride`. */
export declare function decodeChar4(font: Uint8Array, code: number, out: Uint8Array, o: number, stride: number): void;
/** Znak ANTIC 2 -> 8×8 bitů (1 = bit fontu). */
export declare function decodeChar2(font: Uint8Array, code: number, out: Uint8Array, o: number, stride: number): void;

export declare const STATUS_COLS: 40;
export declare const STATUS_ROWS: 3;
/** Šedé panely PMG pod stavovým řádkem: sloupce a barva Atari. */
export declare const STATUS_PANELS: { col: number; cols: number; color: number }[];
export declare const STATUS_FONT_CHARS: number;
export declare const EQ_COL: number;
export declare const EQ_WIDTH: number;
/** Ekvalizér $9E77: `step` jednou za snímek s hlasitostmi 3 kanálů CMC. */
export declare class Equalizer {
  peak: number[];
  timer: number[];
  cells: Uint8Array[];
  reset(): void;
  step(vols: ArrayLike<number>): void;
}
/** Kódy znaků stavového řádku (3×40) pro životy a level v BCD; životy se zobrazují - 1 jako v originále. */
export declare function statusbarCells(livesBcd: number, levelBcd: number, eq?: Equalizer | null, out?: Uint8Array): Uint8Array;
export declare function toBcd(n: number): number;

export declare const TITLE_MEM_BASE: number;
export declare const CYCLES_PER_FRAME: number;
/** Originální kód titulky / vítězné obrazovky v emulátoru 6502 nad RAM $5400-$93FF (data.titleMem). */
export declare class TitleMachine {
  constructor(titleMem: Uint8Array, entry?: 'title' | 'win');
  mem: Uint8Array;
  frames: number;
  iterations: number;
  setInput(start: boolean): void;
  readonly done: boolean;
  frame(): void;
  readonly screen: number;
  renderField(out: Uint8Array): Uint8Array;
  readonly scrollRows: Uint8Array;
  readonly vscroll: number;
}
/** Rozložení titulky originálu na displeji 320×240 a barvy (hodnoty Atari). */
export declare const TITLE: {
  fieldY: number; creditsY: number[]; scrollY: number; scrollH: number; maskY: number; maskH: number;
  copyrightY: number; x: number; credits: number[]; copyright: number; textFont: number;
  colors: { field: number[]; text: number[]; scroll: number[] };
  startDelayFrames: number;
};
declare const LMUi: {
  atariRGB: typeof atariRGB; KNOWN_RGB: typeof KNOWN_RGB; decodeChar4: typeof decodeChar4; decodeChar2: typeof decodeChar2;
  STATUS_COLS: typeof STATUS_COLS; STATUS_ROWS: typeof STATUS_ROWS; STATUS_PANELS: typeof STATUS_PANELS;
  STATUS_FONT_CHARS: typeof STATUS_FONT_CHARS; EQ_COL: typeof EQ_COL; EQ_WIDTH: typeof EQ_WIDTH;
  statusbarCells: typeof statusbarCells; Equalizer: typeof Equalizer; toBcd: typeof toBcd;
  TITLE_MEM_BASE: typeof TITLE_MEM_BASE; CYCLES_PER_FRAME: typeof CYCLES_PER_FRAME; TitleMachine: typeof TitleMachine;
  TITLE: typeof TITLE;
};
export default LMUi;
