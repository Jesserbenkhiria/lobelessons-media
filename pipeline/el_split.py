#!/usr/bin/env python3
"""ElevenLabs narration -> one clip per line, with caching, manual correction and validation.

One ElevenLabs generation holds all of a speaker's lines separated by [long pause]. This tool:
  * keeps the original download untouched (audio/<name>/_source/<sha>.<ext>, read-only)
  * remembers which voice + model + prompt produced it (audio/_el_cache.json), so a correction
    never needs a second paid generation
  * finds the pauses between lines automatically, or uses split points you correct by hand
  * writes audio/<name>/<line_id>.wav (24 kHz mono) for pipeline/voice.py (spec "audio_dir")
  * validates count, order, timing and that each clip actually says its line (speech recognition)

usage
  # before generating: is this exact prompt already paid for?
  python3 pipeline/el_split.py lookup --voice V --model eleven_v4 --prompt-file prompt.txt
      -> exit 0 and prints the cached file, or exit 2 (not cached: generate it)

  # after downloading (file or --url), split + validate
  python3 pipeline/el_split.py split SOURCE.mp3 --spec days/x.json --out audio/x \
      [--lines id1,id2,...] [--voice V --model M --prompt-file prompt.txt --generation-id G]

  # correct the split points by hand (seconds in the SOURCE), then re-split from the cached source
  python3 pipeline/el_split.py split --out audio/x --spec days/x.json --cuts 1.62,6.05,10.1
  # or edit audio/x/splits.json ("mode": "manual", "cuts": [...], "nudge": {"line_id": [start_s, end_s]})
  # and run split again without --cuts: manual cuts are kept until you pass --auto.

  python3 pipeline/el_split.py validate --spec days/x.json --out audio/x [--lines ...]

Exit code 0 = valid, 1 = validation failed (the report says which clip and which split point to fix).
"""
import argparse, datetime, difflib, hashlib, json, os, re, shutil, stat, subprocess, sys, wave
import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get("EL_CACHE", os.path.join(R, "audio", "_el_cache.json"))
VOSK = "/home/claude/lobe_tools/vosk-model"
SR = 24000
_vosk = None


# ---------------------------------------------------------------- helpers
def sha_file(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()


def cache_key(voice, model, prompt):
    return hashlib.sha1(f"{voice}|{model}|{' '.join(prompt.split())}".encode()).hexdigest()


def load_json(p, default):
    return json.load(open(p)) if os.path.exists(p) else default


def decode(p):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    if r.returncode or not r.stdout:
        sys.exit(f"ERROR cannot decode {p}: {r.stderr.decode()[-300:]}")
    return np.frombuffer(r.stdout, np.float32).copy()


def write_wav(p, x):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def norm_words(text):
    t = text.lower().replace("-", " ").replace("—", " ")
    return [w for w in (re.sub(r"[^a-z']", "", x) for x in t.split()) if w]


def spoken_words(line):
    # digits are read in many ways ("$1,080" -> "one thousand and eighty"); compare letters-only words
    return [w for w in norm_words(line.get("say", line["text"])) if not re.search(r"\d", w)]


def recognize(x):
    global _vosk
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    if _vosk is None: _vosk = Model(VOSK)
    x16 = np.interp(np.arange(0, len(x), SR / 16000), np.arange(len(x)), x)
    r = KaldiRecognizer(_vosk, 16000)
    r.AcceptWaveform((np.clip(x16, -1, 1) * 32767).astype(np.int16).tobytes())
    return json.loads(r.FinalResult()).get("text", "").split()


def edges(heard, exp):
    """Words lost or gained at the start/end of a clip (a split point in the wrong place leaks words)."""
    ops = difflib.SequenceMatcher(None, heard, exp, autojunk=False).get_opcodes()
    e = {"missing_start": 0, "missing_end": 0, "extra_start": 0, "extra_end": 0}
    if not ops: return e
    t, i1, i2, j1, j2 = ops[0]
    if t == "delete": e["extra_start"] = i2 - i1
    if t == "insert": e["missing_start"] = j2 - j1
    if t == "replace" and (i2 - i1) > (j2 - j1): e["extra_start"] = (i2 - i1) - (j2 - j1)
    t, i1, i2, j1, j2 = ops[-1]
    if t == "delete": e["extra_end"] = i2 - i1
    if t == "insert": e["missing_end"] = j2 - j1
    if t == "replace" and (i2 - i1) > (j2 - j1): e["extra_end"] = (i2 - i1) - (j2 - j1)
    return e


def similarity(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() if a and b else 0.0


# ---------------------------------------------------------------- silence analysis
def frame_db(x, hop=240):  # 10 ms frames
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9
    return 20 * np.log10(rms), hop


def pauses(x, min_len=0.15):
    db, hop = frame_db(x)
    floor, speech = np.percentile(db, 10), np.percentile(db, 90)
    thr = floor + 0.3 * (speech - floor)
    quiet = db < thr
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            a, b = i * hop / SR, j * hop / SR
            if i > 0 and j < len(quiet) and b - a >= min_len: runs.append((a, b))
            i = j
        else:
            i += 1
    return runs, thr


def trim(x, thr_db, pre=0.05, post=0.12):
    db, hop = frame_db(x)
    on = np.where(db >= thr_db)[0]
    if not len(on): return x, 0.0
    a = max(0, on[0] * hop - int(pre * SR)); b = min(len(x), (on[-1] + 1) * hop + int(post * SR))
    return x[a:b], a / SR


# ---------------------------------------------------------------- commands
def cmd_lookup(a):
    prompt = open(a.prompt_file).read()
    hit = load_json(CACHE, {}).get(cache_key(a.voice, a.model, prompt))
    if hit and os.path.exists(os.path.join(R, hit["file"])):
        print(json.dumps({"cached": True, **hit})); return 0
    print(json.dumps({"cached": False, "key": cache_key(a.voice, a.model, prompt)})); return 2


def preserve(src, out, a):
    """Copy the original into _source/ (never modified) and register it in the cache."""
    sdir = os.path.join(out, "_source"); os.makedirs(sdir, exist_ok=True)
    h = sha_file(src); ext = os.path.splitext(src)[1] or ".mp3"
    dst = os.path.join(sdir, h[:12] + ext)
    if not os.path.exists(dst):
        shutil.copy2(src, dst); os.chmod(dst, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
    idx_p = os.path.join(sdir, "index.json"); idx = load_json(idx_p, [])
    entry = {"sha": h, "file": os.path.relpath(dst, R), "added": datetime.datetime.now().isoformat(timespec="seconds"),
             "voice": a.voice, "model": a.model, "generation_id": a.generation_id}
    if a.prompt_file:
        prompt = open(a.prompt_file).read(); entry["prompt"] = prompt
        cache = load_json(CACHE, {}); key = cache_key(a.voice, a.model, prompt)
        cache[key] = {"file": entry["file"], "sha": h, "voice": a.voice, "model": a.model,
                      "generation_id": a.generation_id, "added": entry["added"]}
        os.makedirs(os.path.dirname(CACHE), exist_ok=True); json.dump(cache, open(CACHE, "w"), indent=1)
    if not any(e["sha"] == h for e in idx): idx.append(entry); json.dump(idx, open(idx_p, "w"), indent=1, ensure_ascii=False)
    return dst, h


def get_lines(spec, only):
    lines = (spec.get("short") or spec.get("story") or spec)["lines"]
    if only:
        ids = only.split(","); by = {l["id"]: l for l in lines}
        missing = [i for i in ids if i not in by]
        if missing: sys.exit(f"ERROR lines not in spec: {missing}")
        return [by[i] for i in ids]
    return lines


def cmd_split(a):
    spec = json.load(open(a.spec)); lines = get_lines(spec, a.lines); N = len(lines)
    out = os.path.abspath(a.out); os.makedirs(out, exist_ok=True)
    sp_p = os.path.join(out, "splits.json"); sp = load_json(sp_p, {})
    if a.source:
        src, h = preserve(a.source, out, a)
        if os.path.basename(a.source) == "_download.mp3": os.remove(a.source)
    else:  # re-split the source already preserved here (no download, no new generation)
        if not sp.get("source"): sys.exit("ERROR no SOURCE given and no previous split in this folder")
        src, h = os.path.join(R, sp["source"]), sp["source_sha"]
        if sha_file(src) != h: sys.exit(f"ERROR preserved source {src} was modified (sha mismatch): restore it from _source/index.json")
    x = decode(src); dur = len(x) / SR
    runs, thr = pauses(x)
    ranked = sorted(runs, key=lambda r: r[1] - r[0], reverse=True)
    auto = sorted(((r[0] + r[1]) / 2 for r in ranked[:N - 1]))
    notes = []
    if len(runs) < N - 1:
        notes.append(f"only {len(runs)} pauses found for {N} lines")
    elif len(ranked) > N - 1:
        k, k1 = ranked[N - 2], ranked[N - 1]
        if (k[1] - k[0]) < 1.3 * (k1[1] - k1[0]):
            notes.append(f"ambiguous: the shortest chosen pause ({k[1]-k[0]:.2f}s at {k[0]:.2f}s) is barely longer than the next "
                         f"pause ({k1[1]-k1[0]:.2f}s at {k1[0]:.2f}s); speech recognition below confirms the split")
    same_src = sp.get("source_sha") == h and sp.get("lines") == [l["id"] for l in lines]
    if a.cuts:
        cuts, mode = [float(c) for c in a.cuts.split(",")], "manual"
    elif sp.get("mode") == "manual" and same_src and not a.auto:
        cuts, mode = sp["cuts"], "manual"
    else:
        cuts, mode = auto, "auto"
    nudge = sp.get("nudge", {}) if same_src else {}
    sp = {"source": os.path.relpath(src, R), "source_sha": h, "lines": [l["id"] for l in lines], "mode": mode,
          "cuts": [round(c, 3) for c in cuts], "auto_cuts": [round(c, 3) for c in auto], "nudge": nudge,
          "pauses": [[round(p, 3), round(q, 3)] for p, q in runs], "source_duration": round(dur, 3)}
    json.dump(sp, open(sp_p, "w"), indent=1)
    errs = []
    if len(cuts) != N - 1:
        errs.append({"check": "count", "message": f"{len(cuts)} split points give {len(cuts)+1} clips but there are {N} lines",
                     "fix": "regenerate with one [long pause] between every line, or set the cuts by hand (--cuts)"})
    elif any(b <= c for c, b in zip(cuts, cuts[1:])) or (cuts and (cuts[0] <= 0 or cuts[-1] >= dur)):
        errs.append({"check": "order", "message": f"split points must increase inside 0–{dur:.2f}s: {cuts}", "fix": "fix --cuts"})
    if not errs:
        bounds = [0.0] + list(cuts) + [dur]
        for i, l in enumerate(lines):
            seg = x[int(bounds[i] * SR):int(bounds[i + 1] * SR)]
            clip, off = trim(seg, thr)
            ds, de = nudge.get(l["id"], [0, 0])
            if ds or de:
                a0 = int(max(0, bounds[i] + off + ds) * SR); a1 = int(min(dur, bounds[i] + off + len(clip) / SR + de) * SR)
                clip = x[a0:a1]
            f = min(len(clip) // 4, int(0.005 * SR))
            if f: clip = clip.copy(); clip[:f] *= np.linspace(0, 1, f); clip[-f:] *= np.linspace(1, 0, f)
            write_wav(os.path.join(out, l["id"] + ".wav"), clip)
    rep = validate(lines, out, errs, notes, sp)
    return 0 if rep["status"] == "pass" else 1


def validate(lines, out, errs=None, notes=None, sp=None):
    errs = list(errs or []); sp = sp or load_json(os.path.join(out, "splits.json"), {})
    clips = []
    if not errs:
        texts = [spoken_words(l) for l in lines]
        for i, l in enumerate(lines):
            p = os.path.join(out, l["id"] + ".wav")
            if not os.path.exists(p):
                errs.append({"check": "count", "clip": l["id"], "message": f"missing clip {l['id']}.wav", "fix": "run split"}); continue
            x = decode(p); d = len(x) / SR; heard = recognize(x)
            exp = texts[i]; sim = similarity(heard, exp)
            wps = len(norm_words(l.get("say", l["text"]))) / max(d, 1e-3)
            c = {"line": l["id"], "duration": round(d, 2), "words_per_sec": round(wps, 2), "heard": " ".join(heard),
                 "expected": " ".join(exp), "match": round(sim, 2)}
            c["edges"] = edges(heard, exp)
            clips.append(c)
            cut_info = lambda k: f"split point {k} ({sp['cuts'][k]:.2f}s)" if sp.get("cuts") and 0 <= k < len(sp["cuts"]) else "the edge of the recording"
            if d < 0.3:
                errs.append({"check": "timing", "clip": l["id"], "message": f"clip '{l['id']}' is only {d:.2f}s",
                             "fix": f"a split point is inside a word: check {cut_info(i-1)} and {cut_info(i)}"})
            elif not 1.0 <= wps <= 5.5:
                errs.append({"check": "timing", "clip": l["id"],
                             "message": f"clip '{l['id']}' runs at {wps:.1f} words/s ({d:.2f}s for its text): it probably "
                                        f"{'contains extra speech' if wps < 1.0 else 'is cut short'}",
                             "fix": f"move {cut_info(i-1) if wps < 1.0 and i else cut_info(i)} (see 'pauses' in splits.json)"})
            if exp and sim < 0.5:
                nxt = similarity(heard, texts[i + 1]) if i + 1 < len(lines) else 0
                prv = similarity(heard, texts[i - 1]) if i > 0 else 0
                if max(nxt, prv) > sim + 0.15:
                    other = lines[i + 1]["id"] if nxt >= prv else lines[i - 1]["id"]
                    errs.append({"check": "order", "clip": l["id"],
                                 "message": f"clip '{l['id']}' sounds like line '{other}' (heard: \"{' '.join(heard)}\")",
                                 "fix": "the clips are shifted: a split point fell on a pause inside a line. Compare "
                                        "'cuts' with 'pauses' in splits.json, fix the wrong one (or pass --cuts) and split again"})
                else:
                    errs.append({"check": "alignment", "clip": l["id"],
                                 "message": f"clip '{l['id']}' does not match its text ({sim:.0%}); heard \"{' '.join(heard)}\"",
                                 "fix": "listen to it: if ElevenLabs said different words, fix `text`/`say` in the spec or "
                                        "regenerate that line only; if it is cut, move the split points"})
        cut_at = lambda k: f"{sp['cuts'][k]:.2f}s" if sp.get("cuts") and k < len(sp["cuts"]) else "?"
        for k in range(len(clips) - 1):
            a_, b_ = clips[k]["edges"], clips[k + 1]["edges"]
            if a_["missing_end"] and b_["extra_start"]:
                errs.append({"check": "boundary", "clip": clips[k]["line"],
                             "message": f"the end of '{clips[k]['line']}' leaked into '{clips[k+1]['line']}' (heard at its start: "
                                        f"\"{' '.join(clips[k+1]['heard'].split()[:b_['extra_start']])}\")",
                             "fix": f"split point {k} ({cut_at(k)}) is too early: move it to a later pause (see 'pauses' in splits.json)"})
            elif a_["extra_end"] and b_["missing_start"]:
                errs.append({"check": "boundary", "clip": clips[k + 1]["line"],
                             "message": f"the start of '{clips[k+1]['line']}' leaked into '{clips[k]['line']}' (heard at its end: "
                                        f"\"{' '.join(clips[k]['heard'].split()[-a_['extra_end']:])}\")",
                             "fix": f"split point {k} ({cut_at(k)}) is too late: move it to an earlier pause"})
        for c in clips:
            if c["edges"]["missing_end"] >= 2 or c["edges"]["missing_start"] >= 2:
                errs.append({"check": "boundary", "clip": c["line"],
                             "message": f"clip '{c['line']}' is missing words at its {'end' if c['edges']['missing_end'] >= 2 else 'start'}",
                             "fix": "a split point cuts into this line: move it to the pause after/before the line"})
    status = "fail" if errs else "pass"
    rep = {"status": status, "mode": sp.get("mode"), "cuts": sp.get("cuts"), "notes": notes or [], "clips": clips, "errors": errs}
    json.dump(rep, open(os.path.join(out, "split_report.json"), "w"), indent=1, ensure_ascii=False)
    for c in clips:
        print(f"  {c['line']:12s} {c['duration']:5.2f}s  {c['words_per_sec']:4.1f} w/s  match {c['match']:.0%}  heard: {c['heard'][:60]}")
    for n in rep["notes"]: print("  NOTE", n)
    for e in errs: print(f"  ERROR [{e['check']}] {e['message']}\n        fix: {e['fix']}")
    print(f"SPLIT {status.upper()} ({sp.get('mode')} cuts {sp.get('cuts')})  report: {os.path.join(out, 'split_report.json')}")
    return rep


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    lk = sub.add_parser("lookup"); lk.add_argument("--voice", required=True); lk.add_argument("--model", default="eleven_v4")
    lk.add_argument("--prompt-file", required=True)
    s = sub.add_parser("split"); s.add_argument("source", nargs="?"); s.add_argument("--url")
    s.add_argument("--spec", required=True); s.add_argument("--out", required=True); s.add_argument("--lines")
    s.add_argument("--voice"); s.add_argument("--model", default="eleven_v4"); s.add_argument("--prompt-file")
    s.add_argument("--generation-id"); s.add_argument("--cuts"); s.add_argument("--auto", action="store_true")
    v = sub.add_parser("validate"); v.add_argument("--spec", required=True); v.add_argument("--out", required=True); v.add_argument("--lines")
    a = ap.parse_args()
    if a.cmd == "lookup": sys.exit(cmd_lookup(a))
    if a.cmd == "split":
        if a.url and not a.source:
            os.makedirs(a.out, exist_ok=True); a.source = os.path.join(a.out, "_download.mp3")
            subprocess.run(["curl", "-sSfL", "-o", a.source, a.url], check=True)
        sys.exit(cmd_split(a))
    if a.cmd == "validate":
        rep = validate(get_lines(json.load(open(a.spec)), a.lines), os.path.abspath(a.out))
        sys.exit(0 if rep["status"] == "pass" else 1)


if __name__ == "__main__":
    main()
