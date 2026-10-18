"""Synthesized sound effects (44.1 kHz mono float arrays)."""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def _env(n, a=0.005, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if r:
        e *= np.exp(-t / r)
    return e


def _lp(x, k):
    # simple one-pole lowpass with per-sample coefficient array or scalar
    y = np.zeros_like(x)
    k = np.broadcast_to(k, x.shape)
    acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc)
        y[i] = acc
    return y


def whoosh(dur=0.45):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    sweep = np.linspace(0.02, 0.35, n) ** 1.5
    x = _lp(noise, sweep)
    x = _lp(x, 0.6)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 2 * (0.4 + 0.6 * t)
    x = x * env
    return 0.9 * x / (np.abs(x).max() + 1e-9)


def pop(freq=900, dur=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.2 * np.exp(-t / 0.01))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.7 * np.sin(ph) * _env(n, 0.002, 0.022)


def ding(freq=1318, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t / (0.35 / m)) for m, a in [(1, 1), (2.01, 0.4), (3.02, 0.2), (4.1, 0.1)])
    return 0.5 * x * _env(n, 0.002)


def cash():
    a = ding(2093, 0.6)
    b = ding(2637, 0.9)
    out = np.zeros(int(1.2 * SR))
    out[:len(a)] += a
    o = int(0.09 * SR)
    out[o:o + len(b)] += b
    # drawer clunk
    c = thud(0.12) * 0.5
    out[:len(c)] += c
    return 0.8 * out


def thud(dur=0.35, freq=70):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 2.5 * np.exp(-t / 0.03))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.001, 0.09)
    click = rng.standard_normal(n) * _env(n, 0.0005, 0.006) * 0.4
    return 0.95 * (x + click)


def stamp():
    x = thud(0.4, 60)
    n = len(x)
    noise = _lp(rng.standard_normal(n), 0.3) * _env(n, 0.001, 0.03)
    return 0.9 * (x + 0.6 * noise / (np.abs(noise).max() + 1e-9))


def riser(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 200 * (6 ** (t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = _lp(rng.standard_normal(n), np.linspace(0.02, 0.5, n))
    env = (t / dur) ** 2
    x = (0.4 * tone + 0.6 * noise / (np.abs(noise).max() + 1e-9)) * env
    return 0.6 * x


def click():
    n = int(0.03 * SR)
    x = rng.standard_normal(n) * _env(n, 0.0005, 0.004)
    return 0.5 * _lp(x, 0.5) * 3


def typing(dur=1.2, rate=11):
    out = np.zeros(int(dur * SR))
    t = 0.0
    while t < dur - 0.04:
        c = click() * rng.uniform(0.5, 1.0)
        i = int(t * SR)
        out[i:i + len(c)] += c[:len(out) - i]
        t += rng.uniform(0.6, 1.4) / rate
    return out


def dice(dur=0.7):
    out = np.zeros(int(dur * SR))
    t = 0.0
    gap = 0.03
    while t < dur - 0.05:
        c = click() * rng.uniform(0.6, 1.0)
        i = int(t * SR)
        out[i:i + len(c)] += c[:len(out) - i]
        t += gap
        gap *= 1.35
    return out * 1.4


LIB = {"whoosh": whoosh, "pop": pop, "ding": ding, "cash": cash, "thud": thud, "stamp": stamp,
       "riser": riser, "typing": typing, "dice": dice, "pop_hi": lambda: pop(1400, 0.08)}
