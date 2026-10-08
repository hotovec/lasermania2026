# Lasermania – algoritmus laseru

Zdroj: rutina `run_laser` (`$A016`) v `original-sources/Lasermania.asm` (řádky ~3700–4180), okomentovaný
disassembly originálu (L.K. Avalon 1990) od MatoSimiho. Port 1:1 je `js-demo/js/lm-core.js`.

## Mřížka a geometrie

- Plocha 16×12 dlaždic, dlaždice = 2×2 znaky ANTIC → paprsek běží na mřížce **32×24 znaků**.
- Každý krok = 1 znak šikmo (±1, ±1). Paprsek nikdy neprochází rohy dlaždic: jde ze středu jedné hrany
  dlaždice na střed sousední hrany a v každé dlaždici zabere jednu čtvrtinu (jeden znak).
- Hranice dlaždic proto kříží střídavě: svislou, vodorovnou, svislou…

## 8 směrů

4 diagonály × 2 fáze podle toho, kterou hranici paprsek překročí dřív.

| Kód | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Diagonála | ↖ | ↗ | ↗ | ↘ | ↘ | ↙ | ↙ | ↖ |
| Nejdřív překročí | nahoru | nahoru | doprava | doprava | dolů | dolů | doleva | doleva |

Tabulky (v `lm-core.js` pod stejnými názvy): `DX`/`DY` (`L_A3C8`, `L_A3B8/C0`), startovní znak v dlaždici
`START` (`L_A390`), odraz `REFLECT` (`L_A398`), znak paprsku podle směru (`L_A3D0`).

## Výpočet (každý herní krok znovu)

1. Mapa se překreslí, starý paprsek zmizí.
2. Fronta úseků začne `{dlaždice emitoru, směr}`.
3. Pro každý úsek: krok po znacích.
   - Prázdný znak → nakreslit `/` nebo `\`, pokračovat.
   - Obsazený znak (dlaždice nebo už nakreslený paprsek) → úsek končí. Má-li dlaždice bit `$80`
     (odráží), přidá se do fronty nový úsek `{ta dlaždice, REFLECT[směr][krok & 1]}`.
4. Parita kroku říká, zda zásah byl do vodorovné, nebo svislé strany: vodorovná převrátí svislou složku
   směru, svislá vodorovnou. Pro všechny odrazové prvky stejně, tvar grafiky nehraje roli.

Detaily: paprsky se nekříží (zastaví se o vlastní stopu → nikdy se nezacyklí), fronta max. 255 úseků,
jeden emitor na level, tank paprsek neblokuje (je to sprite, v mapě není).

## Prvky reagující na zásah

| Kód | Prvek | Při zásahu |
| --- | --- | --- |
| `$20` | reflexní blok | odráží, dá se posouvat |
| `$04`–`$07`, `$0D` | pevné kameny / zdi | odrážejí |
| `$03`, `$3F` | posuvný box | pohltí |
| `$24` | ovladač zaměření | otočí emitor o jeden směr (každý krok, kdy je zasažen) |
| `$25` | dočasný přerušovač | zmizí, laser na 32 kroků vypne |
| `$26` | relé | paprsek pokračuje ze spárovaného relé stejným směrem (páry meta 8–15, i ↔ i^4) |
| `$35` | alarmový senzor | → `$36` → `$37` → `$38` → zmizí (animace přes časovač) |
| `$27` | laserová bomba | vybuchne + jedna náhodná dlaždice (pravidla `L_A2E5`) |
| `$23` | ovladač dveří | odráží; dokud je zasažen (nebo do něj narazí tank), otevírá dveře o fázi |
| `$22` | „pojistka“ | délka paprsku se zafixuje a každý krok klesá; na nule emitor vybuchne; kapsle délku obnoví |

Výbuch = animace `$2B` → `$2F` → prázdno. Otevřený východ `$34` (otevírá se `$30`→`$34` po zničení všech
senzorů a sebrání všech kapslí).

## Časování

Herní smyčka originálu: jeden krok každých **8 snímků** (PAL 50 Hz = 160 ms). Animace znaků paprsku:
každé 4 snímky (viz `game-data.md`).
