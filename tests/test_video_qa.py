"""Negative + positive tests for qa/video_qa.py using synthetic broken videos. Run: python3 tests/test_video_qa.py"""
import json, os, subprocess, sys, tempfile
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix="qa_test_")
fails = []
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  ({info})" if info and not cond else ""))
    if not cond: fails.append(name)
def ff(*a): subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)
def qa(video, *extra):
    out = os.path.join(T, os.path.basename(video) + "_qa")
    r = subprocess.run(["python3", os.path.join(R, "qa/video_qa.py"), video, "--out", out, *extra], capture_output=True, text=True)
    rep = json.load(open(os.path.join(out, "qa_report.json")))
    return r.returncode, {c["id"]: c for c in rep["checks"] if c["status"] in ("fail", "warn")}, rep

# 1) wrong size + fps, a black flash, a frozen stretch while "speaking", clipped audio
moving = os.path.join(T, "a.mp4"); black = os.path.join(T, "b.mp4"); still = os.path.join(T, "c.mp4"); bad = os.path.join(T, "bad1.mp4")
ff("-f", "lavfi", "-i", "testsrc2=size=1080x1080:rate=25:duration=2", "-pix_fmt", "yuv420p", moving)
ff("-f", "lavfi", "-i", "color=black:size=1080x1080:rate=25:duration=0.6", "-pix_fmt", "yuv420p", black)
ff("-f", "lavfi", "-i", "color=0x3366aa:size=1080x1080:rate=25:duration=3.4", "-pix_fmt", "yuv420p", still)
lst = os.path.join(T, "l.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in (moving, black, still)))
ff("-f", "concat", "-safe", "0", "-i", lst, "-f", "lavfi", "-i", "sine=f=440:sample_rate=48000:duration=6",
   "-filter_complex", "[1:a]volume=20[a]", "-map", "0:v", "-map", "[a]",
   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-shortest", bad.replace(".mp4", ".mov"))
bad = bad.replace(".mp4", ".mov")
b1 = os.path.join(T, "build1"); os.makedirs(b1)
words = [{"w": f"w{i}", "s": 0.3 + i * 0.4, "e": 0.3 + i * 0.4 + 0.3, "line": "a"} for i in range(14)]
json.dump({"duration": 6.0, "lines": [{"id": "a", "start": 0.3, "end": 5.9}], "words": words}, open(os.path.join(b1, "timeline.json"), "w"))
code, issues, rep = qa(bad, "--profile", "short", "--build", b1)
check("broken video exits with failure", code == 1)
check("wrong resolution caught", "video.resolution" in issues)
check("wrong fps caught", "video.fps" in issues)
check("black flash caught with its time", "video.black_frames" in issues and 1.9 <= issues["video.black_frames"]["at"] <= 2.1, issues.get("video.black_frames"))
check("frozen picture during narration caught", issues.get("video.frozen", {}).get("status") == "fail", issues.get("video.frozen"))
check("clipping caught", "audio.clipping" in issues)
check("every failure has a fix", all(c["fix"] for c in rep["checks"] if c["status"] == "fail"))
check("contact sheet written", os.path.exists(rep["contact_sheet"]))

# 2) intentional static picture declared in the spec is not an error
spec = os.path.join(T, "spec.json"); json.dump({"qa": {"static": [[2.5, 6.0]]}}, open(spec, "w"))
code, issues, rep = qa(bad, "--profile", "short", "--build", b1, "--spec", spec)
fz = [c for c in rep["checks"] if c["id"] == "video.frozen"]
check("declared static range is reported as intentional", fz and all(c["status"] == "info" for c in fz), fz)

# 3) no audio track
noaud = os.path.join(T, "noaudio.mp4")
ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=6", "-pix_fmt", "yuv420p", noaud)
code, issues, _ = qa(noaud, "--profile", "short")
check("missing audio caught", issues.get("audio.stream", {}).get("status") == "fail")

# 4) text off-canvas and a 3-line subtitle in a rendered page
b2 = os.path.join(T, "build2"); os.makedirs(b2)
open(os.path.join(b2, "short.html"), "w").write("""<html><body style="margin:0;width:1080px;height:1920px;position:relative">
<div class="el" style="position:absolute;left:700px;top:300px;font:800 120px sans-serif;white-space:nowrap">TOO WIDE TEXT</div>
<div id="cap" style="position:absolute;left:60px;right:60px;top:1500px;text-align:center"></div>
<script>function setT(t){document.getElementById('cap').innerHTML=t>1?'<span>this</span> <span>caption</span> <span>is</span> <span>far</span> <span>too</span> <span>long</span> <span>for</span> <span>two</span> <span>lines</span> <span>of</span> <span>subtitles</span> <span>really</span>'.replace(/<span>/g,'<span style="display:inline-block;font:800 90px sans-serif">'):''}</script></body></html>""")
json.dump({"duration": 6.0, "lines": [{"id": "a", "start": 0.2, "end": 5.9}], "words": [{"w": "x", "s": 0.2, "e": 5.8, "line": "a"}]}, open(os.path.join(b2, "timeline.json"), "w"))
code, issues, _ = qa(noaud, "--profile", "short", "--build", b2)
check("text off the frame caught", "layout.off_canvas" in issues, list(issues))
check("3-line subtitle caught", "subtitles.lines" in issues, list(issues))

# 5) a real approved Short passes the technical checks
pf = "/home/claude/lobe_out/pilot_futures"
if os.path.exists(pf + "/short.mp4"):
    code, issues, _ = qa(pf + "/short.mp4", "--profile", "short", "--build", pf, "--spec", os.path.join(R, "days/pilot_futures.json"))
    check("pilot_futures Short passes QA", code == 0, issues)

print("VIDEO QA TESTS", "FAILED: " + ", ".join(fails) if fails else "PASSED")
sys.exit(1 if fails else 0)
