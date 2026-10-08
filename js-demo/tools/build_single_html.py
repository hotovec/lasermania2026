#!/usr/bin/env python3
"""Sloučí index.html + css + js do jednoho HTML souboru (třeba pro sdílení nebo publikaci).

    python3 tools/build_single_html.py                  # -> lasermania-single.html
    python3 tools/build_single_html.py --fragment out.html   # bez <html>/<head>/<body> obalu
"""
import argparse, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
ap = argparse.ArgumentParser(); ap.add_argument('out', nargs='?', default=os.path.join(ROOT, 'lasermania-single.html'))
ap.add_argument('--fragment', action='store_true'); a = ap.parse_args()
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read() + '</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read() + '</script>', html)
if a.fragment:
    head = html[html.index('<head>') + 6:html.index('</head>')]
    head = re.sub(r'<meta [^>]*>\n?', '', head)
    body = html[html.index('<body>') + 6:html.index('</body>')]
    html = head.strip() + '\n' + body.strip() + '\n'
open(a.out, 'w', encoding='utf-8').write(html); print('zapsáno', os.path.abspath(a.out), len(html), 'B')
