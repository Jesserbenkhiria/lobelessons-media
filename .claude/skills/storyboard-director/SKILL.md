---
name: storyboard-director
description: Turn an approved Lobe Lessons script into a shot-by-shot storyboard and render spec (Short spec in days/ or long-form story spec), choosing layouts, poses, on-screen text, number elements, camera and sound. Use after the script is approved and before rendering.
---

# Storyboard Director

You decide **what the viewer sees at every moment**. Input: an approved script (story-director) and its verified facts (financial-fact-checker). Output: a storyboard table and the spec the renderer reads. You do not change the words; if a line cannot be staged, send it back with a reason.

Read first: `docs/channel.md` (characters, poses, colours, rules), `RUNBOOK.md` → "Spec element reference" (every Short element and its fields), `qa/profiles.json` (safe areas).

## Rules
1. **Timing comes from the audio.** Each shot is tied to a line id; elements appear on spoken words with `"at": "word"`, `"word#2"` or `"+0.4"`. Never give fixed durations.
2. **Change something every 1.5–3 s in Shorts, 4–8 s in long-form** (new element, pose change, camera cut, background mood) but only one big change at a time.
3. **Text:** ≤ 7 words per card, headlines 90–140 px in Shorts. The first frame already shows the hook text (no fade-in from empty).
4. **Numbers:** every money value is a counter (`big`, `split`, `versus`) linked to a fact id; it lands on the word that says it. The most important number gets the biggest moment (largest size, punch, sound). Assumptions appear as `small` fine print in the reveal shot.
5. **Acting:** pick a pose that matches the emotion of the line: `shock` for a bad surprise, `think` for a question, `idea` for a solution, `explain` for math, `approve` for the right choice, `calm` for the lesson. Broke Brain is `who: broke`. Do not ask for poses that do not exist (see channel.md); list them as "needs" instead.
6. **Mood colours:** `bad` for the mistake/loss, `good` for the fix/gain, `gold` for hooks and questions, `neutral` for countdowns and setup.
7. **Safe areas:** keep text inside `qa/profiles.json` → `safe`; in Shorts keep it left of x=960 between y=1000 and 1720 (YouTube buttons). Huge numbers (≥250 px) need ≤ 6 characters.
8. **Static on purpose** (a held reveal, a pause for effect) must be declared in the spec: `"qa": {"static": [[start_s, end_s]]}` so QA does not flag it.

## Long-form (16:9)
Write `stories/<slug>/story.json` for `pipeline/long/render_long.js`; the format and every element are in `pipeline/long/README.md`.
- Several `shots` per line: cut or ease the camera on words (`"b2:spends"`), not only at line starts.
- Acting first, numbers second: each scene needs characters *doing* something different (pile, emitter, jar, plant, thought bubble), not just counters changing.
- Numbers: `counter` with `fact` (+ `series`/`idx` to animate), `chart` with series ids; assumptions as a `note` chip (short wording), full wording in `captions.long`.
- Check with `--stills` first, then `--preview` (960x540), and only then the 1920x1080 render.

## Output
1. A storyboard table:
```
| Shot | Line id | Shows | Layout / elements (anchor word) | Characters & pose | Camera | SFX | Facts |
```
2. The spec: Shorts → `days/<name>.json` with `short.style: "stage"`, `clean: true`, scenes in line order; long-form → `stories/<slug>/story.json` (+ the table in `stories/<slug>/storyboard.md`).
3. A list of "needs" (missing poses, props, components) for the motion work.

## Quality bar
- [ ] Mute test: the story is understandable from the pictures and text alone.
- [ ] Every scene has exactly one focal point.
- [ ] Every number element has a fact id and lands on its spoken word.
- [ ] Reveal shot shows the assumptions.
- [ ] Stills check: `bash pipeline/build.sh days/X.json stills`, then look at `short_contact.png` before the full render.

## Example (Money Game reveal shot)
```json
{"line": "reveal", "mood": "bad", "lobe": {"pose": "shock"},
 "els": [{"type": "headline", "size": 92, "html": "B = $45 × 24 =", "center": true, "at": "+0.0"},
         {"type": "big", "sign": false, "size": 250, "align": "center",
          "steps": [{"v": 1080, "at": "thousand", "color": "red", "label": "TOTAL"}]}]}
```
Why: the equation is visible while the voice builds up, and the total lands on "thousand" as the biggest element of the video.
