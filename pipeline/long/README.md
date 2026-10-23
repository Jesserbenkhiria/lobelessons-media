# 16:9 long-form renderer

Separate from the Shorts renderer (`pipeline/render.js`, unchanged). It reuses `pipeline/lobe_rig.js` (characters),
`pipeline/mix.py` + `sfx.py` (narration, music, sound effects) and `pipeline/finance.py` (every number).

```
story.json ──► timing.py ──► timeline.json + voice.wav     (real clips from el_split, or estimated timing)
          └──► finance.py values ──► verified values + series
                      │
                      ▼
render_long.js: one page per scene (pages/<id>.html, setT(t) draws any moment)
   ├─ frames ─► scenes/<id>.<hash>.<res>.mp4      (cache: hash of scene + timing + facts + renderer code)
   ├─ interrupted? resumes from the last frame
   └─ all scenes ─► concat ─► mix.py ─► story_<res>.mp4 (+ events.json, layout_pages.json for QA)
```

Commands
```
node pipeline/long/render_long.js STORY.json OUT --preview          # 960x540, ~70 ms/frame
node pipeline/long/render_long.js STORY.json OUT                    # 1920x1080, ~110-160 ms/frame
node pipeline/long/render_long.js STORY.json OUT --scenes B         # one scene (scene preview)
node pipeline/long/render_long.js STORY.json OUT --stills A:2.5,C:10 # single frames
python3 qa/video_qa.py OUT/story_540p.mp4 --profile long_preview --build OUT --spec STORY.json
```

## Story spec
- `facts_file` (or `facts`), `lines` [{id, speaker, text, say?}], `audio_dir` (clips from el_split), `gap`, `captions.long`.
- `scenes` [{id, lines | duration, lead, tail, min_duration, env, actors, elements, shots}]. Narration decides scene length.
- Times anywhere (`at`, `in`, `out`, `start`, `end`): seconds in the scene, `"line"`, `"line:word"`, `"line:word#2"`,
  `"line:end"`, `"end"`, plus an offset (`"b2:spends+0.3"`).
- `shots` [{at, zoom, cx, cy, cut | ease, drift, shake}]: camera moves are independent of lines (several shots per line).
- `actors` [{id, who: rich|broke, x, y (feet), scale, face: l|r, cues: [{at, pose} | {at, x, y, move}]}]; an actor's mouth
  moves on lines whose `speaker` is its id.
- `env`: `room` (window sky, shelf, lamp, picture), `split` (two rooms), `sky` (days passing, sun/moon), `plain`.

## Elements (pipeline/long/components.js)
| type | what | numbers |
|---|---|---|
| title | words drop in, *gold* highlight | |
| label, stamp, note | pills, stamp slam, assumption chip (short wording by assumption id) | stamp text checked by finance.py |
| counter | rolling money counter, optional card | `fact` (final) and/or `series` + `idx`; refuses to render if they disagree |
| chart | progressive line chart, head tags | `series` ids |
| timeline | years track, marker hops year by year | |
| calendar | month/year page flips | |
| jar, plant, laptop | grow/fill with a ramp or a series | |
| pile, emitter, prop, thought | things bought pile up and fade, coins fly, props, thought bubble | |

## Not done yet
New poses (sad/smug/tired/walk cycle), more environments, transitions between scenes, parallel rendering,
long-video hosting (GitHub Releases test), 48 kHz in the Shorts build (planned, build.sh is protected).
