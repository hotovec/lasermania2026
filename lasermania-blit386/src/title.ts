// Titulka a vítězná obrazovka originálu 1990: originální kód běží v emulátoru 6502 (TitleMachine z
// ../js-demo/js/lm-ui.js) a port kreslí jeho obrazovku. Pole 16×8 dlaždic (ANTIC 4, fonty mění engine
// létajících písmen) se po každé iteraci animace dekóduje do sprite sheetu; titulky, © a scroller se kreslí
// po znacích z fontu $9000.

import { BT, type Palette, Rect2i, SpriteSheet, Vector2i } from 'blit386';
import LMUi from '@lasermania/js-demo/ui';
import LMTiles from '@lasermania/js-demo/tiles';
import data from '@lasermania/js-demo/data.json';
import { atariColor } from './statusbar';

export type TitleKind = 'title' | 'win';

const FIELD_W = 256;
const FIELD_H = 128;
const CHAR = 8;
const TEXT_COLS = 32;
const WIN_FIELD_Y = 56; // vítězná obrazovka: DL $6913 = 8 + 48 prázdných řádků, pak pole (scanline 64)
const WIN_COLORS = [0x24, 0x26, 0x88, 0x9a]; // $690F
const T = LMUi.TITLE;

export class TitleScreen {
    private machine: InstanceType<typeof LMUi.TitleMachine> | null = null;
    private kind: TitleKind = 'title';
    private fieldSlots: number[] = [];
    private winSlots: number[] = [];
    private textSheet!: SpriteSheet;
    private scrollSheet!: SpriteSheet;
    private glyphRects: Rect2i[] = [];
    private fieldSheet: SpriteSheet | null = null;
    private fieldIteration = -1;
    private readonly fieldPx = new Uint8Array(FIELD_W * FIELD_H);
    private readonly fieldRect = new Rect2i(0, 0, FIELD_W, FIELD_H);
    private readonly fieldPos = new Vector2i(T.x, T.fieldY);
    private readonly winPos = new Vector2i(T.x, WIN_FIELD_Y);
    private readonly maskRect = new Rect2i(T.x, T.maskY, FIELD_W, T.maskH);
    private readonly aboveScrollRect = new Rect2i(T.x, T.scrollY - CHAR, FIELD_W, CHAR);
    private blackSlot = 1;
    private readonly charPos = new Vector2i(0, 0);
    private readonly titleMem = LMTiles.b64(data.titleMem);

    /** Sloty palety od `first`: pole titulky 4, vítězná 4, text 4, scroller 4 (celkem `TitleScreen.slots`). */
    static readonly slots = 16;

    init(palette: Palette, first: number, blackSlot: number): void {
        this.blackSlot = blackSlot;
        const set = (colors: number[], at: number) =>
            colors.map((c, i) => (palette.set(at + i, atariColor(c)), at + i));
        this.fieldSlots = set(T.colors.field, first);
        this.winSlots = set(WIN_COLORS, first + 4);
        const textSlots = set(T.colors.text, first + 8);
        const scrollSlots = set(T.colors.scroll, first + 12);
        const font = this.titleMem.subarray(T.textFont - LMUi.TITLE_MEM_BASE);
        this.textSheet = glyphSheet(font, textSlots);
        this.scrollSheet = glyphSheet(font, scrollSlots);
        for (let code = 0; code < 256; code++) {
            this.glyphRects.push(new Rect2i((code % 16) * CHAR, Math.floor(code / 16) * CHAR, CHAR, CHAR));
        }
    }

    /** Spustí titulku nebo vítěznou obrazovku od začátku (nový stav emulátoru z dumpu). */
    start(kind: TitleKind): void {
        this.kind = kind;
        this.machine = new LMUi.TitleMachine(this.titleMem, kind);
        this.fieldIteration = -1;
    }

    get frames(): number {
        return this.machine?.frames ?? 0;
    }

    /** Jeden snímek: START / fire předá originálu (CONSOL / TRIG), vrátí true, když originál obrazovku opustil. */
    update(start: boolean): boolean {
        const m = this.machine;
        if (!m) return true;
        m.setInput(start);
        m.frame();
        return m.done;
    }

    render(): void {
        const m = this.machine;
        if (!m) return;
        if (m.iterations !== this.fieldIteration) {
            this.fieldIteration = m.iterations;
            const slots = this.kind === 'win' ? this.winSlots : this.fieldSlots;
            m.renderField(this.fieldPx);
            for (let i = 0; i < this.fieldPx.length; i++) {
                const v = this.fieldPx[i];
                this.fieldPx[i] = v ? slots[v - 1] : 0;
            }
            this.fieldSheet?.destroy();
            this.fieldSheet = SpriteSheet.fromIndexedPixels(FIELD_W, FIELD_H, this.fieldPx);
        }
        if (this.fieldSheet) {
            BT.drawSprite(this.fieldSheet, this.fieldRect, this.kind === 'win' ? this.winPos : this.fieldPos);
        }
        if (this.kind === 'win') return;
        const mem = m.mem;
        T.credits.forEach((addr, i) => this.drawText(this.textSheet, mem, addr, T.creditsY[i]));
        this.drawText(this.textSheet, mem, T.copyright, T.copyrightY);
        // scroller: 5 řádků s jemným posunem VSCROL, okno od scrollY, spodek zakrytý černou PMG maskou
        const rows = m.scrollRows;
        for (let r = 0; r < 5; r++) {
            const y = T.scrollY + r * CHAR - m.vscroll;
            if (y + CHAR <= T.scrollY || y >= T.maskY) continue;
            for (let c = 0; c < TEXT_COLS; c++) {
                const code = rows[r * TEXT_COLS + c];
                if (!code) continue;
                this.charPos.set(T.x + c * CHAR, y);
                BT.drawSprite(this.scrollSheet, this.glyphRects[code], this.charPos);
            }
        }
        // první viditelný řádek může přečnívat nad okno: zakrýt (v originále začíná okno až na scanline 188)
        BT.drawRectFill(this.aboveScrollRect, this.blackSlot);
        BT.drawRectFill(this.maskRect, this.blackSlot);
    }

    private drawText(sheet: SpriteSheet, mem: Uint8Array, addr: number, y: number): void {
        for (let c = 0; c < TEXT_COLS; c++) {
            const code = mem[addr + c];
            if (!code) continue;
            this.charPos.set(T.x + c * CHAR, y);
            BT.drawSprite(sheet, this.glyphRects[code], this.charPos);
        }
    }
}

// 256 znaků fontu $9000 v ANTIC 4 (kód s bitem 7 = "11" v PF3) do sheetu 16×16 znaků, index v -> slots[v - 1]
function glyphSheet(font: Uint8Array, slots: number[]): SpriteSheet {
    const size = 16 * CHAR;
    const px = new Uint8Array(size * size);
    for (let code = 0; code < 256; code++) {
        LMUi.decodeChar4(font, code, px, Math.floor(code / 16) * CHAR * size + (code % 16) * CHAR, size);
    }
    for (let i = 0; i < px.length; i++) px[i] = px[i] ? slots[px[i] - 1] : 0;
    return SpriteSheet.fromIndexedPixels(size, size, px);
}
