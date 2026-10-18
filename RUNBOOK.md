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

### 2. Create TOMORROW's content (one day ahead, so a failure never leaves a day empty)
Find the Notion row where Date = tomorrow (also handle today's row first if it's still `Planned`). If its Status is `Planned`:
1. **Write `days/dayNN.json`** (NN = Day number, two digits), copying the structure of `days/day02.json` exactly.
   - Lesson = the row's `Lesson`, opening line = the row's `Hook`.
   - **Short script:** 6–8 lines, 30–45 seconds total, hook question first, last line exactly `Follow Lobe for one book lesson every day.` (scene `{"line":"cta","cta":true}`).
   - **Carousel:** 7–8 slides: cover (big claim) → problem → the idea → visual/example → what to do → "TRY THIS TODAY" question → final punchline with save + comment pills.
   - **Captions:** `youtube_title` (≤ 90 chars, ends with `#shorts`), `short`, `carousel` (hook line, 2–3 lines of value, a question for comments, "🔖 Save this", hashtags incl. `#lobelessons`), `youtube_tags`.
2. **Accuracy rules:** state only what the book actually says or widely documented facts. Mark any example numbers "Example". Never reproduce more than a short phrase from a book. Never draw a real book cover: use the `book` element (our neutral white card). No financial "advice" claims; frame things as lessons from the book.
3. **Preview:** `bash pipeline/build.sh days/dayNN.json stills`, then **look at** `/home/claude/lobe_out/dayNN/short_contact.png` and `carousel_contact.png`. Fix overflow, overlaps (Lobe must never cover text), awkward wraps, or empty slides. Repeat until clean.
4. **Full build:** `bash pipeline/build.sh days/dayNN.json` → `short.mp4`, `cover.jpg` (designed Reel cover: hook + Lobe; optional `short.cover` {html, pose, textSize} in the spec, defaults to the first scene's headline), `carousel/slide_*.jpg`. Check `cover.jpg` too: the hook must be fully readable inside the centre square.
5. **Publish media:** `bash pipeline/publish.sh days/dayNN.json` → prints public URLs. If the script can't confirm, check one URL with WebFetch before scheduling.
6. **Schedule in Metricool** with `createScheduledPost` (blogId 7506135, timezone Africa/Tunis, autoPublish true) on the row's date. Use `getBestTimeToPostByNetwork` for that date. Default slots:
   - Instagram **carousel** (type POST, media = slide URLs in order): 10:00
   - TikTok **photo carousel** (same slide URLs): 12:00
   - YouTube **Short** (type short, madeForKids false, category EDUCATION, title = youtube_title, tags): 16:00
   - Instagram **Reel** (type REEL, media = short.mp4, **`videoThumbnailUrl` = the COVER url** from publish.sh): 18:00
   - TikTok **video** (short.mp4): 18:30
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
Vary pose and position between scenes and slides. Use `tr` (small, about 300px) when the content is tall.

## Voice
Kokoro voice id 6 (`am_michael`), speed 1.05. Spell tricky words phonetically in `"say"` while keeping `"text"` for captions.

## Evening check (about 21:45 Tunis time)
Only step 1 (tick what was published today). No content creation. One-line report.
