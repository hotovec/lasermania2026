// Typy pro dlaždice z originálních fontů, paprsek a tank z PMG dat (js/lm-tiles.js). Udržovat ručně při změně lm-tiles.js.

/** Rozměr dlaždice v pixelech (16). */
export declare const TILE: 16;
/** Počet dlaždic (64). */
export declare const COUNT: 64;
/** Bit $04 („inverse“ = PF3) z originální tabulky element_types, jen 0 nebo 4. */
export declare const INV_ORIG: readonly number[];
/** Barvy indexů 0–4: pozadí, PF0, PF1, PF2, PF3 (hex `#rrggbb`). */
export declare const PAL: readonly string[];
/** Barvy tanku pro indexy 1 (P0) a 2 (P1). */
export declare const TANK_PAL: readonly string[];
/** Počet snímků tanku (16). */
export declare const TANK_FRAMES: 16;
/** Dekóduje base64 (fonty v data.json). */
export declare function b64(s: string): Uint8Array<ArrayBuffer>;
/** 64 dlaždic 16×16 za sebou, hodnoty 0–4 (0 pozadí, 1 PF0, 2 PF1, 3 PF2, 4 PF3). */
export declare function decodeTiles(font1: Uint8Array, font2: Uint8Array): Uint8Array<ArrayBuffer>;
/** 16 snímků tanku 16×16 z PMG dat (512 B: P0 pak P1), hodnoty 0 průhledné, 1 P0, 2 P1. */
export declare function decodeTank(pmg: Uint8Array): Uint8Array<ArrayBuffer>;
/** Index snímku tanku: face jako GameState.face (0 nahoru, 1 doleva, 2 dolů, 3 doprava), fáze pásů 0/1. */
export declare function tankFrame(face: number, phase?: number, blocked?: boolean): number;
/** Animace paprsku (L_9F79): 4 fáze po 16 bajtech pro znaky 2–3 (4–5 pozpátku). */
export declare const BEAM_ANIM: readonly (readonly number[])[];
/** Znak paprsku podle směru 0–7 (L_A3D0), 2–5. */
export declare const BEAM_CHAR: readonly number[];
/** Počet glyfů paprsku (16 = 4 fáze × znaky 2–5). */
export declare const BEAM_GLYPHS: 16;
/** 8 bajtů znaku `ch` (2–5) ve fázi animace. */
export declare function beamBytes(phase: number, ch: number): number[];
/** 16 glyfů 8×8 (glyf = fáze*4 + znak-2), hodnoty 0 průhledné, 1–3 PF0–PF2. */
export declare function decodeBeam(): Uint8Array<ArrayBuffer>;
/** Index glyfu pro fázi 0–3 a směr buňky paprsku 0–7. */
export declare function beamGlyph(phase: number, dir: number): number;
/** Fáze animace z počítadla snímků (RTCLOK, 50 Hz): (ticks & $0C) >> 2. */
export declare function beamPhase(ticks: number): number;
/** Počet snímků plynulého pohybu tanku o jedno políčko (8 = jeden herní krok). */
export declare const MOVE_FRAMES: 8;
/** Posun tanku v pixelech od výchozího políčka ve fázi 0–7 pohybu ve směru face (L_9F21, beam_data+1). */
export declare function tankOffset(face: number, frame: number): { x: number; y: number };
/** Tank pro renderPlayfield: pozice (řádek*16 + sloupec), snímek a výstup decodeTank. */
export interface TankSprite { pos: number; frame: number; pixels: Uint8Array }
/** Paprsek pro renderPlayfield: buňky (GameState.cells), fáze a výstup decodeBeam. */
export interface BeamSprite { cells: readonly { x: number; y: number; dir: number }[]; phase: number; glyphs: Uint8Array }
/** Mapa 16×12 dlaždic → 256×192 indexů: dlaždice 0–4, paprsek 1–3 (průhledný), tank 5 (P0) a 6 (P1). */
export declare function renderPlayfield(tiles: Uint8Array, pf: ArrayLike<number>, tank?: TankSprite, beam?: BeamSprite): Uint8Array<ArrayBuffer>;

declare const LMTiles: {
  TILE: typeof TILE; COUNT: typeof COUNT; INV_ORIG: typeof INV_ORIG; PAL: typeof PAL; TANK_PAL: typeof TANK_PAL;
  TANK_FRAMES: typeof TANK_FRAMES; BEAM_ANIM: typeof BEAM_ANIM; BEAM_CHAR: typeof BEAM_CHAR;
  BEAM_GLYPHS: typeof BEAM_GLYPHS; b64: typeof b64; decodeTiles: typeof decodeTiles; decodeTank: typeof decodeTank;
  tankFrame: typeof tankFrame; MOVE_FRAMES: typeof MOVE_FRAMES; tankOffset: typeof tankOffset; beamBytes: typeof beamBytes; decodeBeam: typeof decodeBeam; beamGlyph: typeof beamGlyph;
  beamPhase: typeof beamPhase; renderPlayfield: typeof renderPlayfield;
};
export default LMTiles;
