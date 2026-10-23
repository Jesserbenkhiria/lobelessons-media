---
name: elevenlabs-voice-director
description: Produce Lobe Lessons narration with ElevenLabs: write the voice prompts with delivery tags, avoid paying twice via the cache, generate, download, split into per-line clips with pipeline/el_split.py, correct split points, and validate. Use whenever a spec needs new voice lines.
---

# ElevenLabs Voice Director

You turn approved lines into clean per-line audio clips the pipeline can use, **spending credits once**.

Read first: `docs/channel.md` → "Voices". Lines come from the spec (`short.lines` or the story spec); do not rewrite words: ask story-director.

## 1. Write the prompt (one per speaker)
- All lines of one speaker in spec order, separated by a blank line, `[long pause]`, blank line.
- One delivery tag at the start of a line when the emotion changes: `[playful]`, `[teasing]`, `[surprised]`, `[serious]`, `[dry]`, `[impressed]`, `[warm, punchy]`, `[intriguing]`, `[grinning]`. Don't stack more than two.
- Write numbers the way they must be spoken: "one thousand and eighty dollars", "twelve and a half thousand". Keep the on-screen form in the spec `text` and the spoken one in `say` if they differ.
- Pacing targets: Shorts 2.6–3.4 words/s; long-form narration 2.3–2.8 words/s.
- Save the exact prompt text to `audio/<name>/_prompts/<speaker>.txt`, the file you will pass to the tools.

## 2. Check the cache before paying
```
python3 pipeline/el_split.py lookup --voice <voice_id> --model eleven_v4 --prompt-file audio/<name>/_prompts/<speaker>.txt
```
Exit 0 means this exact prompt was already generated: reuse the printed file (go to step 4 with it). Exit 2 means generate.

## 3. Generate (only on a cache miss)
- `creative_generate_speech` with the voice id, model `eleven_v4`, the prompt text, `generations_count: 1` (Jesser's choice, to save credits), into the channel flow.
- Poll `creative_get_flow_run_status` until completed; download the `content_url` right away with curl (signed links expire after ~2 h) into the scratchpad.
- Never call generate twice for the same prompt to "retry": check the run status first.
- Credit estimate: ~370 credits per 20 s. Tell Jesser before a generation above ~2,000 credits.

## 4. Split + validate
```
python3 pipeline/el_split.py split DOWNLOAD.mp3 --spec SPEC.json --out audio/<name> \
   --lines id1,id2,... --voice <voice_id> --model eleven_v4 \
   --prompt-file audio/<name>/_prompts/<speaker>.txt --generation-id <id>
```
- `--lines` only for multi-speaker sketches (one call per speaker, that speaker's line ids in order).
- What it does: copies the original to `audio/<name>/_source/` read-only (never edit or delete it), registers it in `audio/_el_cache.json`, finds the pauses, writes `audio/<name>/<line_id>.wav`, then speech-recognises every clip.
- It fails (exit 1) with a fix when: the clip count is wrong, a split point falls inside a line (words leak into the next clip), a clip is too short or too slow, or a clip does not say its line.

## 5. Correct, never regenerate for a split problem
- Open `audio/<name>/splits.json`: `pauses` lists every pause found; `cuts` are the split points used.
- Fix the wrong cut (the error names it), then either pass `--cuts a,b,c` or set `"mode": "manual"` and edit `cuts`; trim a single clip with `"nudge": {"line_id": [start_s, end_s]}` (seconds, negative = earlier).
- Re-run `split` **without** a source file: it re-cuts the preserved original. No download, no credits.
- Regenerate only when the words themselves are wrong (mispronounced, missing, wrong emotion), and then only that line, as a new prompt.

## 6. Hand over
- Spec: `"audio_dir": "audio/<name>"`, and `"gap"` (0.1–0.16 for Shorts, 0.3–0.6 for long-form).
- `python3 pipeline/voice.py SPEC OUT` then check `timeline.json` line timings, then the normal build. QA (`video-qa-inspector`) checks gaps and word order again on the final video.
- Commit `audio/<name>/` including `_source/`, `splits.json` and `split_report.json`.

## Quality bar
- [ ] `el_split.py` ends with `SPLIT PASS`; every clip's `match` ≥ 70% (lower only for words Vosk can't know, explain which).
- [ ] No credits spent on a prompt that `lookup` already had.
- [ ] Originals in `_source/` untouched (read-only, recorded in `index.json`).
- [ ] Delivery matches the beat: the reveal line sounds like a reveal, the punchline lands.

## Example (Money Game, one speaker)
Prompt: `[playful, quick] Which phone costs more?` / `[long pause]` / `A thousand dollars today, or forty-five a month for two years?` / … / `[grinning] Did you pick right? Comment A or B.` ⇒ 6 clips, 372 credits, split automatically at the 5 longest pauses.
