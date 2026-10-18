"""Mix narration + soft music + SFX cues. usage: python3 mix.py OUTDIR  -> OUTDIR/mix.wav"""
import json, wave, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx
OUT = sys.argv[1]; SR = 44100
with wave.open(OUT + "/voice.wav") as f:
    vsr = f.getframerate(); v = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
v = np.interp(np.arange(0, len(v), vsr / SR), np.arange(len(v)), v).astype(np.float32)
n = len(v)
chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 329.6]]
music = np.zeros(n, np.float32); seg = 4.0
for k in range(int(np.ceil(n / SR / seg))):
    a, b = int(k * seg * SR), min(n, int((k + 1) * seg * SR + 0.6 * SR))
    if a >= n: break
    tt = np.arange(b - a) / SR
    envl = np.minimum(1, tt / 0.8) * np.minimum(1, np.maximum(0, (seg + 0.6 - tt) / 0.8))
    ch = chords[k % 4]
    s = sum(np.sin(2 * np.pi * f * tt) * 0.5 + 0.25 * np.sin(2 * np.pi * f * 2 * tt) for f in ch) / len(ch)
    s += 0.6 * np.sin(2 * np.pi * ch[0] / 2 * tt)
    for beat in np.arange(0, seg, 0.5):
        i0 = int(beat * SR)
        if i0 < len(tt):
            m = min(len(tt) - i0, int(0.4 * SR)); tb = np.arange(m) / SR
            s[i0:i0 + m] += 0.35 * np.sin(2 * np.pi * ch[int(beat * 2) % 4] * 2 * tb) * np.exp(-tb / 0.12)
    music[a:b] += (s * envl)[:b - a]
music *= 0.05 / (np.sqrt(np.mean(music ** 2)) + 1e-9)
venv = np.convolve(np.abs(v), np.ones(4410) / 4410, mode="same")
mix = v * 0.9 + music * (1 - 0.45 * np.clip(venv / (venv.max() * 0.3), 0, 1))
cache = {}
for tt, name, g in json.load(open(OUT + "/events.json")):
    if name not in cache: cache[name] = sfx.LIB[name]()
    s = cache[name] * g; i = int(tt * SR); j = min(n, i + len(s))
    if i < n: mix[i:j] += s[:j - i]
mix /= max(1, np.abs(mix).max() / 0.97)
with wave.open(OUT + "/mix.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("mix ok", round(n / SR, 2))
