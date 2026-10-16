#!/usr/bin/env python3
"""
Cross-check translatable strings of the applet against the .pot and every .po.

Reports strings used in settings-schema.json / applet.js _() but missing from the .pot,
.pot entries nothing uses, empty translations and %s/%d placeholder mismatches
(msgfmt -c misses the last two: the entries carry no c-format flag).

Usage (from the repo root): python3 .claude/skills/settings-and-i18n/check-i18n.py
Prints nothing when everything is clean.
"""
import glob
import json
import re
import sys

A = (sys.argv[1] if len(sys.argv) > 1 else '.') + '/applet/voice-keyboard@perlover'


def po(path):
    q = lambda s: ''.join(json.loads(x) for x in re.findall(r'"(?:[^"\\]|\\.)*"', s))
    text = open(path, encoding='utf-8').read()
    pairs = re.findall(r'^msgid ((?:".*"\n)+)msgstr ((?:".*"\n?)+)', text, re.M)
    return {q(i): q(s) for i, s in pairs if q(i)}


used = set()
for key, v in json.load(open(A + '/settings-schema.json', encoding='utf-8')).items():
    if key == 'version-label':
        continue
    used |= {v[f] for f in ('description', 'tooltip', 'units') if f in v}
    used |= set(v.get('options', {})) | {c['title'] for c in v.get('columns', [])}
applet = open(A + '/applet.js', encoding='utf-8').read()
used |= {json.loads('"%s"' % s) for s in re.findall(r'\b_\("((?:[^"\\]|\\.)*)"\)', applet)}

pot = po(A + '/po/voice-keyboard@perlover.pot')
for s in sorted(used - set(pot)):
    print('NOT IN .pot:', s)
for s in sorted(set(pot) - used):
    print('STALE in .pot:', s)
for f in sorted(glob.glob(A + '/po/*.po')):
    t = po(f)
    for s in pot:
        if not t.get(s):
            print(f, 'UNTRANSLATED:', s)
        elif sorted(re.findall(r'%[sd]', s)) != sorted(re.findall(r'%[sd]', t[s])):
            print(f, 'PLACEHOLDER:', s)
