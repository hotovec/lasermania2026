import type { LevelData } from '../esm/core';
/** Data z original-sources (generuje tools/build_data.py). Base64 řetězce: fonty, PMG tanku ($8700–$88FF), RAM s hudbou, font stavového řádku ($8400) a RAM titulky ($5400–$93FF). */
declare const data: { font1: string; font2: string; levels: LevelData[]; tankPmg: string; musicMem: string; statusFont: string; titleMem: string };
export default data;
