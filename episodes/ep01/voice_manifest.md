# Episode 01: voice manifest

**Voice:** Mark (`v3p1kjzUvro6S76qmYmH`), model `eleven_v4`, one generation per section, `generations_count: 1`.
**Delivery:** warm, curious, a little mischievous; conversational, never an announcer. One short bracket tag per paragraph, the same syntax as every approved Lobe Lessons video so far.
**Script:** `script.json` holds 46 paragraphs (`s<section>_<nn>`), 819 words. At 2.2–2.6 words/s that comes to **5.2–6.2 min**. Audio is cached per paragraph.

| Section | Paragraphs | Prompt | Characters (≈ credits) | Status |
|---|---|---|---|---|
| 1 Drawer of shame | 5 | `audio/_prompts/s1_mark.txt` | 721 (billed) | **generated**, 39.8 s, split and validated (`audio/split_report.json`) |
| 2 Discount trap | 7 | `audio/_prompts/s2_mark.txt` | 860 | ready, not generated |
| 3 Shopping mood | 8 | `audio/_prompts/s3_mark.txt` | 1,255 | ready, not generated |
| 4 Future self | 9 | `audio/_prompts/s4_mark.txt` | 976 | ready, not generated |
| 5 Little extras | 6 | `audio/_prompts/s5_mark.txt` | 893 | ready, not generated |
| 6 Three-question test | 7 | `audio/_prompts/s6_mark.txt` | 948 | ready, not generated |
| 7 Outro | 4 | `audio/_prompts/s7_mark.txt` | 350 | ready, not generated |
| **Remaining** | 41 | | **≈ 5,300** | waiting for approval |

Run (per section, after approval), following the elevenlabs-voice-director skill:
```
python3 pipeline/el_split.py lookup --voice v3p1kjzUvro6S76qmYmH --model eleven_v4 --prompt-file episodes/ep01/audio/_prompts/s2_mark.txt
# generate (cache miss only), download, then:
python3 pipeline/el_split.py split DOWNLOAD.mp3 --spec episodes/ep01/script.json --out episodes/ep01/audio \
   --lines s2_01,s2_02,s2_03,s2_04,s2_05,s2_06,s2_07 --voice v3p1kjzUvro6S76qmYmH --model eleven_v4 \
   --prompt-file episodes/ep01/audio/_prompts/s2_mark.txt --generation-id <id>
```

## Expected pauses
- A `[long pause]` between paragraphs is used as the split point and is not kept. The edit adds 0.3 s between paragraphs and 0.35 s between shots.
- Pauses inside a paragraph are the voice's own: "on Tuesday... and" (s1_04), "Just... better illuminated." (s3_08), "the purchase... or reacting" (s5_06).
- "Much." (s7_04) is its own clip, so the edit can hold a beat before it.

## Wording flags (please decide; nothing has been changed)
1. **s7_03, "I promise Lobe won't judge."** Mark *is* Lobe in this episode, so Lobe would be talking about himself in the third person. Suggest "I promise I won't judge." Alternatively, keep it and give "Much." to Broke Brain (Elmoe) as a one-word cameo.
2. **s6_06, "you just saved yourself sixty dollars — by not spending it."** This is a deliberate callback and is fine. Just note that it uses "saved" in the everyday sense, right after the episode argues that a discount isn't a saving. It works because it says "by not spending it".
3. **s2_05, "The discount is real relative to the listed price."** This is accurate. Optionally add "if the listed price is honest" to cover inflated reference prices, but it isn't required.

## Pronunciation
- "2017": section 1 was sent with the digits "2017". The speech check matched the clip, but listen to confirm it was read as "twenty seventeen". For later sections, the `say` field spells numbers out where that matters.
- Fine as written: "spiralizer", "NASA", "illuminated", "color-coded" (US spelling for a US/UK audience).
- Words in capitals ("NEED", "LIFE", "SAVE FORTY!") get extra stress from eleven_v4. That's intended; check it on review.
- In section 1, speech recognition heard "Maybe" as "he be" and "You own" as "You on" (clip match 89–92%). These are most likely recogniser errors, but I can't listen to audio, so give the five clips a quick listen.
