// Typy pro herní logiku Lasermanie (js/lm-core.js). Udržovat ručně při změně lm-core.js.

/** Level z levels.xex: 192 kódů dlaždic (16×12) + 21 bajtů metadat. */
export interface LevelData {
  n?: number;
  pf: number[];
  /** 0–3 ovladače dveří, 4–7 dveře, 8–15 relé (páry i <-> i^4), 16 emitor, 17 směr, 18 tank, 19 východ; 255 = nepoužito */
  meta: number[];
  image?: string;
}
/** Políčko paprsku na mřížce 32×24 znaků. */
export interface BeamCell { x: number; y: number; dir: number }
/** Úsek paprsku (pro ladění / UI). */
export interface BeamSegment { tile: number; dir: number; n: number; end: string }
export type SoundEvent = 'step' | 'push' | 'pickup' | 'bump' | 'door' | 'aim' | 'sensor' | 'gone'
  | 'explode' | 'breaker' | 'exitOpen' | 'laserDead' | 'win';

export interface GameState {
  /** kódy dlaždic 16×12, index = řádek*16 + sloupec */
  pf: Uint8Array;
  timers: Uint8Array;
  /** pozice emitoru, 255 = žádný / zničen */
  emitter: number;
  /** směr emitoru 0–7 */
  dir: number;
  tank: number;
  /** 0 nahoru, 1 doleva, 2 dolů, 3 doprava */
  face: number;
  exit: number;
  switches: number[];
  doors: number[];
  phase: number[];
  relays: number[];
  pause: number;
  limit: number;
  won: boolean;
  noLaser?: boolean;
  cells: BeamCell[];
  segs: BeamSegment[];
  hits: Set<number>;
  bumps: Set<number>;
  events: SoundEvent[];
}

export declare const W: 16;
export declare const H: 12;
export declare const TYPES: readonly number[];
export declare const DX: readonly number[];
export declare const DY: readonly number[];
export declare const START: readonly (readonly [number, number])[];
export declare const REFLECT: readonly (readonly [number, number])[];
export declare const ARROW: readonly string[];
export declare const FIRST: readonly string[];
export declare const T: Readonly<Record<'BOX' | 'WALL' | 'STONE' | 'EMITTER' | 'DOOR' | 'MIRROR' | 'CAPS' | 'DOORCTL'
  | 'AIM' | 'BREAK' | 'RELAY' | 'EXIT' | 'EXIT_OPEN' | 'SENSOR', number>>;
export declare const NAME: Readonly<Record<number, string>>;

export declare function createState(level: LevelData): GameState;
export declare function runLaser(st: GameState): void;
/** Jeden herní krok (originál: každých 8 snímků = 160 ms). */
export declare function tick(st: GameState): { sensors: number; caps: number };
/** Pohyb tanku o dlaždici; vrací 'win' při vjezdu do otevřeného východu. */
export declare function move(st: GameState, dx: number, dy: number): 'win' | null;
export declare function takeEvents(st: GameState): SoundEvent[];
export declare function pairRelays(st: GameState): void;
export declare function decodeLevel(bytes: Uint8Array, n: number, base?: number): LevelData;

declare const LMCore: {
  W: typeof W; H: typeof H; TYPES: typeof TYPES; DX: typeof DX; DY: typeof DY; START: typeof START;
  REFLECT: typeof REFLECT; ARROW: typeof ARROW; FIRST: typeof FIRST; T: typeof T; NAME: typeof NAME;
  createState: typeof createState; runLaser: typeof runLaser; tick: typeof tick; move: typeof move;
  takeEvents: typeof takeEvents; pairRelays: typeof pairRelays; decodeLevel: typeof decodeLevel;
};
export default LMCore;
