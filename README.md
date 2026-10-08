# Lasermania – monorepo

Lasermania (Atari 8bit, L.K. Avalon 1990): původní zdroje, referenční JS demo a port do enginu blit386.

| Složka | Obsah |
| --- | --- |
| `original-sources/` | původní repozitář Lasermania 2020 (MatoSimi), jen ke čtení |
| `js-demo/` | hratelné JS demo: 53 levelů, originální grafika a hudba, efekty (`js-demo/index.html`) |
| `lasermania-blit386/` | port do blit386 (Vite + TypeScript) |
| `project/` | sdílené dokumenty – začněte [project/README.md](project/README.md) |

## Rychlý start

Požadavky: Node.js ≥ 22.18, Python 3 (jen pro `npm run data`).

```sh
npm install        # všechny části najednou
npm run check      # testy logiky + typová kontrola portu
npm run dev        # port v prohlížeči
```

Demo funguje bez instalace: otevřete `js-demo/index.html`.

Pro práci s Claude Code čtěte [CLAUDE.md](CLAUDE.md).
