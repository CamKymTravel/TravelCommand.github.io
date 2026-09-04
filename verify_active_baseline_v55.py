#!/usr/bin/env python3
from pathlib import Path
import argparse, hashlib, json, sys
ROOT=Path(__file__).resolve().parent
MANIFEST=ROOT/'ACTIVE_BASELINE_MANIFEST_V55.json'
SELF={'ACTIVE_BASELINE_MANIFEST_V55.json','verify_active_baseline_v55.py'}

def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--verify',action='store_true')
    args=ap.parse_args()
    if not args.verify:
        print('usage: verify_active_baseline_v55.py --verify'); return 2
    data=json.loads(MANIFEST.read_text())
    errors=[]
    expected=data['files']
    for name,meta in expected.items():
        p=ROOT/name
        if not p.exists(): errors.append(f'missing: {name}'); continue
        if p.stat().st_size!=meta['size']: errors.append(f'size changed: {name}')
        if sha(p)!=meta['sha256']: errors.append(f'hash changed: {name}')
    actual={p.name for p in ROOT.iterdir() if p.is_file() and p.name not in SELF}
    exp=set(expected)
    extra=sorted(actual-exp)
    if extra: errors += [f'unexpected: {x}' for x in extra]
    if errors:
        print('FAIL — V55 baseline differs')
        for e in errors: print(' -',e)
        return 1
    print(f"PASS — exact V55 active baseline ({len(expected)} protected files)")
    return 0
if __name__=='__main__': sys.exit(main())
