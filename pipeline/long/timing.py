#!/usr/bin/env python3
"""Narration timeline for a long-form story (16:9). Audio decides scene length.

usage: python3 pipeline/long/timing.py STORY.json OUTDIR
writes OUTDIR/timeline.json and OUTDIR/voice.wav

* Lines with a recorded clip (story "audio_dir"/<line_id>.wav, from pipeline/el_split.py) use the real
  audio and real word timings (Vosk alignment, same method as pipeline/voice.py).
* Lines without audio get an ESTIMATED timing (about 2.6 words/s) and silence, so a story can be
  previewed before any credits are spent. The timeline says which lines are estimated.
* Scenes are laid out one after another: lead-in, the scene's lines with `gap` between them, tail.
  A scene with no lines lasts `duration` seconds. `min_duration` stretches a scene for visuals.
"""
import json, os, re, sys, wave
import numpy as np

SR = 24000
VOSK = "/home/claude/lobe_tools/vosk-model"
WPS = 2.6
_vm = None
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())


def load_wav(fn):
    with wave.open(fn) as w:
        r = w.getframerate(); ch = w.getnchannels()
        y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch > 1: y = y.reshape(-1, ch).mean(1)
    if r != SR: y = np.interp(np.arange(0, len(y), r / SR), np.arange(len(y)), y).astype(np.float32)
    return y


def word_times(x, words):
    """Same alignment approach as pipeline/voice.py (copied, so voice.py stays untouched)."""
    global _vm
    import difflib
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    if _vm is None: _vm = Model(VOSK)
    x16 = np.interp(np.arange(0, len(x), SR / 16000), np.arange(len(x)), x)
    r = KaldiRecognizer(_vm, 16000); r.SetWords(True)
    r.AcceptWaveform((np.clip(x16, -1, 1) * 32767).astype(np.int16).tobytes())
    rec = json.loads(r.FinalResult()).get("result", [])
    a = [norm(w["word"]) for w in rec]; b = [norm(w) for w in words]
    out = [None] * len(words)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size): out[blk.b + k] = (rec[blk.a + k]["start"], rec[blk.a + k]["end"])
    dur = len(x) / SR
    anchors = [(-1, 0.0, 0.0)] + [(i, o[0], o[1]) for i, o in enumerate(out) if o] + [(len(words), dur, dur)]
    for (i0, s0, e0), (i1, s1, e1) in zip(anchors, anchors[1:]):
        n = i1 - i0 - 1
        for j in range(n):
            span = (s1 - e0) / n; out[i0 + 1 + j] = (e0 + j * span, e0 + (j + 0.9) * span)
    return out


def estimate(words):
    """Plausible word timings without audio: longer words take longer, commas/periods add a pause."""
    t, out = 0.0, []
    for w in words:
        d = 0.16 + 0.055 * len(re.sub(r"[^A-Za-z0-9]", "", w))
        out.append((t, t + d)); t += d + (0.22 if w[-1:] in ",;:" else 0.32 if w[-1:] in ".!?" else 0.04)
    scale = (len(words) / WPS) / max(t, 1e-3)
    return [(s * scale, e * scale) for s, e in out], len(words) / WPS


def main():
    story_p, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    st = json.load(open(story_p)); base = os.path.dirname(os.path.abspath(story_p))
    adir = os.path.join(base, st["audio_dir"]) if st.get("audio_dir") else None
    L = {l["id"]: l for l in st.get("lines", [])}
    gap, lead, tail = st.get("gap", 0.45), st.get("lead", 0.4), st.get("tail", 0.7)
    t, scenes, lines, words, chunks, estimated = 0.0, [], [], [], [], []
    for sc in st["scenes"]:
        t0 = t; t = t0 + sc.get("lead", lead if sc.get("lines") else 0)
        for lid in sc.get("lines", []):
            ln = L[lid]; ws = ln["text"].split(); clip = os.path.join(adir, lid + ".wav") if adir else None
            if clip and os.path.exists(clip):
                x = load_wav(clip); nz = np.where(np.abs(x) > 0.01)[0]
                if len(nz): x = x[max(0, nz[0] - 800): nz[-1] + 1600]
                tw, d = word_times(x, ws), len(x) / SR; chunks.append((t, x))
            else:
                tw, d = estimate(ws); estimated.append(lid)
            for w, (s, e) in zip(ws, tw):
                words.append({"w": w, "s": round(t + s, 3), "e": round(t + e, 3), "line": lid})
            lines.append({"id": lid, "scene": sc["id"], "speaker": ln.get("speaker", "narrator"),
                          "start": round(t, 3), "end": round(t + d, 3)})
            t += d + gap
        if sc.get("lines"): t = t - gap + sc.get("tail", tail)
        t = max(t, t0 + sc.get("min_duration", 0), t0 + sc.get("duration", 0))
        scenes.append({"id": sc["id"], "start": round(t0, 3), "end": round(t, 3)})
    total = t
    buf = np.zeros(int(total * SR) + SR // 10, np.float32)
    for s, x in chunks:
        i = int(s * SR); buf[i:i + len(x)] += x[:len(buf) - i]
    if np.abs(buf).max() > 0: buf *= 0.9 / np.abs(buf).max()
    n = int(np.ceil(total * 30)); env = []
    for k in range(n):
        tt = k / 30; seg = buf[int(tt * SR): int((tt + 1 / 30) * SR)]
        e = float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0
        if any(w["s"] <= tt <= w["e"] and w["line"] in estimated for w in words):   # fake mouth for estimated lines
            e = 0.25 + 0.2 * abs(np.sin(2 * np.pi * 4.3 * tt))
        env.append(e)
    mx = max(max(env), 1e-6); env = [round(min(1, e / mx * 1.4), 3) for e in env]
    # pipeline/mix.py (shared, unchanged) divides by the voice level: a fully silent track gives NaN = no audio.
    # An inaudible -80 dBFS floor keeps it working for previews without recorded narration.
    if not chunks:
        buf += (np.random.default_rng(0).standard_normal(len(buf)) * 1e-4).astype(np.float32)
    with wave.open(os.path.join(out, "voice.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "estimated_lines": estimated, "scenes": scenes, "lines": lines,
               "words": words, "env": env}, open(os.path.join(out, "timeline.json"), "w"), indent=1)
    for s in scenes: print(f"scene {s['id']:10s} {s['start']:7.2f} - {s['end']:7.2f}")
    print(f"total {total:.2f}s" + (f"  (estimated timing for {len(estimated)} lines: no audio yet)" if estimated else ""))


if __name__ == "__main__":
    main()
