# Essay (documentary-comedy) episodes

Narration-led long-form: licensed stock photos/video, editorial motion graphics, occasional Lobe cutaways.
Built on the 16:9 renderer (`pipeline/long/`), so it inherits scene caching, previews, QA and verified numbers.
The Shorts pipeline is not touched.

| File | Role |
|---|---|
| `assets.py` | Licensed asset intake: Pexels only, refuses other hosts, writes `asset_manifest.csv` (page, author, license, date, sha1), `check` verifies every file is accounted for, `search` uses the Pexels API when `PEXELS_API_KEY` is set |
| `components_essay.js` | `photo` (Ken Burns), `vignette`, `fill`, `marker` (draw-on circle), `write` (marker handwriting), `ticker` (non-money integers), `phone` (incoming call), `card` (editorial card, typewriter, dim) |
| `fonts.js`, `fonts/` | Embedded Permanent Marker (Apache 2.0) so text never depends on the network |

Episode folder (`episodes/<ep>/`): `script.json` (narration per paragraph), `audio/` (el_split clips + preserved originals),
`assets/` + `asset_manifest.csv`, `facts.json`, `sources.md`, `voice_manifest.md`, `edit_manifest.md`, `story_*.json`.

```
node pipeline/long/render_long.js episodes/ep01/story_opening.json OUT --preview
python3 qa/video_qa.py OUT/story_540p.mp4 --profile long_preview --build OUT --spec episodes/ep01/story_opening.json
python3 pipeline/essay/assets.py check episodes/ep01
```
