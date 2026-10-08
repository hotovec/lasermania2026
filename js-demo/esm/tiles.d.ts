// Typy pro dlaždice z originálních fontů (js/lm-tiles.js). Udržovat ručně při změně lm-tiles.js.

/** Rozměr dlaždice v pixelech (16). */
export declare const TILE: 16;
/** Počet dlaždic (64). */
export declare const COUNT: 64;
/** Bit $04 („inverse“ = PF3) z originální tabulky element_types, jen 0 nebo 4. */
export declare const INV_ORIG: readonly number[];
/** Barvy indexů 0–4: pozadí, PF0, PF1, PF2, PF3 (hex `#rrggbb`). */
export declare const PAL: readonly string[];
/** Dekóduje base64 (fonty v data.json). */
export declare function b64(s: string): Uint8Array<ArrayBuffer>;
/** 64 dlaždic 16×16 za sebou, hodnoty 0–4 (0 pozadí, 1 PF0, 2 PF1, 3 PF2, 4 PF3). */
export declare function decodeTiles(font1: Uint8Array, font2: Uint8Array): Uint8Array<ArrayBuffer>;
/** Mapa 16×12 dlaždic → 256×192 indexů 0–4 (bez paprsku a tanku). */
export declare function renderPlayfield(tiles: Uint8Array, pf: ArrayLike<number>): Uint8Array<ArrayBuffer>;

declare const LMTiles: {
  TILE: typeof TILE; COUNT: typeof COUNT; INV_ORIG: typeof INV_ORIG; PAL: typeof PAL; b64: typeof b64;
  decodeTiles: typeof decodeTiles; renderPlayfield: typeof renderPlayfield;
};
export default LMTiles;
