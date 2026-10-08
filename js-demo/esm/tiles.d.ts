// Typy pro dlaždice z originálních fontů a tank z PMG dat (js/lm-tiles.js). Udržovat ručně při změně lm-tiles.js.

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
/** Tank pro renderPlayfield: pozice (řádek*16 + sloupec), snímek a výstup decodeTank. */
export interface TankSprite { pos: number; frame: number; pixels: Uint8Array }
/** Mapa 16×12 dlaždic → 256×192 indexů 0–4 (bez paprsku); s `tank` navíc tank s indexy 5 (P0) a 6 (P1). */
export declare function renderPlayfield(tiles: Uint8Array, pf: ArrayLike<number>, tank?: TankSprite): Uint8Array<ArrayBuffer>;

declare const LMTiles: {
  TILE: typeof TILE; COUNT: typeof COUNT; INV_ORIG: typeof INV_ORIG; PAL: typeof PAL; TANK_PAL: typeof TANK_PAL;
  TANK_FRAMES: typeof TANK_FRAMES; b64: typeof b64; decodeTiles: typeof decodeTiles; decodeTank: typeof decodeTank;
  tankFrame: typeof tankFrame; renderPlayfield: typeof renderPlayfield;
};
export default LMTiles;
