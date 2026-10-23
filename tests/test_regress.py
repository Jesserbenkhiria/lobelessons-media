"""Proves the Shorts regression check catches a visual change. Run: python3 tests/test_regress.py"""
import os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix="regress_test_"); ref = os.path.join(T, "reference")
shutil.copytree(os.path.join(R, "qa/reference"), ref)
p = os.path.join(ref, "pilot_game", "t0.9.png")
im = Image.open(p); ImageDraw.Draw(im).rectangle([100, 300, 300, 420], fill="#0000ff"); im.save(p)   # simulate a moved/changed element
r = subprocess.run(["python3", "qa/regress.py", "days/pilot_game.json"], cwd=R, capture_output=True, text=True,
                   env=dict(os.environ, QA_REF=ref))
ok = r.returncode == 1 and "frame t0.9 differs" in r.stdout
print(("PASS" if ok else "FAIL") + " a changed frame is reported as a regression")
if not ok: print(r.stdout[-800:], r.stderr[-400:])
shutil.rmtree(T, ignore_errors=True)
print("REGRESS TESTS", "PASSED" if ok else "FAILED"); sys.exit(0 if ok else 1)
