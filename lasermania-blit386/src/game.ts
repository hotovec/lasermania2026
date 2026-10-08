// Lasermania pro BLIT386.
//
// Herní logika, data, dlaždice, paprsek, tank a předrenderovaný zvuk se importují z referenčního dema
// (balíček @lasermania/js-demo ve složce ../js-demo). Logika běží v update() ve stejném taktu jako originál (50 Hz, herní krok
// každých 8 snímků); pohyb tanku se rozhodne na hranici kroku a 8 snímků se plynule animuje (jen kreslení).
// Stav portu viz ../project/docs/porting-plan.md a "Your notes" v CLAUDE.md.

import { bootstrap, BT, Color32, Rect2i, SpriteSheet, Vector2i } from 'blit386';
import LMCore, { type GameState } from '@lasermania/js-demo/core';
import LMTiles from '@lasermania/js-demo/tiles';
import data from '@lasermania/js-demo/data.json';
import { levelSong, type Song, Sound } from './sound';

// Paleta (slot 0 je vždy průhledný). Barvy PAL z originálu: pozadí, PF0 $22, PF1 $C4, PF2 $7C, PF3 $96.
// Index dlaždice v (0 pozadí, 1-4 PF0-PF3) leží ve slotu v + 1.
const C_BLACK = 1;
const C_PF0 = 2;
const C_PF1 = 3;
const C_PF2 = 4;
const C_PF3 = 5;
// Tank (PMG): index 1 = P0 žlutá $1E, 2 = P1 růžová $4A -> sloty 6 a 7.
const C_TANK_P0 = 6;
const C_TANK_P1 = 7;

const GAME_STEP_TICKS = 8; // herní smyčka originálu: 8 snímků = 160 ms
const WIN_DELAY_TICKS = 80; // po vjezdu do východu další level za 1,6 s (jako js-demo)
const LAST_LEVEL = data.levels.length - 1;
// Opakování pohybu při držení až po 480 ms nepřetržitého držení od stisku. Remake (control2.update,
// repeat_delay_first) čeká 2 kroky od hranice kroku, takže hranice kolísá 330-480 ms podle fáze stisku
// a stisk kolem 400 ms občas popojel o 2 políčka; tady je to horní mez, nezávislá na fázi.
const REPEAT_TICKS = 24;

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
// Zvuk: M hudba, N efekty (zap/vyp).
const KEY_MUSIC = 'KeyM';
const KEY_SFX = 'KeyN';
// Hlasitost busů: hudba jako výchozí posuvník dema (60 %), efekty plně (demo je zesiluje 1,4x).
const MUSIC_VOLUME = 0.6;
const SFX_VOLUME = 1;

// Směry joysticku v pořadí priority originálu při diagonále ($94D4): doprava > doleva > dolů > nahoru.
// face jako GameState.face (0 nahoru, 1 doleva, 2 dolů, 3 doprava).
interface Dir {
    button: number;
    dx: number;
    dy: number;
}
const DIRS: Dir[] = [
    { button: BT.BTN_RIGHT, dx: 1, dy: 0 },
    { button: BT.BTN_LEFT, dx: -1, dy: 0 },
    { button: BT.BTN_DOWN, dx: 0, dy: 1 },
    { button: BT.BTN_UP, dx: 0, dy: -1 },
];

/** Plynulý pohyb o jedno políčko (8 snímků); `push` = tlačená dlaždice, která klouže s tankem. */
interface MoveAnim {
    from: number;
    face: number;
    start: number;
    push: { from: number; to: number; tile: number } | null;
}

/**
 * Dev hook pro `npx blit play` (krok `state`, `eval:__game.load(n, kroky, fáze)`), jen v dev režimu.
 * `load(n, steps, phase)` provede `steps` herních kroků, logiku zastaví a drží fázi paprsku `phase`
 * (deterministický snímek pro porovnání se screenshotem, viz ../js-demo/data/screens.json). Při 0 krocích
 * je paprsek spočítaný na kopii stavu, mapa zůstává ze startu (jako tools/compare_screen.js levelState).
 * Klávesy výběru levelu logiku zase pustí.
 */
interface DevHook {
    state(): {
        level: number;
        tank: number;
        face: number;
        drawX: number;
        drawY: number;
        moving: boolean;
        blocked: boolean;
        won: boolean;
        finished: boolean;
        holdStart: number | null;
        lastMoveTick: number;
        pending: number;
        beamPhase: number;
        frozen: boolean;
        ticks: number;
        song: Song | null;
        musicPlaying: boolean;
        audioUnlocked: boolean;
        musicMuted: boolean;
        sfxMuted: boolean;
        /** posledních pár přehraných efektů */
        sounds: string[];
    };
    load(n: number, steps?: number, phase?: number): void;
    /** Fixture pro testy: tank na políčko `pos` (řádek*16 + sloupec). */
    setTank(pos: number): void;
    /** Fixture pro testy: dlaždice `code` na políčko `pos`. */
    setTile(pos: number, code: number): void;
    /** Kód dlaždice na políčku `pos` a počet buněk paprsku (kontrola v testech). */
    tile(pos: number): number;
    beamCells(): number;
}

class Game {
    private state!: GameState;
    private levelNo = 0;
    private frozen = false; // jen dev hook: logika stojí
    private frozenPhase: number | null = null; // jen dev hook: pevná fáze paprsku
    private pending: Dir | null = null; // první směr od posledního kroku (result_direction v control2)
    private lastDir: Dir | null = null; // směr posledního provedeného kroku (last_direction)
    private holdStart: number | null = null; // BT.ticks začátku nepřetržitého držení směru (null = nic)
    private lastMoveTick = -1; // BT.ticks posledního pokusu o pohyb
    private anim: MoveAnim | null = null;
    private blockedStart: number | null = null; // pokus o pohyb do překážky: 8 snímků „zablokovaného“ tanku
    private winAt: number | null = null; // BT.ticks vjezdu do východu
    private finished = false; // dohrán poslední level
    private readonly drawPos = new Vector2i(0, 0);
    private tiles!: SpriteSheet;
    private tileRects: Rect2i[] = [];
    private tank!: SpriteSheet;
    private tankRects: Rect2i[] = [];
    private cellPos: Vector2i[] = [];
    private beam!: SpriteSheet;
    private beamRects: Rect2i[] = [];
    private beamPos: Vector2i[] = [];
    private readonly sound = new Sound();

    configure() {
        return {
            displaySize: new Vector2i(320, 240),
            targetFPS: 50, // PAL
            isOverlayToggleHintVisible: false, // ikonka v rohu by kazila snímky; overlay dál přes Backquote
            isCapturingKeyboardScroll: true, // šipky ovládají tank, ne stránku
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

        // hráč 0: WASD (výchozí, jako wasd_keys v remaku) + šipky; gamepad hráče 0 se slučuje sám
        BT.inputMap(0, BT.BTN_UP, 'KeyW', 'ArrowUp');
        BT.inputMap(0, BT.BTN_LEFT, 'KeyA', 'ArrowLeft');
        BT.inputMap(0, BT.BTN_DOWN, 'KeyS', 'ArrowDown');
        BT.inputMap(0, BT.BTN_RIGHT, 'KeyD', 'ArrowRight');

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

        await this.sound.load();
        BT.audioVolumeSet('music', MUSIC_VOLUME);
        BT.audioVolumeSet('sfx', SFX_VOLUME);

        this.load(0);
        if (BT.isDevMode) {
            const hook: DevHook = {
                state: () => {
                    const { x, y } = this.tankDraw();
                    return {
                        level: this.levelNo,
                        tank: this.state.tank,
                        face: this.state.face,
                        drawX: x,
                        drawY: y,
                        moving: this.animFrame() !== null,
                        blocked: this.blockedFrame() !== null,
                        won: this.state.won,
                        finished: this.finished,
                        holdStart: this.holdStart,
                        lastMoveTick: this.lastMoveTick,
                        pending: this.pending ? DIRS.indexOf(this.pending) : -1,
                        beamPhase: this.beamPhase(),
                        frozen: this.frozen,
                        ticks: BT.ticks,
                        song: this.sound.song,
                        musicPlaying: BT.isMusicPlaying,
                        audioUnlocked: BT.isAudioUnlocked,
                        musicMuted: BT.isAudioMuted('music'),
                        sfxMuted: BT.isAudioMuted('sfx'),
                        sounds: [...this.sound.recent],
                    };
                },
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
                setTank: (pos) => {
                    this.state.tank = pos;
                    this.anim = null;
                },
                setTile: (pos, code) => {
                    this.state.pf[pos] = code;
                },
                tile: (pos) => this.state.pf[pos],
                beamCells: () => this.state.cells.length,
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
        this.pending = null;
        this.lastDir = null;
        this.holdStart = null;
        this.lastMoveTick = -1;
        this.anim = null;
        this.blockedStart = null;
        this.winAt = null;
        this.finished = false;
        this.sound.playSong(levelSong(this.levelNo));
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
        if (BT.isKeyPressed(KEY_MUSIC)) BT.audioMuteSet('music', !BT.isAudioMuted('music'));
        if (BT.isKeyPressed(KEY_SFX)) BT.audioMuteSet('sfx', !BT.isAudioMuted('sfx'));
        if (this.frozen) return;

        if (this.winAt !== null && BT.ticks - this.winAt >= WIN_DELAY_TICKS && !this.finished) {
            if (this.levelNo < LAST_LEVEL) this.load(this.levelNo + 1);
            else this.finished = true; // originál po levelu $53 končí
        }

        // vstup čte každý snímek (VBI control2), uloží první směr od posledního kroku (result_direction);
        // isPressed zachytí i ťuknutí kratší než snímek; nový stisk začne nové držení
        const held = DIRS.some((d) => BT.isDown(d.button, 0));
        const pressed = DIRS.some((d) => BT.isPressed(d.button, 0));
        if (pressed || (held && this.holdStart === null)) this.holdStart = BT.ticks;
        else if (!held) this.holdStart = null;
        if (this.pending === null && !this.state.won) {
            for (const d of DIRS) {
                if ((BT.isDown(d.button, 0) || BT.isPressed(d.button, 0)) && !this.isEarlyRepeat(d)) {
                    this.pending = d;
                    break;
                }
            }
        }

        if (BT.ticks % GAME_STEP_TICKS !== 0) return;
        const dir = this.pending;
        if (dir) {
            this.step(dir);
            this.lastDir = dir; // control2.clear
            this.lastMoveTick = BT.ticks;
        }
        this.pending = null;
        LMCore.tick(this.state);
        this.sound.playEvents(LMCore.takeEvents(this.state)); // události z move i tick
    }

    // pauza před opakováním (podle control2.update): nový stisk pohne tankem hned; stejný směr držený nepřetržitě
    // od minulého pohybu se uloží až po REPEAT_TICKS od stisku, pak jede plynule každý krok. Vyhodnocuje se
    // při ukládání směru, aby uvolnění klávesy těsně před hranicí kroku neudělalo z opakování nový stisk.
    // Změna směru za jízdy se nezdržuje; Shift nebo fire (BTN_A) pauzu přeskočí.
    private isEarlyRepeat(d: Dir): boolean {
        if (this.holdStart === null || this.holdStart > this.lastMoveTick || d !== this.lastDir) return false;
        if (BT.isKeyDown('ShiftLeft') || BT.isKeyDown('ShiftRight') || BT.isDown(BT.BTN_A, 0)) return false;
        return BT.ticks - this.holdStart < REPEAT_TICKS;
    }

    // pohyb na hranici kroku: logika (LMCore.move) hned, kreslení plynule dalších 8 snímků
    private step(d: Dir): void {
        const st = this.state;
        const from = st.tank;
        const ahead = from + d.dy * LMCore.W + d.dx;
        const aheadTile = st.pf[ahead];
        const events = st.events.length;
        const result = LMCore.move(st, d.dx, d.dy);
        const pushed = st.events.indexOf('push', events) >= 0;
        if (st.tank !== from) {
            const to = ahead + d.dy * LMCore.W + d.dx;
            this.anim = {
                from,
                face: st.face,
                start: BT.ticks,
                push: pushed ? { from: ahead, to, tile: aheadTile } : null,
            };
            this.blockedStart = null;
        } else {
            this.anim = null;
            this.blockedStart = BT.ticks;
        }
        if (result === 'win') this.winAt = BT.ticks;
    }

    // fáze plynulého pohybu 0-7, nebo null mimo animaci
    private animFrame(): number | null {
        if (!this.anim) return null;
        const f = BT.ticks - this.anim.start;
        return f >= 0 && f < LMTiles.MOVE_FRAMES ? f : null;
    }

    private blockedFrame(): number | null {
        if (this.blockedStart === null) return null;
        const f = BT.ticks - this.blockedStart;
        return f >= 0 && f < LMTiles.MOVE_FRAMES ? f : null;
    }

    // kde a jakým snímkem kreslit tank: během pohybu z výchozího políčka + posun (L_9F21 / beam_data+1),
    // pásy (fáze >> 2) & 1; zablokovaný tank snímky 8-15
    private tankDraw(): { x: number; y: number; frame: number } {
        const st = this.state;
        const f = this.animFrame();
        if (f !== null && this.anim) {
            const o = LMTiles.tankOffset(this.anim.face, f);
            const p = this.cellPos[this.anim.from];
            return { x: p.x + o.x, y: p.y + o.y, frame: LMTiles.tankFrame(this.anim.face, (f >> 2) & 1) };
        }
        const p = this.cellPos[st.tank];
        const b = this.blockedFrame();
        const frame = b !== null ? LMTiles.tankFrame(st.face, (b >> 2) & 1, true) : LMTiles.tankFrame(st.face);
        return { x: p.x, y: p.y, frame };
    }

    render(): void {
        BT.clear(C_BLACK);
        const pf = this.state.pf;
        const f = this.animFrame();
        const push = f !== null ? this.anim?.push : null;
        for (let i = 0; i < pf.length; i++) {
            if (pf[i] && !(push && i === push.to))
                BT.drawSprite(this.tiles, this.tileRects[pf[i] & 63], this.cellPos[i]);
        }
        // tlačená dlaždice klouže spolu s tankem (v originále PMG hráči 2 a 3)
        if (push && f !== null && this.anim) {
            const o = LMTiles.tankOffset(this.anim.face, f);
            const p = this.cellPos[push.from];
            this.drawPos.set(p.x + o.x, p.y + o.y);
            BT.drawSprite(this.tiles, this.tileRects[push.tile & 63], this.drawPos);
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
        if (this.state.tank < pf.length) {
            const { x, y, frame } = this.tankDraw();
            this.drawPos.set(x, y);
            BT.drawSprite(this.tank, this.tankRects[frame], this.drawPos);
        }
        // dočasné hlášky do stavového řádku (M6 ho nahradí originálním)
        if (this.finished) BT.systemPrint(new Vector2i(PF_X, 212), C_PF2, 'VSECHNY LEVELY HOTOVE');
        else if (this.winAt !== null) BT.systemPrint(new Vector2i(PF_X, 212), C_PF2, 'LEVEL HOTOVY');
    }
}

bootstrap(Game);
