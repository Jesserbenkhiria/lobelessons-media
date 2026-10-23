#!/usr/bin/env python3
"""Licensed stock assets for essay episodes, with a traceable license manifest.

Every file used in a video must come through this tool so `asset_manifest.csv` records where it came from.

usage
  # Pexels photo (page URL from WebSearch/WebFetch or the API; author as credited on the page)
  python3 pipeline/essay/assets.py photo EPDIR --id 4219101 --page https://www.pexels.com/photo/...-4219101/ \
          --author "Karola G" --scene s1 --line s1_01 --note "drawer, opening shot"
  # Pexels video (direct file URL as listed on the video page or by the API)
  python3 pipeline/essay/assets.py video EPDIR --id 6550137 --page URL --file-url https://videos.pexels.com/... --author NAME ...
  # Search through the official API (needs PEXELS_API_KEY in the environment)
  python3 pipeline/essay/assets.py search "messy drawer" [--videos] [--orientation landscape]
  python3 pipeline/essay/assets.py check EPDIR     # every file in assets/ is in the manifest, hashes match

Only sources with a clear commercial-use license are accepted (Pexels today). Nothing from Google Images,
YouTube or other unlicensed places. No watermark removal; no celebrity or brand-logo shots.
"""
import argparse, csv, datetime, hashlib, json, os, subprocess, sys, urllib.parse

LICENSES = {
    "pexels": {"license": "Pexels License (free for commercial use, no attribution required; credit appreciated)",
               "url": "https://www.pexels.com/license/", "attribution_required": "no (credit given in description)",
               "hosts": ("images.pexels.com", "videos.pexels.com")},
}
FIELDS = ["filename", "scene", "line", "source", "asset_id", "kind", "page_url", "file_url", "author", "license",
          "license_url", "attribution_required", "download_date", "width", "height", "sha1", "notes"]


def sha1(p):
    return hashlib.sha1(open(p, "rb").read()).hexdigest()


def rows(ep):
    p = os.path.join(ep, "asset_manifest.csv")
    return list(csv.DictReader(open(p))) if os.path.exists(p) else []


def save(ep, rs):
    with open(os.path.join(ep, "asset_manifest.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, FIELDS); w.writeheader(); [w.writerow(r) for r in rs]


def probe(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", p],
                       capture_output=True, text=True)
    s = json.loads(r.stdout or "{}").get("streams", [{}])
    return (s[0].get("width"), s[0].get("height")) if s else (None, None)


def fetch(url, dst):
    host = urllib.parse.urlparse(url).hostname
    if host not in LICENSES["pexels"]["hosts"]:
        sys.exit(f"REFUSED: {host} is not a licensed source host ({', '.join(LICENSES['pexels']['hosts'])})")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    r = subprocess.run(["curl", "-sSfL", "-m", "300", "-o", dst, url], capture_output=True, text=True)
    if r.returncode or not os.path.exists(dst) or os.path.getsize(dst) < 1000:
        sys.exit(f"DOWNLOAD FAILED for {url}: {r.stderr.strip()[:200]}")


def add(a, kind, url, ext):
    if not a.page.startswith("https://www.pexels.com/"):
        sys.exit("REFUSED: page URL must be the asset's pexels.com page (proof of source and license)")
    fn = f"assets/pexels_{a.id}{ext}"; dst = os.path.join(a.ep, fn)
    rs = rows(a.ep)
    if not os.path.exists(dst): fetch(url, dst)
    w, h = probe(dst); L = LICENSES["pexels"]
    rec = {"filename": fn, "scene": a.scene, "line": a.line, "source": "pexels", "asset_id": a.id, "kind": kind,
           "page_url": a.page, "file_url": url, "author": a.author, "license": L["license"], "license_url": L["url"],
           "attribution_required": L["attribution_required"], "download_date": datetime.date.today().isoformat(),
           "width": w, "height": h, "sha1": sha1(dst), "notes": a.note or ""}
    rs = [r for r in rs if r["filename"] != fn] + [rec]; save(a.ep, rs)
    print(f"OK {fn} {w}x{h}  {a.author}  ({a.page})")


def cmd_search(a):
    key = os.environ.get("PEXELS_API_KEY")
    if not key: sys.exit("PEXELS_API_KEY is not set: add it to the environment (never paste it into files or chat)")
    ep = "videos/search" if a.videos else "v1/search"
    q = urllib.parse.urlencode({"query": a.query, "per_page": a.n, "orientation": a.orientation})
    r = subprocess.run(["curl", "-sSf", "-H", f"Authorization: {key}", f"https://api.pexels.com/{ep}?{q}"], capture_output=True, text=True)
    if r.returncode: sys.exit(f"API error: {r.stderr[:200]}")
    d = json.loads(r.stdout)
    for it in d.get("videos" if a.videos else "photos", []):
        if a.videos:
            f = max((x for x in it["video_files"] if (x.get("height") or 0) <= 1080), key=lambda x: x.get("height") or 0, default=None)
            print(json.dumps({"id": it["id"], "page": it["url"], "author": it["user"]["name"], "duration": it["duration"],
                              "file": f and f["link"], "size": f and f"{f['width']}x{f['height']}"}))
        else:
            print(json.dumps({"id": it["id"], "page": it["url"], "author": it["photographer"], "alt": it.get("alt"),
                              "file": it["src"]["original"], "size": f"{it['width']}x{it['height']}"}))


def cmd_check(a):
    rs = {r["filename"]: r for r in rows(a.ep)}; bad = []
    for root, _, files in os.walk(os.path.join(a.ep, "assets")):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), a.ep)
            if rel not in rs: bad.append(f"{rel}: not in asset_manifest.csv (unknown source: do not use)")
            elif sha1(os.path.join(a.ep, rel)) != rs[rel]["sha1"]: bad.append(f"{rel}: file changed since download")
    for fn, r in rs.items():
        if not os.path.exists(os.path.join(a.ep, fn)): bad.append(f"{fn}: in manifest but missing on disk")
        for k in ("page_url", "author", "license_url"):
            if not r.get(k): bad.append(f"{fn}: missing {k}")
    for b in bad: print("ERROR", b)
    print(f"ASSETS {'FAIL' if bad else 'OK'}: {len(rs)} licensed files"); sys.exit(1 if bad else 0)


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    for k in ("photo", "video"):
        p = sub.add_parser(k); p.add_argument("ep"); p.add_argument("--id", required=True); p.add_argument("--page", required=True)
        p.add_argument("--author", required=True); p.add_argument("--scene", default=""); p.add_argument("--line", default="")
        p.add_argument("--note"); p.add_argument("--width", type=int, default=2400)
        if k == "video": p.add_argument("--file-url", required=True)
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("--videos", action="store_true")
    s.add_argument("--orientation", default="landscape"); s.add_argument("-n", type=int, default=10)
    c = sub.add_parser("check"); c.add_argument("ep")
    a = ap.parse_args()
    if a.cmd == "photo":
        add(a, "photo", f"https://images.pexels.com/photos/{a.id}/pexels-photo-{a.id}.jpeg?auto=compress&cs=tinysrgb&w={a.width}", ".jpg")
    elif a.cmd == "video":
        add(a, "video", a.file_url, ".mp4")
    elif a.cmd == "search": cmd_search(a)
    elif a.cmd == "check": cmd_check(a)


if __name__ == "__main__":
    main()
