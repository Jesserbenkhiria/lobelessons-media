# Lobe Lessons: shared reference for all skills

Single source of truth. Skills link here instead of repeating it.

## Channel
- Faceless animated channel about money, psychology, life decisions and ideas from nonfiction books.
- Audience: English speakers in the US/UK, 18–35. YouTube is the main platform (income); Instagram, TikTok and Facebook get the same videos.
- Posting: Metricool (brand 7506135, Africa/Tunis). Slots: FB Reel 19:00, YouTube 20:00, IG Reel 21:00, TikTok 22:00.
- Every video idea is tested on evidence: YouTube Studio "Stayed to watch", average view duration and average % viewed, compared 48 h after posting.

## Formats
| Format | Length | Shape | Status |
|---|---|---|---|
| Broke Brain comedy (Short) | 15–25 s | Broke Brain makes a money mistake, Rich Brain (Lobe) shows the math, punchline, loop | live test (`days/test_raise.json`) |
| Money Games (Short) | 15–18 s | Two choices on cards, countdown, reveal, "comment A or B" | live test (`days/pilot_game.json`) |
| Two Futures (Short) | 18–22 s | Same start, two choices, side-by-side counters years later | live test (`days/pilot_futures.json`) |
| Two Futures (long-form) | 4–6 min, 1920×1080, 30 fps | Two characters' lives diverge from one decision, time jumps, reveal | in development (`stories/`) |

## Characters (`pipeline/lobe_rig.js`)
- **Lobe / Rich Brain**: pink cartoon brain, gold half-moon glasses, stick limbs. Calm, confident, kind.
- **Broke Brain**: duller mauve brain, messy hair, patch, sweat drops, worried brows. Lovable, impulsive, never stupid-mean.
- Poses available today: `explain`, `idea`, `think`, `shock`, `approve`, `calm`, `read`. Eyes: open / happy / shock. Brows: soft / up / think / shock / worried. Mouth follows voice loudness.
- Not available yet: sad, angry, smug, tired, proud, walking, sitting at a desk, holding props other than a book, environments.

## Voices (ElevenLabs, model `eleven_v4`)
- Lobe / Rich Brain / narrator: `v3p1kjzUvro6S76qmYmH` ("Mark": friendly, confident).
- Broke Brain: `1kvnzrSTos1KbmLKMLCC` ("Elmoe": silly, energetic).
- Cost seen so far: ~370 credits per 20 s of speech.

## Visual language
- Clean comedy-show look: backgrounds neutral `#F6EFE4`, bad `#FBD3C7`, good `#D9F2E3`, gold `#FBEBC5`. Text colours: green `#2F9E6B`, red `#D9534F`, gold `#C9A24B`.
- Fonts: Inter / Inter Display, heavy weights for headlines and numbers.
- Safe areas and caption bands: `qa/profiles.json` (the QA tools enforce them).

## Non-negotiables
1. Every number on screen comes from a formula (`pipeline/finance.py`), never typed by hand.
2. Investment results are labelled hypothetical, with the rate, compounding and "not guaranteed" visible.
3. No personal financial advice; no promises of returns; no real people mocked.
4. Nothing is posted without Jesser's explicit approval, and nothing that fails `qa/video_qa.py`.
5. The Shorts renderer (`pipeline/render.js`, `voice.py`, `lobe_rig.js`, `mix.py`, `sfx.py`) changes only additively and only if `python3 qa/regress.py` passes.

## Tools
| Need | Command |
|---|---|
| Build a Short | `bash pipeline/build.sh days/X.json` (see RUNBOOK.md) |
| Split ElevenLabs audio | `python3 pipeline/el_split.py ...` (see the elevenlabs-voice-director skill) |
| Check the numbers | `python3 pipeline/finance.py SPEC.json` |
| QA an exported video | `python3 qa/video_qa.py VIDEO --profile short|long --build OUT --spec SPEC` |
| Shorts regression | `python3 qa/regress.py` |
| All tests | `bash tests/run_tests.sh` |

## Short formats (approved Oct 24, 2026)
1. **Broke Brain sketch** (`days/test_subs.json`, `days/test_minimum.json`): Lobe opens with a number or question hook, Broke Brain reacts (2–3 lines), Lobe lands the payoff, question CTA. 18–23 s.
2. **Lobe solo** (`days/test_rule72.json`): one voice, one rule or number, big counter on every line, hook visible in frame 1, comparison (good vs bad) then question CTA. ~22 s.
Rules for both: the character in front is the one speaking; every number lands on its spoken word; assumptions in fine print; after the build, re-run loudnorm at TP=-2 if QA flags true peak.
