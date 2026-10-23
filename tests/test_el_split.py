"""Tests for pipeline/el_split.py on a synthetic 'ElevenLabs master' built from real narration clips.
Run: python3 tests/test_el_split.py   (uses temp folders; never touches audio/ or the real cache)"""
import json, os, shutil, subprocess, sys, tempfile, wave
import numpy as np
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix="el_test_"); ENV = dict(os.environ, EL_CACHE=os.path.join(T, "cache.json"))
fails = []
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  ({info})" if info and not cond else ""))
    if not cond: fails.append(name)
def run(*a):
    r = subprocess.run(["python3", os.path.join(R, "pipeline/el_split.py"), *a], capture_output=True, text=True, env=ENV, cwd=R)
    return r.returncode, r.stdout + r.stderr
def rd(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768, w.getframerate()

spec_p = os.path.join(R, "days/pilot_game.json"); spec = json.load(open(spec_p)); ids = [l["id"] for l in spec["short"]["lines"]]
clips = [rd(os.path.join(R, "audio/pilot_game", i + ".wav")) for i in ids]
sr = clips[0][1]; rng = np.random.default_rng(1)
gaps = [0.75, 0.6, 0.9, 0.65, 0.8]
parts, true_starts, t = [np.zeros(int(0.3 * sr), np.float32)], [], 0.3
for k, (x, _) in enumerate(clips):
    true_starts.append(t); parts.append(x); t += len(x) / sr
    if k < len(gaps): parts.append(np.zeros(int(gaps[k] * sr), np.float32)); t += gaps[k]
parts.append(np.zeros(int(0.4 * sr), np.float32))
master = np.concatenate(parts); master += rng.normal(0, 0.0015, len(master)).astype(np.float32)  # room noise
src = os.path.join(T, "master.wav")
with wave.open(src, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((master * 32767).astype(np.int16).tobytes())
prompt = os.path.join(T, "prompt.txt"); open(prompt, "w").write("\n\n[long pause]\n\n".join(l["text"] for l in spec["short"]["lines"]))
out = os.path.join(T, "out")

code, log = run("lookup", "--voice", "v3p1kjzUvro6S76qmYmH", "--prompt-file", prompt)
check("uncached prompt -> generate (exit 2)", code == 2, log)
code, log = run("split", src, "--spec", spec_p, "--out", out, "--voice", "v3p1kjzUvro6S76qmYmH", "--prompt-file", prompt, "--generation-id", "TEST")
print(log)
check("automatic split of 6 lines validates", code == 0, log[-600:])
rep = json.load(open(os.path.join(out, "split_report.json")))
check("6 clips written in spec order", [c["line"] for c in rep["clips"]] == ids)
for c, (x, _) in zip(rep["clips"], clips):
    check(f"clip '{c['line']}' length matches the original line ({c['duration']}s vs {len(x)/sr:.2f}s)", abs(c["duration"] - len(x) / sr) < 0.25)
code, log = run("lookup", "--voice", "v3p1kjzUvro6S76qmYmH", "--prompt-file", prompt)
check("same prompt is now cached (no second paid generation)", code == 0 and '"cached": true' in log, log)
s = json.load(open(os.path.join(out, "_source/index.json")))[0]
kept = os.path.join(R, s["file"])
check("original preserved, read-only and byte-identical", os.path.exists(kept) and not (os.stat(kept).st_mode & 0o222)
      and open(kept, "rb").read() == open(src, "rb").read())

# a wrong manual cut (inside the countdown line) must be caught as a shifted / bad clip
auto = json.load(open(os.path.join(out, "splits.json")))["auto_cuts"]
wrong = list(auto); wrong[2] = round(true_starts[2] + 1.2, 2)      # between "Three," and "two,"
code, log = run("split", "--spec", spec_p, "--out", out, "--cuts", ",".join(map(str, wrong)))
check("wrong manual cut is rejected with a fix", code == 1 and "fix:" in log, log[-500:])
sp = json.load(open(os.path.join(out, "splits.json")))
check("manual cuts are saved for editing", sp["mode"] == "manual" and sp["cuts"] == wrong)
# correct it by editing splits.json (the manual workflow), re-split from the cached source: no new download
sp["cuts"] = auto; json.dump(sp, open(os.path.join(out, "splits.json"), "w"))
code, log = run("split", "--spec", spec_p, "--out", out)
check("hand-corrected splits.json is used and validates", code == 0 and "manual cuts" in log, log[-400:])

# wrong number of lines for the recording
code, log = run("split", src, "--spec", spec_p, "--out", os.path.join(T, "out2"), "--lines", ",".join(ids[:5]))
check("recording with more lines than expected is rejected", code == 1, log[-400:])

# a clip that says something else
open(os.path.join(T, "spec_bad.json"), "w").write(json.dumps({"short": {"lines": [dict(l) for l in spec["short"]["lines"]]}}))
bad = json.load(open(os.path.join(T, "spec_bad.json"))); bad["short"]["lines"][4]["text"] = "Interest rates rose sharply in the spring of that year."
json.dump(bad, open(os.path.join(T, "spec_bad.json"), "w"))
code, log = run("validate", "--spec", os.path.join(T, "spec_bad.json"), "--out", out)
check("clip that does not say its line is caught", code == 1 and "'extra'" in log, log[-400:])
# keep the temp folder when something failed, for inspection
if not fails: shutil.rmtree(T, ignore_errors=True)
print("EL SPLIT TESTS", "FAILED: " + ", ".join(fails) if fails else "PASSED")
sys.exit(1 if fails else 0)
