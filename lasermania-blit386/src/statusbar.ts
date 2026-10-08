// Stavový řádek originálu 1990: 3 řádky ANTIC 2 pod hrací plochou (y 208), font $8400 kreslený inverzně
// na šedých panelech z PMG. Obsah a ekvalizér počítá ../js-demo/js/lm-ui.js (statusbarCells, Equalizer).

import { BT, Color32, type Palette, Rect2i, SpriteSheet, Vector2i } from 'blit386';
import LMUi from '@lasermania/js-demo/ui';
import LMTiles from '@lasermania/js-demo/tiles';
import data from '@lasermania/js-demo/data.json';

export const STATUS_Y = 208;
const CHAR = 8;
const SHEET_COLS = 16;

export class StatusBar {
    readonly eq = new LMUi.Equalizer();
    private sheet!: SpriteSheet;
    private rects: Rect2i[] = [];
    private pos: Vector2i[] = [];
    private panels: { rect: Rect2i; slot: number }[] = [];
    private readonly cells = new Uint8Array(LMUi.STATUS_COLS * LMUi.STATUS_ROWS);

    /** Glyfy: jedničkový bit fontu = `blackSlot`, nulový průhledný (pod ním panel nebo černé pozadí). */
    init(palette: Palette, blackSlot: number, firstPanelSlot: number): void {
        const font = LMTiles.b64(data.statusFont);
        const count = LMUi.STATUS_FONT_CHARS;
        const w = SHEET_COLS * CHAR;
        const h = Math.ceil(count / SHEET_COLS) * CHAR;
        const pixels = new Uint8Array(w * h);
        for (let ch = 0; ch < count; ch++) {
            const o = Math.floor(ch / SHEET_COLS) * CHAR * w + (ch % SHEET_COLS) * CHAR;
            LMUi.decodeChar2(font, ch, pixels, o, w);
            this.rects.push(new Rect2i((ch % SHEET_COLS) * CHAR, Math.floor(ch / SHEET_COLS) * CHAR, CHAR, CHAR));
        }
        for (let i = 0; i < pixels.length; i++) pixels[i] = pixels[i] ? blackSlot : 0;
        this.sheet = SpriteSheet.fromIndexedPixels(w, h, pixels);
        for (let i = 0; i < this.cells.length; i++) {
            this.pos.push(
                new Vector2i((i % LMUi.STATUS_COLS) * CHAR, STATUS_Y + Math.floor(i / LMUi.STATUS_COLS) * CHAR),
            );
        }
        // šedé panely (barvy hráčů P0-P3); stejné barvy sdílí slot
        const slots = new Map<number, number>();
        for (const p of LMUi.STATUS_PANELS) {
            let slot = slots.get(p.color);
            if (slot === undefined) {
                slot = firstPanelSlot + slots.size;
                slots.set(p.color, slot);
                palette.set(slot, atariColor(p.color));
            }
            this.panels.push({
                rect: new Rect2i(p.col * CHAR, STATUS_Y, p.cols * CHAR, LMUi.STATUS_ROWS * CHAR),
                slot,
            });
        }
    }

    /** Počet slotů palety pro panely (od `firstPanelSlot`). */
    static panelSlots(): number {
        return new Set(LMUi.STATUS_PANELS.map((p) => p.color)).size;
    }

    /** Životy a level jako čísla (zobrazí se v BCD, životy - 1 jako v originále). */
    render(lives: number, level: number): void {
        LMUi.statusbarCells(LMUi.toBcd(lives % 100), LMUi.toBcd(level % 100), this.eq, this.cells);
        for (const p of this.panels) BT.drawRectFill(p.rect, p.slot);
        // všechny buňky včetně kódu 0: prázdný znak je v inverzním fontu černý (mezery mezi ikonami a čísly)
        for (let i = 0; i < this.cells.length; i++) BT.drawSprite(this.sheet, this.rects[this.cells[i]], this.pos[i]);
    }
}

/** Barva Atari (hodnota registru) jako Color32 (lm-ui.js atariRGB). */
export function atariColor(value: number): Color32 {
    const [r, g, b] = LMUi.atariRGB(value);
    return new Color32(r, g, b, 255);
}
