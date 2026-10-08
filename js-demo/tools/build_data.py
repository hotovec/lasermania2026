#!/usr/bin/env python3
"""Vygeneruje data dema z původních zdrojů (../original-sources).

Výstupy:
    js/data.js              window.LM_DATA pro demo spouštěné z file:// (klasický skript)
    data/lasermania.json    stejná data jako JSON pro ostatní části monorepa (import '@lasermania/js-demo/data.json')

Použití (z kořene monorepa):
    npm run data                                        # = python3 js-demo/tools/build_data.py
    python3 js-demo/tools/build_data.py --levels 0-2    # jen vybrané levely

Čte:
    a400_ingame1.fnt, a800_ingame2.fnt   originální fonty dlaždic (horní / dolní řádek)
    compression/levels.xex               data levelů (surová, načítají se na $1A00)
    tool_stuff/lmdump0300                RAM dump originální hry od $0300 (hudba CMC $7700 + přehrávač $8900)
"""
import argparse, base64, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TANK = ['YYPPYYPPYYPP....', 'YYPPYYPPYYPP....', '..YY....PP....YY', '..PPYYYYPP....YY',
        '..YYYYYYYY..PPYY', 'PPYYYYYYYYPPPPYY', 'YYYYYYYYYYYY..YY', 'YYYYYYYYYYPP..YY',
        'PPYYYYYYPPPP..YY', 'PPPPPPPPPPPP..YY', 'YYPPPPPPPPYYPPYY', '..PPPPPPPP..PPYY',
        '..YYPPPPYY....YY', '..YY....PP....YY', 'YYPPYYPPYYPP....', 'YYPPYYPPYYPP....']


def decode_level(d, n, base=0x1A00):
    """RLE: bajt >= $80 -> (bajt & $7F) opakovat (další bajt + 1)x; po 192 dlaždicích 21 bajtů metadat."""
    p = ((d[0x80 + n] << 8) | d[n]) - base
    pf, y = [], 1
    while len(pf) < 192:
        b = d[p + y]
        if b & 0x80:
            pf += [b & 0x7F] * (d[p + y + 1] + 1); y += 2
        else:
            pf.append(b); y += 1
    return {'n': n, 'pf': pf[:192], 'meta': list(d[p + y:p + y + 21]), 'image': 'atari%03d' % (n + 2)}


def parse_levels(spec):
    out = []
    for part in spec.split(','):
        if '-' in part:
            a, b = part.split('-'); out += range(int(a), int(b) + 1)
        else:
            out.append(int(part))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default=os.path.normpath(os.path.join(HERE, '..', '..', 'original-sources')))
    ap.add_argument('--levels', default='0-52')
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'js', 'data.js'))
    ap.add_argument('--json', default=os.path.join(HERE, '..', 'data', 'lasermania.json'))
    a = ap.parse_args()
    R = lambda *p: open(os.path.join(a.repo, *p), 'rb').read()

    levels_bin = R('compression', 'levels.xex')
    count = sum(1 for n in range(0x80) if levels_bin[0x80 + n])   # nenulové horní bajty ukazatelů
    nums = [n for n in parse_levels(a.levels) if n < count]
    dump = R('tool_stuff', 'lmdump0300')
    data = {
        'font1': base64.b64encode(R('a400_ingame1.fnt')).decode(),
        'font2': base64.b64encode(R('a800_ingame2.fnt')).decode(),
        'levels': [decode_level(levels_bin, n) for n in nums],
        'tank': TANK,
        'musicMem': base64.b64encode(dump[0x7700 - 0x300:0x9000 - 0x300]).decode(),
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write('// Vygenerováno tools/build_data.py – neupravovat ručně.\n')
        f.write('// Levely: %s (z %d v levels.xex)\n' % (','.join(map(str, nums)), count))
        f.write('window.LM_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    os.makedirs(os.path.dirname(a.json), exist_ok=True)
    with open(a.json, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))
    print('zapsáno', os.path.abspath(a.out), 'a', os.path.abspath(a.json), '-', len(nums), 'levelů')


if __name__ == '__main__':
    main()
