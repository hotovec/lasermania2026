// Lasermania pro BLIT386 - startovní kostra portu.
//
// Zatím jen ověřuje, že monorepo funguje: herní logika a data se importují z referenčního dema
// (balíček @lasermania/js-demo ve složce ../js-demo) a logika běží v update() ve stejném taktu
// jako originál (50 Hz, herní krok každých 8 snímků). Grafika, zvuk a UI jsou úkoly portu,
// viz ../project/docs/porting-plan.md a "Your notes" v CLAUDE.md.

import { bootstrap, BT, Color32, Vector2i } from 'blit386';
import LMCore, { type GameState } from '@lasermania/js-demo/core';
import data from '@lasermania/js-demo/data.json';

// Paleta (slot 0 je vždy průhledný). Barvy PAL z originálu: pozadí, PF0 $22, PF1 $C4, PF2 $7C, PF3 $96.
const C_BLACK = 1;
const C_PF0 = 2;
const C_PF1 = 3;
const C_PF2 = 4;
const C_PF3 = 5;

const GAME_STEP_TICKS = 8; // herní smyčka originálu: 8 snímků = 160 ms

class Game {
    private state!: GameState;
    private levelNo = 0;

    configure() {
        return { displaySize: new Vector2i(320, 240), targetFPS: 50 }; // PAL
    }

    async init(): Promise<boolean> {
        const palette = BT.paletteCreate(16);
        palette.set(C_BLACK, new Color32(0, 0, 0, 255));
        palette.set(C_PF0, new Color32(0x59, 0x0f, 0x00, 255));
        palette.set(C_PF1, new Color32(0x24, 0x62, 0x00, 255));
        palette.set(C_PF2, new Color32(0xa9, 0xae, 0xe0, 255));
        palette.set(C_PF3, new Color32(0x2e, 0x69, 0x9c, 255));
        BT.paletteSet(palette);
        this.state = LMCore.createState(data.levels[this.levelNo]);
        return true;
    }

    update(): void {
        if (BT.ticks % GAME_STEP_TICKS === 0) LMCore.tick(this.state);
    }

    render(): void {
        BT.clear(C_BLACK);
        BT.systemPrint(new Vector2i(8, 8), C_PF2, 'LASERMANIA - start portu');
        BT.systemPrint(new Vector2i(8, 28), C_PF1, `levelu v datech: ${data.levels.length}`);
        BT.systemPrint(
            new Vector2i(8, 44),
            C_PF1,
            `level ${this.levelNo}: useku paprsku ${this.state.segs.length}, policek ${this.state.cells.length}`,
        );
        BT.systemPrint(new Vector2i(8, 60), C_PF3, `smer emitoru ${this.state.dir}, tank na ${this.state.tank}`);
    }
}

bootstrap(Game);
