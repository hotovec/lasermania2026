# Lasermania – monorepo

Port hry Lasermania (Atari 8bit, L.K. Avalon 1990) do enginu blit386. Uživatel komunikuje česky:
odpovědi a dokumenty česky, kód a identifikátory anglicky.

## Mapa repozitáře

| Složka | Co to je | Pravidla |
| --- | --- | --- |
| `original-sources/` | původní repozitář Lasermania 2020 (MatoSimi): `Lasermania.asm` (okomentovaný disassembly originálu), fonty `*.fnt`, `compression/levels.xex`, `levels/*.tiff` (screenshoty 53 levelů), `msx/`, `tool_stuff/lmdump0300` (RAM dump originálu) | **jen ke čtení**, nic neměnit ani nepřesouvat |
| `js-demo/` | referenční JS demo = ověřená specifikace. Balíček `@lasermania/js-demo` | logiku měnit jen vědomě a s golden testy |
| `lasermania-blit386/` | port do blit386 1.7.1 (TypeScript, Vite) | vlastní `CLAUDE.md`; soubory spravované `blit` (viz níže) neupravovat |
| `project/` | sdílené dokumenty: algoritmus, datové formáty, plán portu, rozhodnutí | aktualizovat při každé podstatné změně |

Klíčové dokumenty (číst podle potřeby, ne všechny najednou):
- `project/docs/porting-plan.md` – milníky portu a jejich ověření, **aktuální stav**
- `project/docs/game-data.md` – formát levelů, typy dlaždic, grafika, paprsek, hudba
- `project/docs/laser-algorithm.md` – jak funguje laser
- `project/decisions.md` – proč je co tak, jak je (nová rozhodnutí přidávat nahoru)

## Jak části sahají jedna do druhé

- **Port → demo:** npm workspace závislost. V portu importovat jen přes veřejné vstupy:
  - `import LMCore, { type GameState } from '@lasermania/js-demo/core'` – herní logika (typy `js-demo/esm/core.d.ts`)
  - `import AtariAudio from '@lasermania/js-demo/audio'` – 6502 + POKEY, přehrávač CMC, `SFXPlayer`
  - `import data from '@lasermania/js-demo/data.json'` – fonty, 53 levelů, tank, RAM s hudbou
- **Demo → původní zdroje:** `js-demo/tools/build_data.py` čte `../original-sources` (`npm run data`).
- **Cokoli → dokumenty:** relativní cesty do `project/`.
- Nekopírovat kód ani data mezi částmi. Co potřebují dvě části, patří do `js-demo` (exporty v jeho `package.json`).

## Příkazy (z kořene)

- `npm install` – nainstaluje všechny workspaces (node_modules v kořeni)
- `npm run dev` – dev server portu (blit386)
- `npm run check` – golden testy logiky + typová kontrola portu. **Spustit po každé změně.**
- `npm run build` – produkční build portu
- `npm run data` – znovu vygeneruje data z `original-sources`
- `npm run golden:record` – nové golden otisky; jen po vědomé změně logiky a se záznamem v `project/decisions.md`
- Demo: otevřít `js-demo/index.html` přímo v prohlížeči (bez serveru); `npm run demo:single` sestaví jednosouborovou verzi

## Pravidla

- `js-demo/js/lm-core.js` je ověřený port originálu (golden testy, porovnání se screenshoty). Port ho používá,
  nepřepisuje. Chyba v logice se opravuje v `js-demo` + nové golden otisky + záznam v `decisions.md`.
- `js-demo/js/*.js` jsou klasické skripty (kvůli `file://`). Nepřevádět na ES moduly; ESM vstupy jsou v `js-demo/esm/`.
  Po změně veřejného API logiky aktualizovat `js-demo/esm/core.d.ts` a `audio.d.ts`.
- API blit386 ověřovat v `node_modules/blit386/dist/blit386.d.ts` (připnutá verze), nebo přes MCP `blit386-docs`.
  Web s dokumentací může popisovat novější verzi, než je připnutá.
- V `lasermania-blit386/` neupravovat soubory spravované `@blit386/kit` (`.blit/manifest.json`: skills, hooks,
  rules, `.claude/settings.json`, blok `blit-kit:managed` v `CLAUDE.md` a `AGENTS.md`). Vlastní poznámky patří
  do sekce „Your notes“ v `lasermania-blit386/CLAUDE.md`.
- Hotový milník = `npm run check` prochází, ověření z `porting-plan.md` provedeno, stav v plánu odškrtnutý.

## Práce s Claude Code

- Doporučeno spouštět z kořene: vidí všechny části. `CLAUDE.md` a skills z `lasermania-blit386/` se načtou,
  jakmile Claude sáhne na soubor v té složce. Hooky šablony blit386 platí jen při startu přímo v
  `lasermania-blit386/`; z kořene formátování obstará `.claude/hooks/format-blit.sh`.
- Pro čistě blit386 práci jde spustit i v `lasermania-blit386/` (načte se i tento soubor jako nadřazený);
  sousední složky pak zpřístupnit `/add-dir ../js-demo ../project ../original-sources`.
- Větší změny: nejdřív plan mode, pak jeden milník najednou.
