"""Narration + word timings for a day spec.
usage: python3 voice.py days/dayNN.json OUTDIR
writes OUTDIR/voice.wav and OUTDIR/timeline.json
"""
import json, sys, wave, re, difflib, os
import numpy as np
import sherpa_onnx
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
T = "/home/claude/lobe_tools/"
spec = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
K = T + "kokoro/"
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=K + "model.int8.onnx", voices=K + "voices.bin",
                                                   tokens=K + "tokens.txt", data_dir=K + "espeak-ng-data"),
    num_threads=2), max_num_sentences=1))
VM = Model(T + "vosk-model")
VOICE = spec.get("voice", 6)  # 6 = am_michael (channel default)
SPEED = spec.get("speed", 1.05)
GAP = spec.get("gap", 0.32)
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())


def word_times(x, sr, words):
    x16 = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x)
    r = KaldiRecognizer(VM, 16000); r.SetWords(True)
    r.AcceptWaveform((np.clip(x16, -1, 1) * 32767).astype(np.int16).tobytes())
    rec = json.loads(r.FinalResult()).get("result", [])
    a = [norm(w["word"]) for w in rec]; b = [norm(w) for w in words]
    out = [None] * len(words)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            out[blk.b + k] = (rec[blk.a + k]["start"], rec[blk.a + k]["end"])
    dur = len(x) / sr
    anchors = [(-1, 0.0, 0.0)] + [(i, o[0], o[1]) for i, o in enumerate(out) if o] + [(len(words), dur, dur)]
    for (i0, s0, e0), (i1, s1, e1) in zip(anchors, anchors[1:]):
        n = i1 - i0 - 1
        for j in range(n):
            span = (s1 - e0) / n
            out[i0 + 1 + j] = (e0 + j * span, e0 + (j + 0.9) * span)
    return out


allw, lines, chunks, t, sr = [], [], [], 0.25, 24000
# optional pre-recorded lines (e.g. ElevenLabs): spec "audio_dir" (relative to the repo) holding <line_id>.wav
ADIR = spec.get("audio_dir"); ADIR = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "..", ADIR) if ADIR else None


def load_wav(fn, target=24000):
    with wave.open(fn) as w:
        r = w.getframerate(); ch = w.getnchannels()
        y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch > 1: y = y.reshape(-1, ch).mean(1)
    if r != target: y = np.interp(np.arange(0, len(y), r / target), np.arange(len(y)), y).astype(np.float32)
    return y


for ln in spec["short"]["lines"]:
    ext = os.path.join(ADIR, ln["id"] + ".wav") if ADIR else None
    if ext and os.path.exists(ext):
        x = load_wav(ext); sr = 24000
    else:
        a = tts.generate(ln.get("say", ln["text"]), sid=ln.get("voice", VOICE), speed=SPEED)  # per-line voice for sketches
        sr = a.sample_rate
        x = np.array(a.samples, np.float32)
    nz = np.where(np.abs(x) > 0.01)[0]
    x = x[max(0, nz[0] - 800): nz[-1] + 1600]
    words = ln["text"].split()
    for w, (s, e) in zip(words, word_times(x, sr, words)):
        allw.append({"w": w, "s": round(t + s, 3), "e": round(t + e, 3), "line": ln["id"]})
    lines.append({"id": ln["id"], "start": round(t, 3), "end": round(t + len(x) / sr, 3)})
    chunks.append((t, x)); t += len(x) / sr + GAP
total = t + 0.6
buf = np.zeros(int(total * sr), np.float32)
for st, x in chunks:
    i = int(st * sr); buf[i:i + len(x)] += x
buf *= 0.9 / np.abs(buf).max()
with wave.open(OUT + "/voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((buf * 32767).astype(np.int16).tobytes())
hop = sr // 30
env = [float(np.sqrt(np.mean(buf[i:i + hop] ** 2))) for i in range(0, len(buf), hop)]
mx = max(env) or 1
env = [round(min(1, e / mx * 1.4), 3) for e in env]
json.dump({"duration": round(total, 3), "lines": lines, "words": allw, "env": env}, open(OUT + "/timeline.json", "w"), indent=1)
for l in lines:
    print(f"{l['id']:10s} {l['start']:6.2f} - {l['end']:6.2f}")
print("total", round(total, 2))
