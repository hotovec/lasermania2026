// Lasermania pro BLIT386.
//
// Herní logika, data a dlaždice se importují z referenčního dema (balíček @lasermania/js-demo ve
// složce ../js-demo). Logika běží v update() ve stejném taktu jako originál (50 Hz, herní krok
// každých 8 snímků). Stav portu viz ../project/docs/porting-plan.md a "Your notes" v CLAUDE.md.

import { bootstrap, BT, Color32, Rect2i, SpriteSheet, Vector2i } from 'blit386';
import LMCore, { type GameState } from '@lasermania/js-demo/core';
import LMTiles from '@lasermania/js-demo/tiles';
import data from '@lasermania/js-demo/data.json';

// Paleta (slot 0 je vždy průhledný). Barvy PAL z originálu: pozadí, PF0 $22, PF1 $C4, PF2 $7C, PF3 $96.
// Index dlaždice v (0 pozadí, 1-4 PF0-PF3) leží ve slotu v + 1.
const C_BLACK = 1;
const C_PF0 = 2;
const C_PF1 = 3;
const C_PF2 = 4;
const C_PF3 = 5;

const GAME_STEP_TICKS = 8; // herní smyčka originálu: 8 snímků = 160 ms

// Hrací plocha 256x192 na (32, 12): displej 320x240 je výřez screenshotu originálu (384x240) od x = 32.
const PF_X = 32;
const PF_Y = 12;
const TILE = LMTiles.TILE;
const SHEET_COLS = 8; // sheet 128x128 = 8x8 dlaždic

class Game {
    private state!: GameState;
    private levelNo = 0;
    private tiles!: SpriteSheet;
    private tileRects: Rect2i[] = [];
    private cellPos: Vector2i[] = [];

    configure() {
        return {
            displaySize: new Vector2i(320, 240),
            targetFPS: 50, // PAL
            isOverlayToggleHintVisible: false, // ikonka v rohu by kazila snímky; overlay dál přes Backquote
        };
    }

    async init(): Promise<boolean> {
        const palette = BT.paletteCreate(16);
        palette.set(C_BLACK, new Color32(0, 0, 0, 255));
        palette.set(C_PF0, new Color32(0x59, 0x0f, 0x00, 255));
        palette.set(C_PF1, new Color32(0x24, 0x62, 0x00, 255));
        palette.set(C_PF2, new Color32(0xa9, 0xae, 0xe0, 255));
        palette.set(C_PF3, new Color32(0x2e, 0x69, 0x9c, 255));
        BT.paletteSet(palette);

        this.tiles = this.buildTileSheet();
        for (let t = 0; t < LMTiles.COUNT; t++) {
            this.tileRects.push(new Rect2i((t % SHEET_COLS) * TILE, Math.floor(t / SHEET_COLS) * TILE, TILE, TILE));
        }
        for (let i = 0; i < LMCore.W * LMCore.H; i++) {
            this.cellPos.push(new Vector2i(PF_X + (i % LMCore.W) * TILE, PF_Y + Math.floor(i / LMCore.W) * TILE));
        }

        this.state = LMCore.createState(data.levels[this.levelNo]);
        return true;
    }

    // 64 dlaždic z originálních fontů (lm-tiles.js) do sheetu 8x8 dlaždic, index v -> slot v + 1
    private buildTileSheet(): SpriteSheet {
        const src = LMTiles.decodeTiles(LMTiles.b64(data.font1), LMTiles.b64(data.font2));
        const size = SHEET_COLS * TILE;
        const pixels = new Uint8Array(size * size);
        for (let t = 0; t < LMTiles.COUNT; t++) {
            const x0 = (t % SHEET_COLS) * TILE;
            const y0 = Math.floor(t / SHEET_COLS) * TILE;
            for (let y = 0; y < TILE; y++) {
                for (let x = 0; x < TILE; x++) {
                    pixels[(y0 + y) * size + x0 + x] = src[t * TILE * TILE + y * TILE + x] + C_BLACK;
                }
            }
        }
        return SpriteSheet.fromIndexedPixels(size, size, pixels);
    }

    update(): void {
        if (BT.ticks % GAME_STEP_TICKS === 0) LMCore.tick(this.state);
    }

    render(): void {
        BT.clear(C_BLACK);
        const pf = this.state.pf;
        for (let i = 0; i < pf.length; i++) {
            if (pf[i]) BT.drawSprite(this.tiles, this.tileRects[pf[i] & 63], this.cellPos[i]);
        }
    }
}

bootstrap(Game);
