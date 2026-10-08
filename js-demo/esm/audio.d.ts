// Typy pro js/atari-audio.js (emulátor 6502 + POKEY, přehrávač CMC, efekty).
import type { SoundEvent } from './core';

export declare class POKEY {
  constructor(sampleRate: number);
  reg: Uint8Array;
  write(addr: number, value: number): void;
  read(addr: number): number;
  render(buf: Float32Array, from: number, to: number): void;
}
export declare class CPU {
  constructor(mem: Uint8Array, io: { read(a: number): number; write(a: number, v: number): void });
  call(addr: number, a: number, x: number, y: number): void;
}
/** Originální přehrávač CMC ($8900) na emulovaném 6502; memImage = RAM $7700–$8FFF. */
export declare class CMCPlayer {
  constructor(memImage: Uint8Array, base: number, sampleRate: number);
  pokey: POKEY;
  /** 3 = titulka, 1 a 2 = ve hře (střídání po 4 levelech), 0 = další skladba v datech */
  song(pos: number): void;
  /** Vyplní buffer mono vzorky (-1..1), přehrávač se volá 50× za sekundu (PAL). */
  generate(buf: Float32Array): void;
}
/** Nové zvukové efekty (originál je nemá) generované druhým POKEY. */
export declare class SFXPlayer {
  constructor(sampleRate: number);
  play(name: SoundEvent): void;
  generate(buf: Float32Array): void;
}
export declare const SFX_NAMES: SoundEvent[];
declare const AtariAudio: { CPU: typeof CPU; POKEY: typeof POKEY; CMCPlayer: typeof CMCPlayer; SFXPlayer: typeof SFXPlayer; SFX_NAMES: typeof SFX_NAMES };
export default AtariAudio;
