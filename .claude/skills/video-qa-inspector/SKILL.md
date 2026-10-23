---
name: video-qa-inspector
description: Inspect an exported Lobe Lessons video before it is scheduled or sent for approval, using the automated QA (format, black/frozen frames, audio, loudness, narration timing, text and subtitle bounds, numbers) plus a visual review of the contact sheet; also runs the Shorts regression check after any pipeline change. Use after every render and before every publish.
---

# Video QA Inspector

You are the last gate before a video goes out. A video that fails QA is **not scheduled and not sent as final**: fix it or report exactly why it is blocked.

Read first: `docs/channel.md` → "Non-negotiables". Thresholds live in `qa/profiles.json`; do not loosen them to make a video pass.

## 1. Automated checks
```
python3 qa/video_qa.py VIDEO.mp4 --profile short|long --build OUTDIR --spec SPEC.json --out OUTDIR/qa
```
- `--build` is the pipeline output folder (`/home/claude/lobe_out/<name>`, has `timeline.json` and `short.html`); without it narration and layout checks are skipped.
- Output: `qa_report.json` (status, counts, every check with `message`, `fix`, `at`) and `qa_contact.jpg` (frames at even times and line starts; issue frames boxed in red).
- Exit code 1 = at least one `fail`.

What it checks: resolution, fps, duration window, pixel format; audio present, not silent, no clipping, loudness −14 LUFS ±2, true peak ≤ −1 dBTP, sample rate; black frames; frozen picture (fails if it happens during narration or as dead air; intentional holds must be declared in the spec `qa.static`; a short hold after the last word is allowed); first word timing, word order, long silences, narration cut off, timeline vs video duration; text off frame, outside the safe area or under the YouTube buttons; subtitles outside their band or over 2 lines; every money amount against the spec's facts block.

## 2. Visual review (things automation cannot judge)
Open `qa_contact.jpg` with the Read tool and check:
- The first frame works as a thumbnail-like hook (text readable at phone size).
- Each pose matches the line's emotion; no character covers text.
- The key number is the biggest element of its scene and lands with the voice.
- Captions highlight the spoken word (no drift); fades do not leave ghost text.
- Nothing looks broken: missing glyphs (□), overlapping cards, cut-off emoji.
For anything doubtful, render stills at that time: `node pipeline/render.js short SPEC OUT <t> <t2>`.

## 3. Triage and fix loop
| Failure | Usual fix |
|---|---|
| `layout.outside_safe` / `off_canvas` | Smaller `size`, shorter text, or move the element; re-render |
| `subtitles.lines` | Shorter words in that line or fewer words per caption chunk |
| `narration.gap` / `first_word` | Trim silence in the clip (el_split nudge) or lower `gap` |
| `video.frozen` | If intended, declare `qa.static`; else re-render (stalled frames) |
| `audio.loudness` / `true_peak` / `clipping` | Re-encode with `loudnorm=I=-14:TP=-1.5:LRA=11`; check SFX gains |
| `finance.*` | Go to financial-fact-checker; never edit a number by hand |
Re-run QA after every fix. Never edit `qa/profiles.json` or the checks to get a pass; if a rule is wrong, report it to Jesser.

## 4. After any change to shared pipeline files
```
python3 qa/regress.py            # must print REGRESSION PASS
bash tests/run_tests.sh          # full suite
```
A regression failure blocks the change; it names the frame and writes a diff heat map. Only update references (`--update`) after Jesser approved the new look.

## Output (report to Jesser in a few lines)
```
QA: PASS|FAIL  (n pass / n fail / n warn)   video: <name>  duration 16.9 s
Blocking: <check id> at <time>: <message> → <fix applied or needed>
Visual review: <one line>
Contact sheet: sent
```
Send `qa_contact.jpg` with the video when asking for approval.

## Quality bar
- [ ] `video_qa.py` exit code 0 with `--build` and `--spec` given (no skipped layout/narration checks).
- [ ] Contact sheet reviewed; every red-boxed frame explained.
- [ ] Warnings either fixed or listed in the report.
