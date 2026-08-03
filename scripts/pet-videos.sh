#!/bin/bash
# Chroma-key видео тамагочи: good (зелёный), sad (синий), angry (серый)
# → public/pet/*.webm (VP9 + альфа) + *.mp4 (H.264 fallback), 320x320, 15fps
set -e
cd "/c/Users/Geroin/Desktop/SYNC"
mkdir -p public/pet

run() {
  local name=$1 color=$2 sim=$3
  echo "=== $name (color=$color sim=$sim) ==="
  ffmpeg -y -i "video/$name.mp4" \
    -vf "chromakey=0x$color:$sim:0.08,scale=320:320:flags=neighbor,fps=15,format=yuva420p" \
    -c:v libvpx-vp9 -crf 33 -b:v 0 -an "public/pet/$name.webm" 2>&1 | tail -1
  ffmpeg -y -i "video/$name.mp4" \
    -vf "scale=320:320:flags=neighbor,fps=15" \
    -c:v libx264 -crf 30 -preset veryfast -an -pix_fmt yuv420p "public/pet/$name.mp4" 2>&1 | tail -1
}

run good 479679 0.28
run sad 2D4D73 0.26
run angry E1E3E4 0.34

echo "=== sizes ==="
ls -la public/pet/
