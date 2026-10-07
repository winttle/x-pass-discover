#!/usr/bin/env bash
#
# Derives the web-ready imagery in `public/img/` from the originals in
# `assets-src/`.
#
#   ./scripts/build-image-assets.sh      (needs ImageMagick)
#
# Why a script rather than hand-edited files: every crop below is a decision
# (which face, which part of the room), and two of them exist specifically to
# keep a wrong wordmark out of frame. Recording them here makes the derivation
# reviewable and repeatable when a source image is re-generated.
#
# PROVENANCE: the originals are concept-stage fictional assets generated for
# X-PASS. Some were produced while the fictional company was still called
# "MOGU FOODS" and carry that wordmark inside the photograph. This app's company
# is BITE, so those frames are either cropped to exclude it or not used at all:
#
#   drive/company-building-photo.webp  NOT USED — "MOGU FOODS" spans the facade
#   drive/bite-office-photo.webp       NOT USED — "MOGU" sign on the back wall
#   drive/sales-photo.webp             NOT USED — "MOGU FOODS" on the held page
#   drive/bite-protein-drink-photo.webp NOT USED — bottles read "MOGU PROTEIN"
#   drive/marketing-photo.webp         USED, cropped to drop the "MOGU" panel
#
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets-src
OUT=public/img
mkdir -p "$OUT"/{cover,account,product,avatar}

# derive <source> <output> <crop|-> <width|WxH>
derive() {
  local src="$1" out="$2" crop="$3" size="$4"
  local args=("$SRC/$src")
  [ "$crop" != "-" ] && args+=(-crop "$crop" +repage)
  args+=(-resize "$size" -strip -quality 82 "$OUT/$out")
  convert "${args[@]}"
  printf '  %-44s %s\n' "$out" "$(identify -format '%wx%h %[size]B' "$OUT/$out")"
}

echo "covers"
# Company hero. The team around a food moodboard reads as a food company's
# own office, and carries no wordmark.
derive chat/team-foodboard.webp  cover/bite-office.webp   '1672x628+0+150'  1600x
derive drive/marketing-photo.webp cover/marketing.webp    '1100x720+0+0'    900x
derive chat/sales-pitch.webp     cover/sales.webp         '-'               900x
derive drive/product-photo.webp  cover/product.webp       '-'               900x
derive drive/strategy-photo.webp cover/strategy.webp      '-'               900x
derive drive/hr-photo.webp       cover/hr.webp            '-'               900x
# Not referenced by any department yet: the implementation spec defines five
# departments, and inventing a sixth is not ours to do. Kept for when it is.
derive drive/operations-photo.webp cover/operations.webp  '-'               900x

echo "account / product"
derive chat/quickmart-dusk.webp  account/quickmart.webp   '-'               1200x
derive chat/bite-bottles.webp    product/bite-protein-drink.webp '-'        1100x

echo "portraits"
# Square crops centred on each face.
derive chat/meeting-buyer.webp   avatar/yuki-tanaka.webp  '620x620+820+60'  320x320
derive chat/sales-pitch.webp     avatar/rin-asakura.webp  '620x620+360+90'  320x320
derive drive/hr-photo.webp       avatar/reception.webp    '430x430+120+40'  320x320

echo
echo "done — $(du -sh "$OUT" | cut -f1) in $OUT"
