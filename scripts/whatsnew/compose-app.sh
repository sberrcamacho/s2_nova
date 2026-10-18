#!/usr/bin/env bash
# compose-app.sh <source.png> <y0> <theme light|dark> <out.webp>
# A 1080x720 card: the app capture (1000 px of it from y0) framed as a
# phone screen with rounded top corners, bleeding off the bottom of a
# soft brand-tinted backdrop. Saved as 720x480 webp. Needs ImageMagick 7.
#
#   scripts/whatsnew/compose-app.sh s2-nova-screenshoots/app-light/60-asistente.png 110 light \
#     android/app/src/main/res/drawable-nodpi/whatsnew_assistant_light.webp
set -euo pipefail
src=$1; y0=$2; theme=$3; out=$4
tmp=$(mktemp -d)
if [ "$theme" = light ]; then
  bg1='#F6F3FC'; bg2='#E7E0F6'; edge='#D8D0EA'
else
  bg1='#1D1833'; bg2='#0F0D1B'; edge='#3A3552'
fi
W=780; X=150; Y=56
magick -size 1080x720 gradient:"$bg1"-"$bg2" \
  \( -size 1080x720 radial-gradient:'rgba(154,57,249,0.16)'-none -geometry +0-260 \) -composite "$tmp/bg.png"
magick "$src" -crop 1080x1000+0+"$y0" +repage -resize ${W}x "$tmp/shot.png"
H=$(magick identify -format %h "$tmp/shot.png")
# rounded top corners (radius 34) via mask
magick -size ${W}x${H} xc:none -fill white -draw "roundrectangle 0,0 $((W-1)),$((H+60)) 34,34" "$tmp/mask.png"
magick "$tmp/shot.png" "$tmp/mask.png" -alpha off -compose CopyOpacity -composite "$tmp/round.png"
# 2 px edge around it
magick -size $((W+4))x$((H+4)) xc:none -fill "$edge" -draw "roundrectangle 0,0 $((W+3)),$((H+64)) 36,36" "$tmp/edge.png"
magick "$tmp/edge.png" "$tmp/round.png" -geometry +2+2 -composite "$tmp/framed.png"
# soft shadow
magick "$tmp/framed.png" \( +clone -background 'rgba(30,10,60,0.35)' -shadow 40x18+0+12 \) +swap -background none -layers merge +repage "$tmp/shadowed.png"
magick "$tmp/bg.png" "$tmp/shadowed.png" -geometry +$((X-2-18))+$((Y-2-18+12)) -composite -crop 1080x720+0+0 +repage -resize 720x480 -quality 84 "$out"
rm -rf "$tmp"
