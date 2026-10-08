// ESM vstup pro zvuk: emulátor 6502 + POKEY, přehrávač CMC a zvukové efekty (js/atari-audio.js).
import '../js/atari-audio.js';
const AtariAudio = globalThis.AtariAudio;
export default AtariAudio;
export const { CPU, POKEY, CMCPlayer, SFXPlayer, SFX_NAMES } = AtariAudio;
