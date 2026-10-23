# CLAUDE CODE — LOBE LESSONS EPISODE 01 BUILD REQUEST

We're testing a NEW long-form production format: **script-first documentary comedy**, not the expensive fully animated Two Futures pipeline. The narration and timing carry the video; use licensed third-party images/stock video, simple text motion graphics, and occasional existing Lobe mascot animation.

READ THE ATTACHED `episode01_script.md` fully before making changes. Treat its narration as the approved draft. Do not replace it with a generic financial explainer. Preserve its jokes, pacing and narrative arc; propose substantive edits rather than silently rewriting.

## Scope and constraints
1. Keep the existing Shorts pipeline and its protected files untouched. Do not modify `render.js`, `voice.py`, `build.sh`, or `publish.sh`.
2. Build a separate simple `pipeline/essay/` editor using the tools already installed (ffmpeg, Playwright if helpful). Reuse existing Lobe rig assets when possible. Avoid implementing a new complex animation system.
3. Output 1920×1080, 30 fps, H.264/AAC. Target roughly 5–6 minutes based on actual narration, not padded duration. Make a low-resolution preview before final export.
4. Use ElevenLabs Mark voice as the narrator and Lobe. Read existing model/voice configuration; don't assume a voice ID or emotion-tag syntax. Warm, slightly mischievous, conversational delivery; avoid hyperactive YouTube-announcer cadence. Cache audio per paragraph/line, keep originals and timing manifest. Make the script and timing reviewable before paid generation. Only generate paid audio if existing project authorization covers it; otherwise leave a ready-to-run voice manifest, and do not claim audio has been generated.
5. Use licensed online assets, not arbitrary images found in Google/YouTube. Prefer Pexels/Pixabay or assets with clear commercial-use permissions. Create an `asset_manifest.csv` with scene, URL, author, license/terms URL, download date, attribution requirement and filename. Do not invent URLs; if access fails, use a genuinely licensed alternative or a simple built-in graphic. No watermark removal, no celebrity/brand logos, no downloading copyrighted movie clips.
6. 60–75% sourced photo/video, 15–25% easy motion graphics and charts, and 10–20% Lobe cutaways, as creative guidelines rather than hard quotas. Show Lobe during transitions, jokes and the three-question summary, not constantly.
7. Visual language: high-contrast editorial graphics, warm beige/cream + charcoal/navy, gold/pink Lobe accent; tasteful pans/crops, documentary B-roll, purposeful cuts. No constant karaoke subtitles or generic stock montage. Prioritize responsive editing to each line.
8. Keep music quiet beneath dialogue, use short comedic effects sparingly, mix to the existing audio QA standards. Avoid licensed trending music unless permission documented.
9. Keep every factual assertion supported by the script's source notes. Don't invent dopamine percentages, "studies show 90%", expert quotations, or fake screenshots. Verify any new scientific claim before adding it.

## Workflow (execute in small verifiable steps)
A. Inspect current repo and confirm the essay pipeline will be isolated from Shorts.
B. Make narration/audio manifest from episode01_script.md, with voice delivery notes and expected pauses. Check script word count and expected pace. Flag wording you believe is inaccurate or likely to mispronounce.
C. Make a complete beat-by-beat editor manifest mapping every narration segment to an exact visual type, relevant stock search terms and planned edit. Identify and download suitable licensed assets, recording metadata.
D. Build a **30–45 second proof-of-style** using the episode opening, cached or authorized ElevenLabs audio, proper music mixing and at least one Lobe cutaway. Provide preview for review before rendering the entire episode.
E. After the proof-of-style is approved, assemble the rest of the episode with asset caching and per-segment reuse. Avoid rerendering unchanged segments. Run video_qa.py (long profile) and finance/source verification.
F. Deliver the preview/final MP4, complete narration, asset licenses CSV, editing manifest, thumbnail draft, metadata draft, QA report, and a summary of any placeholders or unresolved permissions.

## Acceptance criteria
- Opening starts with a visually funny relatable item within the first second, no brand intro.
- A genuinely visual gag at least once in each major section.
- Lobe enters at motivated moments; visuals illustrate rather than duplicate the narration.
- Audio is actually audible in exported MP4 and speech remains intelligible with music.
- Every downloaded image/video used has confirmed permission and traceable source.
- Title and thumbnail accurately reflect the video. No unsupported claims.
- Existing Shorts regressions still pass; don't change them.

**First action now:** Inspect the repo, build the asset/audio/edit manifest and create the 30–45-second opening proof-of-style. Do NOT silently run a full multi-minute render before preview approval.
