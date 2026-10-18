#!/usr/bin/env bash
# Copy a built day into posts/<date>/, push to GitHub, print the public URLs for Metricool.
# usage: bash pipeline/publish.sh days/dayNN.json
set -e
R=$(cd "$(dirname "$0")/.." && pwd); SPEC=$(realpath "$1"); NAME=$(basename "$SPEC" .json)
DATE=$(python3 -c "import json;print(json.load(open('$SPEC'))['date'])")
OUT=/home/claude/lobe_out/$NAME; DST=$R/posts/${DATE}_$NAME
mkdir -p $DST
cp $OUT/short.mp4 $DST/short.mp4; cp $OUT/cover.jpg $DST/cover.jpg
cp $OUT/carousel/slide_*.jpg $DST/
cd $R
git add -A posts days
git -c user.name="Lobe Lessons" -c user.email="jesserbenkhiria911@gmail.com" commit -qm "Day ${NAME#day}: media for $DATE" || true
git push -q origin HEAD:main
BASE="https://raw.githubusercontent.com/Jesserbenkhiria/lobelessons-media/main/posts/${DATE}_$NAME"
echo "SHORT=$BASE/short.mp4"
echo "COVER=$BASE/cover.jpg"
for f in $(ls $DST/slide_*.jpg | sort); do echo "SLIDE=$BASE/$(basename $f)"; done
# confirm the files are publicly reachable (raw CDN can lag ~1 min after push)
for i in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/cover.jpg" || echo 000)
  [ "$code" = "200" ] && { echo "PUBLIC_OK"; exit 0; }
  sleep 20
done
echo "PUBLIC_CHECK_UNAVAILABLE (container may not reach raw.githubusercontent.com; verify with WebFetch)"
