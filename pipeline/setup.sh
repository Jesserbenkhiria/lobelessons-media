#!/usr/bin/env bash
# One-time setup for a fresh container. Idempotent. Takes ~2-4 minutes.
set -e
W=/home/claude/lobe_tools
mkdir -p $W && cd $W
# speech recognition (word timings): vosk + small English model from npm
if ! python3 -c "import vosk" 2>/dev/null; then
  pip install --break-system-packages -q --no-deps vosk cffi tqdm 2>/dev/null || true
  pip install --break-system-packages -q cffi 2>/dev/null || true
  if ! python3 -c "import srt" 2>/dev/null; then
    pip download --no-deps --no-binary :all: srt -d . -q && tar xzf srt-*.tar.gz && cp srt-*/srt.py "$(python3 -c 'import site;print(site.getsitepackages()[0])')/"
  fi
fi
[ -d $W/vosk-model ] || { npm pack transcribe2texts@1.0.6 -q >/dev/null 2>&1; tar xzf transcribe2texts-1.0.6.tgz package/vosk-model-small-en-us-0.15; mv package/vosk-model-small-en-us-0.15 $W/vosk-model; }
# neural text-to-speech: Kokoro (bundled in an npm package) + sherpa-onnx runtime
# pinned: sherpa-onnx 2.x needs a lexicon file for this Kokoro v0.19 model and produces no audio (Oct 27 2026)
python3 -c "import sherpa_onnx,sys;sys.exit(not sherpa_onnx.__version__.startswith('1.13.8'))" 2>/dev/null || pip install --break-system-packages -q "sherpa-onnx==1.13.8"
[ -d $W/kokoro ] || { npm pack n8n-nodes-ttsbro@0.1.6 -q >/dev/null 2>&1; tar xzf n8n-nodes-ttsbro-0.1.6.tgz package/kokoro-int8-en-v0_19; mv package/kokoro-int8-en-v0_19 $W/kokoro; }
python3 -c "import numpy, PIL" || pip install --break-system-packages -q numpy pillow
which ffmpeg >/dev/null
echo "setup ok"
