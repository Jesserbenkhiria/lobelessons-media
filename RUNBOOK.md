# Lobe Lessons: daily content runbook

This repo is the production pipeline for **Lobe Lessons** (@lobelessons): one book lesson a day,
starring **Lobe**, a soft pink brain mascot with gold half-moon reading glasses and a gold bookmark ribbon.
Every day = **1 Short** (YouTube Shorts + Instagram Reel + TikTok video) + **1 carousel** (Instagram + TikTok photo post).

## Fixed IDs
| What | Value |
|---|---|
| Notion calendar page | https://app.notion.com/p/3fd3d61645af817a9555f1ed0adb86d1 |
| Notion data source ("30-Day Plan") | `collection://0e5ea623-fa00-4b19-9d1d-ff7ff69020f3` |
| Metricool brand (blogId) | `7506135` · timezone `Africa/Tunis` · networks: instagram, tiktok, youtube |
| GitHub repo (public media host) | `Jesserbenkhiria/lobelessons-media`, branch `main` |
| Public file base | `https://raw.githubusercontent.com/Jesserbenkhiria/lobelessons-media/main/posts/...` |

Notion columns: `Lesson` (title), `Day`, `Date`, `Book`, `Hook`, `Status` (Planned/Created/Scheduled/Published/Problem),
checkboxes `YouTube Short`, `IG Reel`, `IG Carousel`, `TikTok Video`, `TikTok Carousel`, `Done` (formula), `Media` (URL), `Notes`.

## Daily procedure (morning run, about 07:15 Tunis time)

### 0. Workspace
1. Attach the repo with push access (`add_repo` owner `Jesserbenkhiria`, repo `lobelessons-media`, access `push`), clone it to `/home/claude/lobelessons-media`.
2. `bash pipeline/setup.sh` (downloads the Kokoro voice + Vosk model from npm, about 2 min).

### 1. Tick what was published
- Query Notion rows with `Status = Scheduled` and Date ≤ today.
- For each, call Metricool `getScheduledPosts` (brandId 7506135, that date ±1 day). A post that is no longer in the scheduled list and whose time has passed has been **published**: tick that platform's checkbox. If every platform for the row is ticked, set `Status = Published`.
- If a post failed or is still pending hours after its time, set `Status = Problem` and say what happened in `Notes`.

### Who does what (usage-optimized)
- **Weekly script writer** (strong model, Tuesdays ~06:13): writes `days/dayNN.json` for every Notion row dated tomorrow … 8 days ahead that has no spec yet: script, scenes, carousel, captions, following ALL rules in step 2.1–2.3 below (including the stills preview + looking at the contact sheets and fixing problems). Commits the specs and sets each row's Status = `Created`, Notes = "script ready".
- **Daily run** (light model, 07:13): ticks published posts, then for tomorrow's row: if `days/dayNN.json` already exists (Status `Created`), do NOT rewrite it: go straight to the full build (2.4), check `cover.jpg`, publish, schedule, update Notion. Only if the spec is missing, write it yourself following 2.1–2.3.
- **Evening check** (light model, 23:13): ticks only.

### 2. Create TOMORROW's content (one day ahead, so a failure never leaves a day empty)
Find the Notion row where Date = tomorrow (also handle today's row first if it's still `Planned`). If its Status is `Planned` (write the spec) or `Created` (spec already written by the weekly writer, skip to 2.4):
1. **Write `days/dayNN.json`** (NN = Day number, two digits), copying the structure of `days/day02.json` exactly.
   - Lesson = the row's `Lesson`, opening line = the row's `Hook`.
   - **Short = edutainment, not a lesson.** People in the feed skip anything that feels like homework. Rules:
     - **Hook in the first 1–2 s = a punch, not a book question.** A bold, specific, slightly provocative claim about the viewer's life ("You're paying everyone except yourself."). Never open with the book title or "Lesson N"; the book is mentioned later as proof.
     - `short.label` = topic only, e.g. "MONEY · MINDSET" (never "LESSON N").
     - **20–30 seconds total, 5–7 lines.** Something new appears on screen every 1–2 s (use `at` on key words).
     - Last line exactly `Follow Lobe for one book lesson every day.` (scene `{"line":"cta","cta":true}`). Make the line before it loop back to the hook when possible.
   - **Rotate formats by Day number** (Day % 3):
     - **1 = SKETCH "Broke Brain vs Rich Brain":** two characters argue about a real-life moment (payday, a sale, a raise). Alternate scenes: Broke Brain = Lobe on the left (`bl`, poses shock/think, pill "BROKE BRAIN" color red, line field `"voice": 5`), Rich Brain = Lobe on the right (`br`, poses idea/approve/explain, pill "RICH BRAIN" color green, default voice). Funny, short lines; the lesson lands in the last 2 lines.
     - **2 = POV:** hook "POV: …" a relatable moment ("POV: it's payday and your brain does this"), then what most people do vs what the book says.
     - **0 = FAST LESSON:** the classic format, but with a punchy claim hook and 20–30 s.
   - **Carousel density:** never a headline alone. Every slide = headline + at least one supporting element (a sub line, a card, a list, a flow, a quote or a stamp). Short slides are auto-centered and enlarged by the renderer, but they still need that second element.
   - **Carousel:** 6 slides max (fewer slides = more people reach the end). Slide 1 = the same punchy claim, big, plus "Swipe →"; each slide ends with a reason to swipe ("But here's the catch →"). Slides: cover (big claim) → problem → the idea → visual/example → what to do → "TRY THIS TODAY" question → final punchline with save + comment pills.
   - **Captions:** `youtube_title` (≤ 90 chars, ends with `#shorts`), `short`, `carousel` (hook line, 2–3 lines of value, a question for comments, "🔖 Save this", hashtags incl. `#lobelessons`), `youtube_tags`.
2. **Accuracy rules:** state only what the book actually says or widely documented facts. Mark any example numbers "Example". Never reproduce more than a short phrase from a book. Never draw a real book cover: use the `book` element (our neutral white card). No financial "advice" claims; frame things as lessons from the book.
3. **Preview:** `bash pipeline/build.sh days/dayNN.json stills`, then **look at** `/home/claude/lobe_out/dayNN/short_contact.png` and `carousel_contact.png`. Fix overflow, overlaps (Lobe must never cover text), awkward wraps, or empty slides. Repeat until clean.
4. **Full build:** `bash pipeline/build.sh days/dayNN.json` → `short.mp4`, `cover.jpg` (designed Reel cover: hook + Lobe; optional `short.cover` {html, pose, textSize} in the spec, defaults to the first scene's headline), `carousel/slide_*.jpg`. Check `cover.jpg` too: the hook must be fully readable inside the centre square.
5. **Publish media:** `bash pipeline/publish.sh days/dayNN.json` → prints public URLs. If the script can't confirm, check one URL with WebFetch before scheduling.
6. **Schedule in Metricool** with `createScheduledPost` (blogId 7506135, timezone Africa/Tunis, autoPublish true) on the row's date.
   **Target audience = US + UK** (English speakers, highest YouTube ad rates). Do NOT use `getBestTimeToPostByNetwork`: it reflects the current (mostly Tunisian) audience. Use these fixed Tunis-time slots (Tunis is UTC+1 all year; UK = Tunis or Tunis-1 in winter; US East = Tunis-5, Tunis-6 from early Nov):
   - Instagram **carousel** (type POST, media = slide URLs in order): **14:00** (UK lunch, US morning)
   - TikTok **photo carousel** (same slide URLs): **15:00**
   - YouTube **Short** (type short, madeForKids false, category EDUCATION, title = youtube_title, tags): **20:00** (UK evening, US afternoon; ramps up into US evening)
   - Instagram **Reel** (type REEL, media = short.mp4, **`videoThumbnailUrl` = the COVER url** from publish.sh): **21:00** (UK prime time)
   - TikTok **video** (short.mp4): **22:00**
   - **TikTok always needs `tiktokData.title`** (short hook, ≤ 60 chars), or the call fails.
   - Media URLs = the public URLs printed by publish.sh. Metricool copies them into its own storage when you schedule.
   If one network errors, still schedule the others and note the error.
7. **Update Notion:** `Status = Scheduled`, `Media` = the posts folder URL on GitHub, `Notes` = scheduled times plus any errors.
8. Commit `days/dayNN.json` (publish.sh already does this).

If the row is already `Scheduled` or `Published`, skip step 2. If there is no row for tomorrow, the 30-day plan is over: add 7 new days to the calendar (same format, new books/lessons that fit the channel), then continue.

### 3. Report
Finish with a short summary: what was published yesterday (ticked), what's scheduled today (times per platform), and any problems.

## Spec element reference (`pipeline/render.js`)
Text markup: `<r>red</r>`, `<g>green</g>`, `<y>gold</y>`, `<m>muted</m>`, `<b>bold</b>`, `<br>`.
Short elements take `"at"`: a word from that scene's line (`"paid"`), `"word#2"` for its 2nd occurrence, or `"+1.2"` seconds after the line starts.
- `headline` {html, size}: sizes 90–140
- `sub` {html, max, ml, center}
- `pill` {text, color: gold|green|red|muted|dark}
- `stamp` {text, color, size} (pops in with a stamp sound)
- `book` {title, author, side}
- `rule` {items:[{icon, title, sub, color, at}]}: icon cards
- `rows` {header:[left,right], rows:[{l, r, color, at}], counter:{label, color}}: a table with a running total
- `list` {rows:[{l, r, color, at}]}: separate row cards
- `flow` {rows:[{tag, text, color, at}]}: labelled cards
- `quote` {html, size}: inside html use `<hl at="word" c="green">text</hl>` to color a word when it's spoken
- `space` {h}, `html` {html}
Lobe: `{"pose": calm|explain|idea|think|shock|read|approve, "pos": br|bl|bc|tr|mr|center, "size": px}`.
In the **Short**, Lobe is an animated rig (`pipeline/lobe_rig.js`): his mouth talks with the voice, he blinks, looks toward the text, and changes hand gesture each time a new element appears (the pose picks the gesture set: explain = presenting/pointing at content/open arms, idea = finger up, think = hand on chin, shock = hands up, approve = thumbs up/wave, calm/read = seated). So give each scene a pose that fits what is said, and use `at` times so elements appear on key words (that is what triggers the gestures). Carousels and covers use the static poses. `"static_lobe": true` in a spec turns the rig off.
Vary pose and position between scenes and slides. Use `tr` (small, about 300px) when the content is tall.

## Voice
Kokoro voice id 6 (`am_michael`), speed 1.05. Spell tricky words phonetically in `"say"` while keeping `"text"` for captions.

## Evening check (about 23:15 Tunis time, after the 22:00 TikTok)
Only step 1 (tick what was published today). No content creation. One-line report.
