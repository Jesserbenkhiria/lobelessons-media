#!/usr/bin/env bash
# Build everything for one day.  usage: bash pipeline/build.sh days/dayNN.json [stills]
#   stills mode: only voice + preview stills (fast check). Full mode: Short mp4 + carousel slides.
set -e
P=$(cd "$(dirname "$0")" && pwd); SPEC=$(realpath "$1"); NAME=$(basename "$SPEC" .json)
OUT=/home/claude/lobe_out/$NAME; mkdir -p $OUT
export NODE_PATH=/opt/npm-tools/node_modules
bash $P/setup.sh
python3 $P/voice.py "$SPEC" $OUT
if [ "$2" = "stills" ]; then
  DUR=$(python3 -c "import json;print(json.load(open('$OUT/timeline.json'))['duration'])")
  TS=$(python3 -c "import json;tl=json.load(open('$OUT/timeline.json'));print(' '.join(str(round(l['end']-0.3,1)) for l in tl['lines']))")
  rm -rf $OUT/stills; node $P/render.js short "$SPEC" $OUT $TS
  node $P/render.js carousel "$SPEC" $OUT/carousel
  python3 - "$OUT" <<'PY'
import sys,glob
from PIL import Image
o=sys.argv[1]
for name,pat,w,h in [("short_contact.png",o+"/stills/*.jpg",270,480),("carousel_contact.png",o+"/carousel/*.png",270,338)]:
    fs=sorted(glob.glob(pat)); cols=5; rows=(len(fs)+cols-1)//cols
    c=Image.new('RGB',(cols*(w+8),rows*(h+8)),'white')
    for i,f in enumerate(fs): c.paste(Image.open(f).convert('RGB').resize((w,h)),((i%cols)*(w+8),(i//cols)*(h+8)))
    c.save(o+"/"+name)
PY
  echo "stills ready: $OUT/short_contact.png $OUT/carousel_contact.png"; exit 0
fi
rm -rf $OUT/frames; node $P/render.js short "$SPEC" $OUT
python3 $P/mix.py $OUT
ffmpeg -loglevel error -y -framerate 30 -i $OUT/frames/f_%05d.jpg -i $OUT/mix.wav -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest -movflags +faststart $OUT/short.mp4
node $P/render.js carousel "$SPEC" $OUT/carousel
for f in $OUT/carousel/*.png; do python3 -c "from PIL import Image;Image.open('$f').convert('RGB').save('${f%.png}.jpg',quality=90)"; done
ffmpeg -loglevel error -y -ss 1.0 -i $OUT/short.mp4 -frames:v 1 $OUT/cover.jpg
echo "BUILD OK -> $OUT"; ls -la $OUT/short.mp4 $OUT/carousel/*.jpg
