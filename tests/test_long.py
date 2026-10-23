"""Tests for the 16:9 renderer (pipeline/long). Run: python3 tests/test_long.py (about 1 minute)"""
import copy, json, os, subprocess, sys, tempfile, shutil
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix="long_test_"); ENV = dict(os.environ, NODE_PATH="/opt/npm-tools/node_modules")
fails = []
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  ({str(info)[-400:]})" if info and not cond else ""))
    if not cond: fails.append(name)
def render(story, out, *extra):
    p = os.path.join(T, "story.json"); json.dump(story, open(p, "w"))
    r = subprocess.run(["node", "pipeline/long/render_long.js", p, out, *extra], cwd=R, env=ENV, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr

base = {"facts_file": "stories/same300/facts.json", "gap": 0.3,
        "lines": [{"id": "x1", "speaker": "lobe", "text": "Five years later, it grows."}],
        "scenes": [{"id": "S1", "lines": ["x1"], "lead": 0.2, "tail": 0.4, "env": {"type": "room"},
                    "actors": [{"id": "lobe", "who": "rich", "x": 960, "y": 960, "scale": 1.2, "cues": [{"at": 0, "pose": "explain"}]}],
                    "elements": [{"type": "counter", "fact": "invested", "series": "invested_curve", "x": 960, "y": 300, "start": 0.2, "end": "x1:grows"}],
                    "shots": [{"at": 0, "zoom": 1}, {"at": "x1:later", "zoom": 1.4, "cx": 960, "cy": 700, "cut": True}]},
                   {"id": "S2", "duration": 1.0, "env": {"type": "plain"}, "elements": [{"type": "title", "text": "The *end*"}]}]}
out = os.path.join(T, "o")
code, log = render(base, out, "--preview")
check("small story renders and assembles", code == 0 and os.path.exists(os.path.join(out, "story_540p.mp4")), log)
code, log = render(base, out, "--preview")
check("second run uses the scene cache for every scene", code == 0 and log.count("cached") == 2, log)
s2 = copy.deepcopy(base); s2["scenes"][1]["elements"][0]["text"] = "The *new* end"
code, log = render(s2, out, "--preview")
check("editing one scene re-renders only that scene", code == 0 and "S1: cached" in log and "S2: " in log and "S2: cached" not in log, log)
s3 = copy.deepcopy(base); s3["scenes"][0]["elements"][0]["idx"] = [0, 12]
code, log = render(s3, out, "--preview", "--no-assemble")
check("counter whose animation would end on a different number than its fact is refused", code != 0 and "different number than the verified one" in log, log)
s4 = copy.deepcopy(base); del s4["scenes"][0]["elements"][0]["fact"]; del s4["scenes"][0]["elements"][0]["series"]
code, log = render(s4, out, "--preview", "--no-assemble")
check("counter without fact or series (hand-typed number) is refused", code != 0 and "never typed by hand" in log, log)
s5 = copy.deepcopy(base); s5["scenes"][0]["shots"][1]["at"] = "x1:tomorrow"
code, log = render(s5, out, "--preview", "--no-assemble")
check("unknown word anchor is a clear error", code != 0 and "word 'tomorrow' not found" in log, log)
# deterministic: the same moment rendered twice is byte-identical
code, _ = render(base, os.path.join(T, "d1"), "--stills", "S1:1.0")
code2, _ = render(base, os.path.join(T, "d2"), "--stills", "S1:1.0")
a = open(os.path.join(T, "d1/stills/1080p/S1_1.00.jpg"), "rb").read(); b = open(os.path.join(T, "d2/stills/1080p/S1_1.00.jpg"), "rb").read()
check("same frame renders identically twice (deterministic)", code == 0 and code2 == 0 and a == b)
# QA understands the story export (silent preview profile)
q = subprocess.run(["python3", "qa/video_qa.py", os.path.join(out, "story_540p.mp4"), "--profile", "long_preview", "--build", out,
                    "--spec", os.path.join(T, "story.json"), "--out", os.path.join(T, "qa")], cwd=R, capture_output=True, text=True)
rep = json.load(open(os.path.join(T, "qa/qa_report.json")))
lay = [c for c in rep["checks"] if c["id"].startswith(("layout", "subtitles"))]
check("QA measures text in every scene page of a story", lay and all(c["status"] != "skip" for c in lay), q.stdout[-300:])
if not fails: shutil.rmtree(T, ignore_errors=True)
print("LONG RENDERER TESTS", "FAILED: " + ", ".join(fails) if fails else "PASSED")
sys.exit(1 if fails else 0)
