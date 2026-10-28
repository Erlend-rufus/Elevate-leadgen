#!/bin/bash
# enc.sh <src.mp4> <outdir> <name> : scrub-friendly 1600px h264 + first-frame poster
set -e
src="$1"; out="$2"; n="$3"
ffmpeg -loglevel error -y -i "$src" -an -vf "scale=1600:-2,fps=24" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 24 -preset veryfast -g 3 -keyint_min 3 -sc_threshold 0 -movflags +faststart "$out/$n.mp4"
ffmpeg -loglevel error -y -i "$out/$n.mp4" -frames:v 1 -vf "scale=1600:-2" -q:v 3 "$out/$n.jpg"
