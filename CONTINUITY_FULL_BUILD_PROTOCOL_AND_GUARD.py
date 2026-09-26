#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re,sys
ROOT=Path(__file__).resolve().parent
MARKER="v60-r7.15-s54-morocco-simulation-16-2026-09-26"
STORAGE="tcc:v1:morocco-s54-simulation-16-20260926"
MANIFEST="./morocco-s54-simulation-16-20260926"
FIXTURE="2029-07-15-morocco-full-multiyear-heavy-v1-s54sim16"
CACHE="tcc-v1-"+MARKER
SWURL="./sw.js?v="+MARKER
def req(c,m):
    if not c: raise RuntimeError(m)
def txt(n): return (ROOT/n).read_text(encoding="utf-8")
def sha(p):
    h=hashlib.sha256(); h.update(p.read_bytes()); return h.hexdigest()
def main():
    required={"index.html","manifest.webmanifest","release-contract.json","sw.js","src_main.js","src_core_runtime-config.js","src_design_physical_ipad_closure.css","src_components_modal.js","src_components_sidebar.js","morocco-4year-simulation-fixture.json","header-index.json","header-assets.bin","BUILD_AUDIT.txt","SHA256_MANIFEST.txt"}
    names={p.name for p in ROOT.iterdir() if p.is_file()}
    req(required<=names,"missing required package files")
    idx=txt("index.html"); sw=txt("sw.js"); main=txt("src_main.js"); rc=txt("src_core_runtime-config.js"); css=txt("src_design_physical_ipad_closure.css"); modal=txt("src_components_modal.js")
    man=json.loads(txt("manifest.webmanifest")); con=json.loads(txt("release-contract.json"))
    req("S54 Morocco Simulation 16" in idx,"wrong title")
    req(STORAGE in idx,"wrong storage identity")
    req(SWURL in idx and SWURL in rc,"wrong service-worker URL")
    req(CACHE in sw,"wrong cache identity")
    req(MARKER in main,"wrong App Health marker")
    req(man.get("id")==MANIFEST,"wrong manifest id")
    req(FIXTURE in idx,"wrong fixture revision")
    req("FINAL PRE-SIMULATION FITMENT SEAL" in css,"final fitment seal missing")
    req("checklist-stage-tab:nth-child(4)" in css and "white-space:nowrap !important" in css,"Checklist final-stage fit missing")
    req("outline:none !important" in css or "box-shadow:none !important" in css,"ordinary widget focus-ring closure missing")
    req("skipReturnFocus" in modal or "returnFocus" in modal,"modal focus-return closure missing")
    for stale in ["morocco-s54-simulation-15-20260926","s54sim15","v60-r7.14-s54-morocco-simulation-15-2026-09-26"]:
        for n in ["index.html","manifest.webmanifest","sw.js","src_main.js","src_core_runtime-config.js"]:
            req(stale not in txt(n),f"stale Simulation 15 identity in {n}")
    seal=con.get("sourceSeal",{}); files=seal.get("files",{})
    current={p.name:sha(p) for p in sorted(ROOT.iterdir()) if p.is_file() and p.name not in {"release-contract.json","SHA256_MANIFEST.txt"}}
    req(files==current,"release-contract source seal mismatch")
    print(f"SIMULATION 16 PACKAGE GUARD: PASS ({len(names)} files)")
if __name__=="__main__":
    try: main()
    except Exception as e:
        print("SIMULATION 16 PACKAGE GUARD: FAIL",e); sys.exit(1)
