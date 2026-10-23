"""Builds story_opening.json (the 30-45 s proof-of-style) from script.json + the shot plan below."""
import json, os
D = os.path.dirname(os.path.abspath(__file__)); S = json.load(open(os.path.join(D, "script.json")))
L = {l["id"]: l for l in S["lines"]}
A = lambda n: f"episodes/ep01/assets/pexels_{n}.jpg"
NO_CAP = {"captions": False}
story = {
 "title": "Ep01 opening: proof of style", "components": ["pipeline/essay/fonts.js", "pipeline/essay/components_essay.js"],
 "audio_dir": "audio", "gap": 0.3, "lead": 0.0, "tail": 0.35,
 "captions": {"long": ""},
 "lines": [{"id": i, "speaker": "lobe", "text": L[i]["text"], **({"say": L[i]["say"]} if "say" in L[i] else {})} for i in ["s1_01", "s1_02", "s1_03", "s1_04", "s1_05"]],
 "scenes": [
  {"id": "drawer", "lines": ["s1_01"], "lead": 0.05, **NO_CAP, "env": {"type": "plain", "color": "#111"},
   "elements": [
    {"type": "photo", "src": A(4219101), "in": 0, "fin": 0.01, "kb": {"from": [1.0, 0.5, 0.5], "to": [1.12, 0.48, 0.55]}, "pos": [0.5, 0.5], "grade": "warm"},
    {"type": "vignette"},
    {"type": "write", "text": "EXHIBIT A", "x": 330, "y": 150, "size": 84, "color": "#fff", "rot": -5, "shadow": True, "in": 0.05, "dur": 0.4},
    {"type": "marker", "x": 1010, "y": 560, "rx": 210, "ry": 150, "in": 0.35, "sfx": "pop", "gain": 0.3},
    {"type": "write", "text": "USED: 0 TIMES", "x": 1420, "y": 330, "size": 92, "rot": -6, "in": "s1_01:use", "shadow": True}]},
  {"id": "three_things", "lines": ["s1_02"], **NO_CAP, "env": {"type": "plain", "color": "#111"},
   "elements": [
    {"type": "photo", "src": A(7496818), "in": 0, "out": "s1_02:Maybe#2", "fin": 0.01, "fout": 0.01, "kb": {"from": [1.1, 0.5, 0.45], "to": [1.3, 0.5, 0.5]}},
    {"type": "ticker", "from": 1, "to": 17, "start": "s1_02:cucumber", "end": "s1_02:shapes", "x": 1500, "y": 470, "size": 230, "label": "SHAPES", "in": "s1_02:cucumber", "out": "s1_02:Maybe#2", "fin": 0.2, "fout": 0.01, "sfx": "dice", "gain": 0.35},
    {"type": "write", "text": "(used once)", "x": 1500, "y": 720, "size": 58, "color": "#fff", "rot": -4, "shadow": True, "in": "s1_02:shapes+0.4", "out": "s1_02:Maybe#2", "fout": 0.01},
    {"type": "photo", "src": A(11485130), "in": "s1_02:Maybe#2", "out": "s1_02:Or", "fin": 0.01, "fout": 0.01, "kb": {"from": [1.15, 0.42, 0.5], "to": [1.32, 0.45, 0.5]}},
    {"type": "write", "text": "BOUGHT: 2023\nWORN: NEVER", "x": 880, "y": 600, "size": 92, "color": "#2b2b2b", "rot": -34, "in": "s1_02:tag", "out": "s1_02:Or", "fout": 0.01, "dur": 0.8},
    {"type": "photo", "src": A(8071732), "in": "s1_02:Or", "fin": 0.01, "kb": {"from": [1.0, 0.5, 0.35], "to": [1.15, 0.5, 0.45]}, "pos": [0.5, 0.35], "grade": "warm"},
    {"type": "stamp", "text": "KEPT SINCE 2017", "x": 560, "y": 230, "size": 64, "color": "#E0463A", "in": "s1_02:since"},
    {"type": "phone", "caller": "NASA", "sub": "“about that cable…”", "x": 1430, "y": 600, "in": "s1_02:NASA", "enter": "none", "sfx": "ding", "gain": 0.35}]},
  {"id": "lobe_idea", "lines": ["s1_03"], **NO_CAP, "env": {"type": "plain", "color": "#F6EFE4"},
   "actors": [{"id": "lobe", "who": "rich", "x": 640, "y": 1090, "scale": 2.15, "face": "r", "cues": [{"at": 0, "pose": "explain"}, {"at": "s1_03:fantastic", "pose": "idea"}]}],
   "elements": [
    {"type": "thought", "icons": ["\U0001F6D2", "✨", "\U0001F4E6"], "x": 1280, "y": 300, "size": 84, "in": "s1_03:bought", "tail": "l"},
    {"type": "label", "text": "✨ FANTASTIC IDEA ✨", "x": 1330, "y": 610, "size": 54, "bg": "gold", "fg": "#111", "in": "s1_03:fantastic"}],
   "shots": [{"at": 0, "zoom": 1.0}, {"at": "s1_03:fantastic", "zoom": 1.12, "cx": 1000, "cy": 520, "ease": 0.8}]},
  {"id": "tue_fri", "lines": ["s1_04"], **NO_CAP, "env": {"type": "plain", "color": "#22252B"},
   "elements": [
    {"type": "card", "kicker": "TUESDAY", "title": "I <span style='color:#E0463A'>NEED</span> THIS.", "x": 620, "y": 520, "w": 720, "size": 104, "rot": -3, "in": 0.05, "dim": "s1_04:Friday", "sfx": "pop", "gain": 0.4},
    {"type": "card", "kicker": "FRIDAY", "kicker_color": "#888", "title": "…what is this?", "x": 1330, "y": 560, "w": 700, "size": 88, "rot": 3, "accent": "#7d766a", "in": "s1_04:Friday", "enter": "slide-left", "sfx": "whoosh", "gain": 0.35},
    {"type": "photo", "src": A(7496818), "x": 1145, "y": 700, "w": 370, "h": 230, "radius": 18, "grade": "gray", "in": "s1_04:Friday+0.35", "kb": {"from": [1.2, 0.5, 0.5], "to": [1.2, 0.5, 0.5]}}]},
  {"id": "case_file", "lines": ["s1_05"], **NO_CAP, "tail": 0.9, "env": {"type": "plain", "color": "#F6EFE4"},
   "actors": [{"id": "lobe", "who": "rich", "x": 470, "y": 1075, "scale": 1.85, "face": "r", "cues": [{"at": 0, "pose": "think"}, {"at": "s1_05:nonsense", "pose": "approve"}]}],
   "elements": [
    {"type": "label", "text": "LOBE LESSONS · EPISODE 01", "x": 1240, "y": 170, "size": 34, "bg": "dark", "in": 0.1},
    {"type": "card", "kicker": "CASE FILE #01", "title": "Humanity's most expensive hobby", "body": "BUYING NONSENSE.", "type_on": True, "typeStart": "s1_05:buying", "typeDur": 0.9, "mono": True, "bodySize": 64, "bodyWeight": 900, "size": 66, "x": 1240, "y": 520, "w": 860, "bg": "#fff", "border": "4px solid #151515", "in": "s1_05:investigating", "sfx": "typing", "sfxAt": "s1_05:buying", "gain": 0.3}],
   "shots": [{"at": 0, "zoom": 1.0}, {"at": "s1_05:nonsense", "zoom": 1.06, "cx": 1000, "cy": 540, "ease": 0.6}]}
 ]}
json.dump(story, open(os.path.join(D, "story_opening.json"), "w"), indent=1, ensure_ascii=False)
print("ok")
