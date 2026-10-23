#!/usr/bin/env python3
"""Automated QA for an exported Lobe Lessons video (Shorts today, 16:9 long-form later).

usage:
  python3 qa/video_qa.py VIDEO.mp4 --profile short|long [--build BUILD_DIR] [--spec SPEC.json]
                         [--out REPORT_DIR] [--static 3.0-6.5,...]

  BUILD_DIR: the pipeline output folder (timeline.json, short.html). Enables narration timing and
             on-screen text/subtitle position checks. SPEC enables the financial fact checks and
             declared static ranges (spec "qa": {"static": [[start, end], ...]}).

Writes REPORT_DIR/qa_report.json (machine-readable) and REPORT_DIR/qa_contact.jpg (contact sheet).
Exit code 0 = pass (warnings allowed), 1 = at least one failed check. Every failed check says
what is wrong, where (time / element) and how to fix it.
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

Q = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(Q)
sys.path.insert(0, os.path.join(R, "pipeline"))
import finance  # noqa: E402

ENV = dict(os.environ, NODE_PATH="/opt/npm-tools/node_modules")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, env=ENV, **kw)


class Report:
    def __init__(self): self.checks = []
    def add(self, cid, status, message, fix="", at=None, **extra):
        c = {"id": cid, "status": status, "message": message, "fix": fix}
        if at is not None: c["at"] = round(at, 2)
        c.update(extra); self.checks.append(c)
    @property
    def failed(self): return [c for c in self.checks if c["status"] == "fail"]


def overlaps(a0, a1, b0, b1): return min(a1, b1) - max(a0, b0) > 0


def probe(video, P, rep):
    r = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", video])
    if r.returncode:
        rep.add("file.readable", "fail", f"ffprobe cannot read {video}: {r.stderr.strip()[:200]}",
                "re-export the video (the file is missing or corrupt)"); return None
    info = json.loads(r.stdout); vs = [s for s in info["streams"] if s["codec_type"] == "video"]
    aus = [s for s in info["streams"] if s["codec_type"] == "audio"]
    if not vs:
        rep.add("video.stream", "fail", "no video stream", "re-export with the frames input"); return None
    v = vs[0]; w, h = v["width"], v["height"]; num, den = map(int, v["r_frame_rate"].split("/")); fps = num / den
    dur = float(info["format"]["duration"])
    rep.add("video.resolution", "pass" if (w, h) == (P["width"], P["height"]) else "fail",
            f"{w}x{h} (expected {P['width']}x{P['height']})",
            "" if (w, h) == (P["width"], P["height"]) else
            f"render at {P['width']}x{P['height']}: the page viewport and the ffmpeg input must both use that size")
    rep.add("video.fps", "pass" if abs(fps - P["fps"]) < 0.01 else "fail", f"{fps:.3f} fps (expected {P['fps']})",
            "" if abs(fps - P["fps"]) < 0.01 else f"encode with `-framerate {P['fps']}` and render {P['fps']} frames per second")
    ok = P["min_duration"] <= dur <= P["max_duration"]
    rep.add("video.duration", "pass" if ok else "fail",
            f"{dur:.2f}s (allowed {P['min_duration']}–{P['max_duration']}s)",
            "" if ok else "shorten the script (cut lines or tighten the gap) or check the timeline")
    pix = v.get("pix_fmt")
    rep.add("video.pix_fmt", "pass" if pix == "yuv420p" else "fail", f"pixel format {pix}",
            "" if pix == "yuv420p" else "encode with `-pix_fmt yuv420p` (other formats fail on phones / YouTube)")
    if not aus:
        rep.add("audio.stream", "fail", "the video has NO audio track",
                "mux the mix: ffmpeg -i frames -i mix.wav ... (check mix.wav exists and is not empty)")
    else:
        sr = int(aus[0].get("sample_rate", 0))
        rep.add("audio.stream", "pass" if sr in (44100, 48000) else "warn", f"audio {aus[0]['codec_name']} {sr} Hz",
                "" if sr in (44100, 48000) else "add `-ar 48000` after loudnorm (it upsamples to 192 kHz; platforms resample anyway)")
    return {"w": w, "h": h, "fps": fps, "duration": dur, "nframes": int(v.get("nb_frames", 0) or 0), "audio": bool(aus)}


def black_and_freeze(video, P, rep, tl, static, dur):
    r = run(["ffmpeg", "-hide_banner", "-i", video, "-vf",
             f"blackdetect=d=0.05:pix_th=0.10,freezedetect=n=-60dB:d={P['freeze_min']}", "-an", "-f", "null", "-"])
    err = r.stderr
    blacks = [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", err)]
    if blacks:
        for a, b in blacks:
            rep.add("video.black_frames", "fail", f"black picture from {a:.2f}s to {b:.2f}s",
                    "a scene or background failed to draw there: render stills at that time "
                    "(`node pipeline/render.js short SPEC OUT <t>`) and check the scene's elements", at=a)
    else:
        rep.add("video.black_frames", "pass", "no black frames")
    fs = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", err)]
    fe = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", err)]
    freezes = [(a, fe[i] if i < len(fe) else dur) for i, a in enumerate(fs)]
    words = tl["words"] if tl else []
    last_word = max((w["e"] for w in words), default=None)
    bad = 0
    for a, b in freezes:
        if any(overlaps(a, b, s0, s1) and a >= s0 - 0.05 and b <= s1 + 0.05 for s0, s1 in static):
            rep.add("video.frozen", "info", f"static picture {a:.2f}–{b:.2f}s is declared intentional", at=a); continue
        if last_word is not None and a >= last_word - 0.3 and b - a <= P["end_hold_allowed"]:
            rep.add("video.frozen", "info", f"end hold {a:.2f}–{b:.2f}s after the last word (intentional)", at=a); continue
        talking = [w for w in words if overlaps(a, b, w["s"], w["e"])]
        if talking:
            bad += 1
            rep.add("video.frozen", "fail",
                    f"picture frozen {a:.2f}–{b:.2f}s while narration plays (\"{' '.join(w['w'] for w in talking[:6])}…\")",
                    "the animation stalled (mouth/camera should move while speaking): check that frames were not "
                    "duplicated and that the scene for that line exists; if intentional add it to spec qa.static", at=a)
        elif words:
            bad += 1
            rep.add("video.frozen", "fail", f"dead picture {a:.2f}–{b:.2f}s with no narration",
                    "cut the dead time (lower the line gap) or add motion; declare it in spec qa.static if intended", at=a)
        else:
            rep.add("video.frozen", "warn", f"static picture {a:.2f}–{b:.2f}s (no timeline to judge it)",
                    "pass --build with timeline.json so QA can tell narration from dead air", at=a)
    if not freezes:
        rep.add("video.frozen", "pass", f"no frozen stretches ≥ {P['freeze_min']}s")
    return [a for a, _ in blacks] + [a for a, _ in freezes]


def audio_checks(video, P, rep):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"],
                       capture_output=True)
    x = np.frombuffer(r.stdout, np.float32)
    if not len(x):
        rep.add("audio.decode", "fail", "audio could not be decoded", "re-mux the audio (aac 48k/44.1k)"); return
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12); peak = 20 * np.log10(np.abs(x).max() + 1e-12)
    if rms < -45:
        rep.add("audio.silent", "fail", f"audio is near-silent (RMS {rms:.1f} dBFS)",
                "the narration was not mixed in: check voice.wav / mix.wav before encoding")
    else:
        rep.add("audio.silent", "pass", f"audio level RMS {rms:.1f} dBFS")
    hot = np.abs(x) >= 0.999
    runs = np.diff(np.concatenate([[0], hot.astype(np.int8), [0]]))
    lens = np.where(runs == -1)[0] - np.where(runs == 1)[0]
    clips = int((lens >= 3).sum())
    if clips:
        first = np.where(runs == 1)[0][np.argmax(lens >= 3)] / 48000
        rep.add("audio.clipping", "fail", f"{clips} clipped passages (samples stuck at full scale), first at {first:.2f}s",
                "lower the mix gain (mix.py normalises to 0.97) or a too-loud SFX; re-encode with loudnorm TP=-1.5",
                at=first)
    else:
        rep.add("audio.clipping", "pass", f"no clipping (sample peak {peak:.1f} dBFS)")
    e = run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    m = re.search(r"Integrated loudness:\s+I:\s+([-\d.]+) LUFS", e); tp = re.search(r"True peak:\s+Peak:\s+([-\d.]+) dBFS", e)
    if m:
        I = float(m.group(1)); ok = abs(I - P["loudness_lufs"]) <= P["loudness_tolerance"]
        rep.add("audio.loudness", "pass" if ok else "fail", f"integrated loudness {I:.1f} LUFS (target {P['loudness_lufs']})",
                "" if ok else f"re-encode with `-af loudnorm=I={P['loudness_lufs']}:TP=-1.5:LRA=11`")
    if tp:
        T = float(tp.group(1)); ok = T <= P["max_true_peak_dbtp"]
        rep.add("audio.true_peak", "pass" if ok else "fail", f"true peak {T:.1f} dBTP (max {P['max_true_peak_dbtp']})",
                "" if ok else "re-encode with loudnorm TP=-1.5 (true peaks above -1 dBTP distort after YouTube's encode)")


def narration_checks(tl, P, rep, dur):
    ws = tl["words"]
    if not ws:
        rep.add("narration.words", "fail", "timeline has no words", "re-run pipeline/voice.py"); return []
    bad_t = []
    rep.add("narration.duration_match", "pass" if abs(tl["duration"] - dur) <= 0.25 else "fail",
            f"timeline {tl['duration']:.2f}s vs video {dur:.2f}s",
            "" if abs(tl["duration"] - dur) <= 0.25 else "frames and audio are out of step: re-render the frames after voice.py")
    first = ws[0]["s"]
    rep.add("narration.first_word", "pass" if first <= P["first_word_max"] else "fail",
            f"first word at {first:.2f}s (max {P['first_word_max']}s)",
            "" if first <= P["first_word_max"] else "the hook starts late: trim leading silence from the first clip")
    order = [i for i in range(1, len(ws)) if ws[i]["s"] < ws[i - 1]["s"] - 1e-3 or ws[i]["e"] < ws[i]["s"]]
    if order:
        rep.add("narration.order", "fail", f"{len(order)} words out of order, first '{ws[order[0]]['w']}' at {ws[order[0]]['s']:.2f}s",
                "word alignment failed for that line: check the clip matches its text (qa via pipeline/el_split.py)",
                at=ws[order[0]]["s"]); bad_t.append(ws[order[0]]["s"])
    else:
        rep.add("narration.order", "pass", f"{len(ws)} words in order")
    gaps = [(ws[i - 1]["e"], ws[i]["s"], ws[i]["w"]) for i in range(1, len(ws)) if ws[i]["s"] - ws[i - 1]["e"] > P["max_word_gap"]]
    for a, b, w in gaps:
        rep.add("narration.gap", "fail", f"{b - a:.2f}s of silence before '{w}' at {b:.2f}s (max {P['max_word_gap']}s)",
                "trim the silence in that clip or lower the spec `gap`; long pauses lose viewers", at=a); bad_t.append(a)
    if not gaps:
        rep.add("narration.gap", "pass", f"no pause longer than {P['max_word_gap']}s")
    last = ws[-1]["e"]
    rep.add("narration.cut_off", "pass" if last + 0.1 <= dur else "fail", f"last word ends {last:.2f}s, video ends {dur:.2f}s",
            "" if last + 0.1 <= dur else "the video ends before the narration: re-encode without -shortest or extend the frames")
    return bad_t


def layout_checks(build, P, rep, dur):
    page = os.path.join(build, "short.html")
    r = run(["node", os.path.join(Q, "layout_probe.js"), page, str(P["width"]), str(P["height"]), "0.25", f"{dur:.2f}"])
    if r.returncode:
        rep.add("layout.probe", "fail", f"layout probe failed: {r.stderr.strip()[-300:]}", "check the page loads (short.html)"); return []
    frames = json.loads(r.stdout); x0, y0, x1, y1 = P["safe"]; W, H = P["width"], P["height"]
    found, bad_t = {}, []
    def flag(key, status, msg, fix, t):
        if key not in found:
            found[key] = 1; rep.add(key.split("|")[0], status, msg, fix, at=t); bad_t.append(t)
    for f in frames:
        for it in f["items"]:
            bx0, by0, bx1, by1 = it["box"]; label = f"\"{it['text'][:40]}\" ({it['kind']})"
            if bx0 < 0 or by0 < 0 or bx1 > W or by1 > H:
                flag(f"layout.off_canvas|{it['text']}", "fail", f"{label} goes off the frame at {f['t']:.2f}s, box {it['box']}",
                     "reduce its font size / text length or move it inward", f["t"])
            elif it["kind"] != "badge" and (bx0 < x0 or by0 < y0 or bx1 > x1 or by1 > y1):
                flag(f"layout.outside_safe|{it['text']}", "fail",
                     f"{label} leaves the safe area {P['safe']} at {f['t']:.2f}s, box {it['box']}",
                     "keep text inside the safe area: shorter text, smaller size, or less camera zoom on that scene", f["t"])
            for ui in P.get("platform_ui", []):
                u = ui["box"]
                if it["kind"] == "text" and bx1 > u[0] and by1 > u[1] and by0 < u[3] and bx0 < u[2]:
                    flag(f"layout.platform_ui|{it['text']}", "fail", f"{label} sits under the {ui['name']} at {f['t']:.2f}s",
                         f"keep text left of x={u[0]} between y={u[1]} and y={u[3]}", f["t"])
            if it["kind"] == "caption":
                c = P["caption_band"]
                if bx0 < c[0] or bx1 > c[2] or by0 < c[1] or by1 > c[3]:
                    flag(f"subtitles.bounds|{f['t']}", "fail", f"subtitle {label} leaves the caption band {c} at {f['t']:.2f}s",
                         "split long caption chunks (fewer words per chunk) or shorten long words", f["t"])
        if f["caption_lines"] > P["caption_max_lines"]:
            flag(f"subtitles.lines|{f['t']}", "fail",
                 f"subtitle wraps to {f['caption_lines']} lines at {f['t']:.2f}s (max {P['caption_max_lines']})",
                 "fewer words per caption chunk", f["t"])
    for k in ("layout.off_canvas", "layout.outside_safe", "layout.platform_ui", "subtitles.bounds", "subtitles.lines"):
        if not any(c["id"] == k for c in rep.checks):
            rep.add(k, "pass", f"checked {len(frames)} moments (every 0.25s)")
    return bad_t


def contact_sheet(video, dur, marks, path, tl):
    times = [round(dur * (i + 0.5) / 12, 2) for i in range(12)]
    if tl: times = sorted(set(times + [round(l["start"] + 0.4, 2) for l in tl["lines"]]))[:20]
    marks = sorted(set(round(m, 2) for m in marks))[:8]
    allt = sorted(set(times + marks)); tiles = []
    for t in allt:
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{min(t, dur - 0.05):.2f}", "-i", video, "-frames:v", "1",
                            "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        if r.stdout:
            import io; tiles.append((t, Image.open(io.BytesIO(r.stdout)).convert("RGB")))
    if not tiles: return
    w0, h0 = tiles[0][1].size; tw = 270 if h0 > w0 else 480; th = round(tw * h0 / w0)
    cols = 6 if h0 > w0 else 4; rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 8) + 8, rows * (th + 34) + 8), "white"); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype("DejaVuSans-Bold.ttf", 18)
    except OSError: font = ImageFont.load_default()
    for i, (t, im) in enumerate(tiles):
        x = 8 + (i % cols) * (tw + 8); y = 8 + (i // cols) * (th + 34)
        sheet.paste(im.resize((tw, th)), (x, y + 26))
        bad = any(abs(t - m) < 0.01 for m in marks)
        d.text((x, y + 2), f"{t:.2f}s" + ("  ⚠ issue" if bad else ""), fill="#C62828" if bad else "#111", font=font)
        if bad: d.rectangle([x - 3, y + 23, x + tw + 2, y + 26 + th + 2], outline="#C62828", width=4)
    sheet.save(path, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--profile", default="short")
    ap.add_argument("--build"); ap.add_argument("--spec"); ap.add_argument("--out"); ap.add_argument("--static", default="")
    a = ap.parse_args()
    P = json.load(open(os.path.join(Q, "profiles.json")))[a.profile]
    out = a.out or os.path.dirname(os.path.abspath(a.video)); os.makedirs(out, exist_ok=True)
    rep = Report(); spec = json.load(open(a.spec)) if a.spec else None
    tl = json.load(open(os.path.join(a.build, "timeline.json"))) if a.build and os.path.exists(os.path.join(a.build, "timeline.json")) else None
    static = [tuple(map(float, s.split("-"))) for s in a.static.split(",") if s]
    if spec: static += [tuple(x) for x in spec.get("qa", {}).get("static", [])]
    info = probe(a.video, P, rep); marks = []
    if info:
        marks += black_and_freeze(a.video, P, rep, tl, static, info["duration"])
        if info["audio"]: audio_checks(a.video, P, rep)
        if tl: marks += narration_checks(tl, P, rep, info["duration"])
        else: rep.add("narration", "skip", "no timeline.json", "pass --build OUTDIR to check narration timing")
        if a.build and os.path.exists(os.path.join(a.build, "short.html")):
            marks += layout_checks(a.build, P, rep, info["duration"])
        else:
            rep.add("layout", "skip", "no rendered page to measure", "pass --build OUTDIR (with short.html) to check text and subtitle bounds")
    if spec:
        for c in finance.check_facts(spec): rep.add(c["id"], c["status"], c["message"], c["fix"])
    else:
        rep.add("finance", "skip", "no spec given", "pass --spec to verify the numbers on screen")
    sheet = os.path.join(out, "qa_contact.jpg")
    if info: contact_sheet(a.video, info["duration"], [m for m in marks if m is not None], sheet, tl)
    status = "fail" if rep.failed else "pass"
    counts = {s: sum(c["status"] == s for c in rep.checks) for s in ("pass", "fail", "warn", "skip", "info")}
    report = {"video": os.path.abspath(a.video), "profile": a.profile, "status": status, "counts": counts,
              "media": info, "contact_sheet": sheet, "checks": rep.checks}
    json.dump(report, open(os.path.join(out, "qa_report.json"), "w"), indent=1, ensure_ascii=False)
    for c in rep.checks:
        if c["status"] in ("fail", "warn"):
            print(f"{c['status'].upper():5s} {c['id']}: {c['message']}\n      fix: {c['fix']}")
    print(f"QA {status.upper()}  {counts}  report: {os.path.join(out, 'qa_report.json')}")
    sys.exit(1 if rep.failed else 0)


if __name__ == "__main__":
    main()
