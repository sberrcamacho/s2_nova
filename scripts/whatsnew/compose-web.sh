#!/usr/bin/env bash
# compose-web.sh <source.png> <x> <y> <w> <theme> <out.webp>
# Like compose-app.sh, for desktop captures: a w-wide region from (x,y) framed
# as a window card, 900 px wide on the 1080x720 backdrop, bleeding off the
# bottom. Saved as 720x480 webp.
set -euo pipefail
src=$1; x=$2; y=$3; w=$4; theme=$5; out=$6
tmp=$(mktemp -d)
if [ "$theme" = light ]; then bg1='#F6F3FC'; bg2='#E7E0F6'; edge='#D8D0EA'; else bg1='#1D1833'; bg2='#0F0D1B'; edge='#3A3552'; fi
W=900; X=90; Y=56
h=$(( (700 * w + W - 1) / W ))
magick -size 1080x720 gradient:"$bg1"-"$bg2" \( -size 1080x720 radial-gradient:'rgba(154,57,249,0.16)'-none -geometry +0-260 \) -composite "$tmp/bg.png"
magick "$src" -crop ${w}x${h}+${x}+${y} +repage -resize ${W}x "$tmp/shot.png"
H=$(magick identify -format %h "$tmp/shot.png")
magick -size ${W}x${H} xc:none -fill white -draw "roundrectangle 0,0 $((W-1)),$((H+60)) 22,22" "$tmp/mask.png"
magick "$tmp/shot.png" "$tmp/mask.png" -alpha off -compose CopyOpacity -composite "$tmp/round.png"
magick -size $((W+4))x$((H+4)) xc:none -fill "$edge" -draw "roundrectangle 0,0 $((W+3)),$((H+64)) 24,24" "$tmp/edge.png"
magick "$tmp/edge.png" "$tmp/round.png" -geometry +2+2 -composite "$tmp/framed.png"
magick "$tmp/framed.png" \( +clone -background 'rgba(30,10,60,0.35)' -shadow 40x18+0+12 \) +swap -background none -layers merge +repage "$tmp/shadowed.png"
magick "$tmp/bg.png" "$tmp/shadowed.png" -geometry +$((X-2-18))+$((Y-2-18+12)) -composite -crop 1080x720+0+0 +repage -resize 720x480 -quality 84 "$out"
rm -rf "$tmp"
