// Lasermania pro BLIT386.
//
// Herní logika, data, dlaždice, paprsek a tank se importují z referenčního dema (balíček @lasermania/js-demo ve
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
// Tank (PMG): index 1 = P0 žlutá $C8, 2 = P1 růžová $A4 -> sloty 6 a 7.
const C_TANK_P0 = 6;
const C_TANK_P1 = 7;

const GAME_STEP_TICKS = 8; // herní smyčka originálu: 8 snímků = 160 ms

// Hrací plocha 256x192 na (32, 12): displej 320x240 je výřez screenshotu originálu (384x240) od x = 32.
const PF_X = 32;
const PF_Y = 12;
const TILE = LMTiles.TILE;
const SHEET_COLS = 8; // sheet 128x128 = 8x8 dlaždic
const CELL = 8; // buňka paprsku = znak 8x8, mřížka 32x24

// Výběr levelu (originál má jen joystick): PageDown další, PageUp předchozí, R restart.
const KEY_NEXT = 'PageDown';
const KEY_PREV = 'PageUp';
const KEY_RESTART = 'KeyR';

/**
 * Dev hook pro `npx blit play` (krok `state`, `eval:__game.load(n, kroky, fáze)`), jen v dev režimu.
 * `load(n, steps, phase)` provede `steps` herních kroků, logiku zastaví a drží fázi paprsku `phase`
 * (deterministický snímek pro porovnání se screenshotem, viz ../js-demo/data/screens.json). Při 0 krocích
 * je paprsek spočítaný na kopii stavu, mapa zůstává ze startu (jako tools/compare_screen.js levelState).
 * Klávesy výběru levelu logiku zase pustí.
 */
interface DevHook {
    state(): { level: number; tank: number; face: number; beamPhase: number; frozen: boolean; ticks: number };
    load(n: number, steps?: number, phase?: number): void;
}

class Game {
    private state!: GameState;
    private levelNo = 0;
    private frozen = false; // jen dev hook: logika stojí
    private frozenPhase: number | null = null; // jen dev hook: pevná fáze paprsku
    private tiles!: SpriteSheet;
    private tileRects: Rect2i[] = [];
    private tank!: SpriteSheet;
    private tankRects: Rect2i[] = [];
    private cellPos: Vector2i[] = [];
    private beam!: SpriteSheet;
    private beamRects: Rect2i[] = [];
    private beamPos: Vector2i[] = [];

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
        palette.set(C_TANK_P0, new Color32(0xdf, 0xd7, 0x77, 255));
        palette.set(C_TANK_P1, new Color32(0xc9, 0x6e, 0xd7, 255));
        BT.paletteSet(palette);

        this.tiles = this.buildTileSheet();
        for (let t = 0; t < LMTiles.COUNT; t++) {
            this.tileRects.push(new Rect2i((t % SHEET_COLS) * TILE, Math.floor(t / SHEET_COLS) * TILE, TILE, TILE));
        }
        for (let i = 0; i < LMCore.W * LMCore.H; i++) {
            this.cellPos.push(new Vector2i(PF_X + (i % LMCore.W) * TILE, PF_Y + Math.floor(i / LMCore.W) * TILE));
        }

        this.tank = this.buildTankSheet();
        for (let f = 0; f < LMTiles.TANK_FRAMES; f++) this.tankRects.push(new Rect2i(f * TILE, 0, TILE, TILE));

        this.beam = this.buildBeamSheet();
        for (let g = 0; g < LMTiles.BEAM_GLYPHS; g++) this.beamRects.push(new Rect2i(g * CELL, 0, CELL, CELL));
        for (let i = 0; i < LMCore.W * 2 * LMCore.H * 2; i++) {
            this.beamPos.push(
                new Vector2i(PF_X + (i % (LMCore.W * 2)) * CELL, PF_Y + Math.floor(i / (LMCore.W * 2)) * CELL),
            );
        }

        this.load(0);
        if (BT.isDevMode) {
            const hook: DevHook = {
                state: () => ({
                    level: this.levelNo,
                    tank: this.state.tank,
                    face: this.state.face,
                    beamPhase: this.beamPhase(),
                    frozen: this.frozen,
                    ticks: BT.ticks,
                }),
                load: (n, steps, phase) => {
                    this.load(n);
                    if (steps === undefined) return;
                    for (let k = 0; k < steps; k++) LMCore.tick(this.state);
                    if (steps === 0) {
                        const beam = LMCore.createState(data.levels[this.levelNo]);
                        LMCore.runLaser(beam);
                        this.state.cells = beam.cells;
                    }
                    this.frozen = true;
                    this.frozenPhase = phase ?? null;
                },
            };
            (window as unknown as { __game: DevHook }).__game = hook;
        }
        return true;
    }

    // jako load() v js-demo/js/game.js: nový stav levelu n (cyklicky přes všechny levely)
    private load(n: number): void {
        const count = data.levels.length;
        this.levelNo = ((n % count) + count) % count;
        this.state = LMCore.createState(data.levels[this.levelNo]);
        this.frozen = false;
        this.frozenPhase = null;
    }

    // fáze animace paprsku jako VBI originálu: (RTCLOK & $0C) >> 2, RTCLOK = BT.ticks (50 Hz)
    private beamPhase(): number {
        return this.frozenPhase ?? LMTiles.beamPhase(BT.ticks);
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

    // 16 PMG snímků tanku (lm-tiles.js) vedle sebe, index 1/2 -> slot C_TANK_P0/P1, 0 průhledné
    private buildTankSheet(): SpriteSheet {
        const src = LMTiles.decodeTank(LMTiles.b64(data.tankPmg));
        const width = LMTiles.TANK_FRAMES * TILE;
        const pixels = new Uint8Array(width * TILE);
        for (let f = 0; f < LMTiles.TANK_FRAMES; f++) {
            for (let y = 0; y < TILE; y++) {
                for (let x = 0; x < TILE; x++) {
                    const v = src[f * TILE * TILE + y * TILE + x];
                    pixels[y * width + f * TILE + x] = v ? v + C_TANK_P0 - 1 : 0;
                }
            }
        }
        return SpriteSheet.fromIndexedPixels(width, TILE, pixels);
    }

    // 16 glyfů paprsku (lm-tiles.js, glyf = fáze*4 + znak-2) vedle sebe, index 1-3 -> slot PF0-PF2, 0 průhledné
    private buildBeamSheet(): SpriteSheet {
        const src = LMTiles.decodeBeam();
        const width = LMTiles.BEAM_GLYPHS * CELL;
        const pixels = new Uint8Array(width * CELL);
        for (let g = 0; g < LMTiles.BEAM_GLYPHS; g++) {
            for (let y = 0; y < CELL; y++) {
                for (let x = 0; x < CELL; x++) {
                    const v = src[g * CELL * CELL + y * CELL + x];
                    pixels[y * width + g * CELL + x] = v ? v + C_BLACK : 0;
                }
            }
        }
        return SpriteSheet.fromIndexedPixels(width, CELL, pixels);
    }

    update(): void {
        if (BT.isKeyPressed(KEY_NEXT)) this.load(this.levelNo + 1);
        else if (BT.isKeyPressed(KEY_PREV)) this.load(this.levelNo - 1);
        else if (BT.isKeyPressed(KEY_RESTART)) this.load(this.levelNo);
        if (!this.frozen && BT.ticks % GAME_STEP_TICKS === 0) LMCore.tick(this.state);
    }

    render(): void {
        BT.clear(C_BLACK);
        const pf = this.state.pf;
        for (let i = 0; i < pf.length; i++) {
            if (pf[i]) BT.drawSprite(this.tiles, this.tileRects[pf[i] & 63], this.cellPos[i]);
        }
        // paprsek nad dlaždicemi, pod tankem (PMG má v originále přednost před playfieldem)
        const phase = this.beamPhase();
        for (const c of this.state.cells) {
            BT.drawSprite(
                this.beam,
                this.beamRects[LMTiles.beamGlyph(phase, c.dir)],
                this.beamPos[c.y * LMCore.W * 2 + c.x],
            );
        }
        const tank = this.state.tank;
        if (tank < pf.length)
            BT.drawSprite(this.tank, this.tankRects[LMTiles.tankFrame(this.state.face)], this.cellPos[tank]);
    }
}

bootstrap(Game);
