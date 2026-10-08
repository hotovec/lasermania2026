# Posouzení blit386 pro port (shrnutí)

Plná verze: [Claude Doc](https://claude.ai/code/artifact/c9ef4148-03e4-4f0a-8df5-b98ee0c28902). Stav k 2026-10-08,
blit386 1.7.1 (npm, ISC).

**Verdikt:** port je proveditelný, odhad 1–2 dny. Logika (`lm-core.js`) beze změny, grafika dobře sedí na
paletové vykreslování blit386. Jediná větší překážka je hudba: engine nemá API pro zvuk generovaný za běhu.

| Část | V blit386 | Poznámka |
| --- | --- | --- |
| logika, levely | import `@lasermania/js-demo/core`, `data.json` | beze změny |
| dlaždice, paprsek | `SpriteSheet.fromIndexedPixels`, indexy 1–5 | 192× `drawSprite` za snímek je v pořádku |
| tank | 4 předkreslené směry | `drawSprite` neumí rotaci (příznaky `ROT_*` jen připravené) |
| takt | `targetFPS: 50`, krok každých 8 ticků | `BT.ticks` = RTCLOK |
| vstup | `BT.isPressed(BTN_*, 0, repeat)` | navíc gamepad |
| hudba | předrenderovat (OGG + MP3) → `BT.musicPlay` s `loopStart/loopEnd` | `AudioClip` nemá konstruktor ze vzorků, `AudioContext` není přístupný; loadery berou i `blob:` URL |
| efekty | předrenderovat do WAV → `BT.soundPlay` | nebo `BT.synthPreset` |
| CRT vzhled | `Scanlines`, `BarrelDistortion`, `Bloom` | jen WebGPU, v software režimu `effectAdd` hází chybu |

Rizika: mladé API (14 verzí za 5 měsíců, přejmenování v 1.1.1 a 1.2.0) → verze je připnutá; dokumentace
na webu může popisovat novější verzi než připnutou (např. `testState()` je až v 1.8.0); Safari neumí OGG.
