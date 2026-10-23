#!/usr/bin/env python3
"""Visual regression for the Shorts pipeline.

Renders fixed frames of reference specs with the CURRENT pipeline (voice.py + render.js, untouched)
and compares them with the saved reference frames in qa/reference/<spec>/.

usage:
  python3 qa/regress.py              # compare (exit 1 on any regression)
  python3 qa/regress.py --update     # (re)create the references: only after a change you have reviewed
  python3 qa/regress.py --determinism  # also render twice and require identical frames

Each reference keeps the exact timestamps and the line timings it was made with, so a change in
voice timing is reported as a timing regression, not hidden by recomputed timestamps.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.environ.get("QA_REF", os.path.join(R, "qa", "reference"))
WORK = "/home/claude/lobe_out/_regress"
# frozen copies of approved episodes: editing an episode in days/ never looks like a renderer regression
SPECS = ["qa/fixtures/pilot_game.json", "qa/fixtures/test_raise.json", "qa/fixtures/day07.json"]
SHARED = ["pipeline/render.js", "pipeline/lobe_rig.js", "pipeline/voice.py", "pipeline/mix.py",
          "pipeline/sfx.py", "pipeline/build.sh", "pipeline/publish.sh", "pipeline/setup.sh"]
SIZE = (540, 960)          # compare at half resolution (enough to see any layout/pose change)
MAX_CHANGED_PCT = 0.30     # % of pixels allowed to differ by more than 24/255 (JPEG noise is ~0)
MAX_MEAN = 0.6             # mean absolute difference allowed (0..255)
ENV = dict(os.environ, NODE_PATH="/opt/npm-tools/node_modules")


def sh(cmd):
    r = subprocess.run(cmd, cwd=R, env=ENV, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"command failed: {' '.join(cmd)}\n{r.stdout[-800:]}\n{r.stderr[-800:]}")
    return r.stdout


def sha(p):
    return hashlib.sha1(open(os.path.join(R, p), "rb").read()).hexdigest()


def render(spec, out, times):
    """voice timeline + stills at `times` + cover, using the unchanged Shorts pipeline."""
    os.makedirs(out, exist_ok=True)
    sh(["python3", "pipeline/voice.py", spec, out])
    shutil.rmtree(os.path.join(out, "stills"), ignore_errors=True)
    if times:
        sh(["node", "pipeline/render.js", "short", spec, out] + [f"{t:.1f}" for t in times])
    sh(["node", "pipeline/render.js", "cover", spec, out])
    tl = json.load(open(os.path.join(out, "timeline.json")))
    frames = {f"t{t:.1f}": os.path.join(out, "stills", f"still_{t:.1f}.jpg") for t in times}
    frames["cover"] = os.path.join(out, "cover.jpg")
    return tl, frames


def small(p):
    return np.asarray(Image.open(p).convert("RGB").resize(SIZE, Image.BILINEAR), np.int16)


def diff(a, b):
    d = np.abs(a - b).max(axis=2)
    return float(d.mean()), float((d > 24).mean() * 100)


def default_times(tl):
    # one frame inside every line (1 s in, or mid-line for short lines) plus the very first frame (the hook)
    ts = [0.1] + [round(l["start"] + min(1.0, (l["end"] - l["start"]) / 2), 1) for l in tl["lines"]]
    return sorted(set(ts))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--update", action="store_true")
    ap.add_argument("--determinism", action="store_true")
    ap.add_argument("specs", nargs="*", default=SPECS)
    a = ap.parse_args()
    report = {"status": "pass", "specs": [], "shared_files": {}}
    base = os.path.join(REF, "shared_files.json")
    if os.path.exists(base) and not a.update:
        old = json.load(open(base))
        report["shared_files"] = {p: ("unchanged" if old.get(p) == sha(p) else "CHANGED") for p in SHARED}
    for spec in a.specs:
        name = os.path.splitext(os.path.basename(spec))[0]
        rdir = os.path.join(REF, name); man_p = os.path.join(rdir, "manifest.json")
        out = os.path.join(WORK, name)
        if a.update:
            tl, _ = render(spec, out, [])                      # timeline first, to pick the timestamps
            times = default_times(tl)
            tl, frames = render(spec, out, times)
            shutil.rmtree(rdir, ignore_errors=True); os.makedirs(rdir)
            for k, p in frames.items():
                Image.open(p).convert("RGB").resize(SIZE, Image.BILINEAR).save(os.path.join(rdir, k + ".png"))
            json.dump({"spec": spec, "times": times, "lines": tl["lines"], "duration": tl["duration"]},
                      open(man_p, "w"), indent=1)
            report["specs"].append({"spec": spec, "status": "reference saved", "frames": len(frames)})
            continue
        if not os.path.exists(man_p):
            report["specs"].append({"spec": spec, "status": "fail", "errors": [
                f"no reference for {spec}: run `python3 qa/regress.py --update {spec}` once the output is approved"]})
            report["status"] = "fail"; continue
        man = json.load(open(man_p))
        tl, frames = render(spec, out, man["times"])
        errs, rows = [], []
        for old, new in zip(man["lines"], tl["lines"]):
            if old["id"] != new["id"] or abs(old["start"] - new["start"]) > 0.01 or abs(old["end"] - new["end"]) > 0.01:
                errs.append(f"timing changed for line '{old['id']}': {old['start']}-{old['end']} -> "
                            f"{new['start']}-{new['end']} (voice.py or the audio clips changed)")
        if len(man["lines"]) != len(tl["lines"]):
            errs.append(f"line count changed: {len(man['lines'])} -> {len(tl['lines'])}")
        for k, p in frames.items():
            mean, pct = diff(small(os.path.join(rdir, k + ".png")), small(p))
            ok = mean <= MAX_MEAN and pct <= MAX_CHANGED_PCT
            rows.append({"frame": k, "mean_diff": round(mean, 3), "changed_pct": round(pct, 3), "ok": ok})
            if not ok:
                dp = os.path.join(out, f"diff_{k}.png")
                d = np.abs(small(os.path.join(rdir, k + ".png")) - small(p)).max(axis=2)
                Image.fromarray(np.uint8(np.clip(d * 4, 0, 255))).save(dp)
                errs.append(f"frame {k} differs from the reference ({pct:.2f}% pixels, mean {mean:.2f}): "
                            f"compare {p} with {os.path.join(rdir, k + '.png')} (heat map: {dp})")
        if a.determinism:
            _, again = render(spec, out + "_2", man["times"])
            for k in frames:
                if open(frames[k], "rb").read() != open(again[k], "rb").read():
                    m, pc = diff(small(frames[k]), small(again[k]))
                    if m > 0.05:
                        errs.append(f"non-deterministic frame {k}: two renders differ (mean {m:.3f})")
        st = "fail" if errs else "pass"
        if errs: report["status"] = "fail"
        report["specs"].append({"spec": spec, "status": st, "frames": rows, "errors": errs})
    if a.update:
        json.dump({p: sha(p) for p in SHARED}, open(base, "w"), indent=1)
    os.makedirs(WORK, exist_ok=True)
    json.dump(report, open(os.path.join(WORK, "regress_report.json"), "w"), indent=1)
    for s in report["specs"]:
        print(f"{s['status']:16s} {s['spec']}")
        for e in s.get("errors", []): print("   ERROR:", e)
    for p, st in report["shared_files"].items():
        if st != "unchanged": print(f"   NOTE: {p} {st} since the reference (frames above decide if it matters)")
    print("REGRESSION", report["status"].upper())
    sys.exit(0 if report["status"] in ("pass",) or a.update else 1)


if __name__ == "__main__":
    main()
