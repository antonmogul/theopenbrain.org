#!/usr/bin/env bash
# Encode a designer's short animation as a figure loop for the web (OPENBRAIN-201).
#
#   scripts/figures/encode-figure-loop.sh <source.mp4> <out-dir> <name> [width]
#
# Writes <name>.mp4 (H.264 High, yuv420p, faststart), <name>.webm (VP9) and
# <name>.webp (the first frame, the poster and the still under reduced motion)
# into <out-dir>, scaled to <width> px wide (default 960) keeping the aspect
# ratio. No audio track: the figure plays muted, looping, inline.
#
# Plato and Aristotle (Maura, 18 Nov 2026: OB_hist_platovs.-aristotle.mp4,
# 1440 × 1920, 50 frames at 30 fps, ~23 Mb/s):
#   scripts/figures/encode-figure-loop.sh ~/Downloads/OB_hist_platovs.-aristotle.mp4 \
#     public/publicAssets/video/foundations plato-aristotle-loop
set -euo pipefail
src=${1:?source video}
out=${2:?output directory}
name=${3:?output name}
width=${4:-960}
mkdir -p "$out"
scale="scale=${width}:-2:flags=lanczos"
ffmpeg -v error -y -i "$src" -an -vf "$scale" -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -crf 24 -preset veryslow -movflags +faststart "$out/$name.mp4"
ffmpeg -v error -y -i "$src" -an -vf "$scale" -c:v libvpx-vp9 -crf 36 -b:v 0 \
  -row-mt 1 -deadline good -cpu-used 1 "$out/$name.webm"
# Homebrew's ffmpeg has no WebP encoder: take the frame as PNG, then cwebp.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
ffmpeg -v error -y -i "$src" -vf "select=eq(n\,0),$scale" -frames:v 1 "$tmp/poster.png"
cwebp -quiet -q 82 "$tmp/poster.png" -o "$out/$name.webp"
ls -l "$out/$name".{mp4,webm,webp}
