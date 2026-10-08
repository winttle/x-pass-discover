#!/usr/bin/env bash
#
# Derives the web-ready imagery in `public/img/` from the originals in
# `assets-src/`.
#
#   ./scripts/build-image-assets.sh      (needs ImageMagick)
#
# Why a script rather than hand-edited files: every crop below is a decision
# (which face, which part of the room), and some of them exist specifically to
# keep a wrong wordmark out of frame. Recording them here makes the derivation
# reviewable and repeatable when a source image is re-generated.
#
# PROVENANCE: the originals are concept-stage fictional assets generated for
# X-PASS. An early batch was produced while the fictional company was still
# called "MOGU FOODS" and carries that wordmark inside the photograph. This
# app's company is BITE, so those frames are cropped to exclude it, superseded
# by a re-generated frame, or not used at all:
#
#   drive/company-building-photo.webp   NOT USED — "MOGU FOODS" spans the
#                                       facade. Superseded by chat/bite-hq,
#                                       whose signage correctly reads BITE.
#   drive/bite-office-photo.webp        NOT USED — "MOGU" sign on the back wall
#   drive/sales-photo.webp              NOT USED — "MOGU FOODS" on the held page
#   drive/bite-protein-drink-photo.webp NOT USED — bottles read "MOGU PROTEIN"
#   drive/marketing-photo.webp          USED, cropped to drop the "MOGU" panel
#
# Two further originals carry no wordmark and are simply superseded, kept in
# case the frame is wanted again:
#
#   drive/product-photo.webp            NOT USED — superseded by
#                                       chat/product-tasting, which shows
#                                       packaging and concept work rather than
#                                       a tasting session.
#   drive/quickmart-photo.webp          NOT USED — superseded by
#                                       chat/quickmart-dusk.
#
# Everything not listed above is derived below, so the `derive` lines are the
# complete record of what ships.
#
# Every frame used below has been checked at full resolution for legible text;
# the only wordmark that survives anywhere is BITE on the headquarters facade.
#
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets-src
OUT=public/img
mkdir -p "$OUT"/{cover,account,product,avatar,scene}

# derive <source> <output> <crop|-> <width|WxH>
derive() {
  local src="$1" out="$2" crop="$3" size="$4"
  local args=("$SRC/$src")
  [ "$crop" != "-" ] && args+=(-crop "$crop" +repage)
  args+=(-resize "$size" -strip -quality 82 "$OUT/$out")
  convert "${args[@]}"
  printf '  %-44s %s\n' "$out" "$(identify -format '%wx%h %[size]B' "$OUT/$out")"
}

echo "company"
# Arriving: the headquarters from the plaza, signage reading BITE. Used on the
# landing page and the sign-in screen, where the student is still outside.
derive chat/bite-hq.webp         cover/bite-hq.webp       '-'               1600x
# Inside: the team around a food moodboard, for the in-app banners. Carries no
# wordmark.
derive chat/team-foodboard.webp  cover/bite-office.webp   '1672x628+0+150'  1600x

echo "covers"
derive drive/marketing-photo.webp cover/marketing.webp    '1100x720+0+0'    900x
derive chat/sales-pitch.webp     cover/sales.webp         '-'               900x
derive chat/product-tasting.webp cover/product.webp       '-'               900x
derive drive/strategy-photo.webp cover/strategy.webp      '-'               900x
derive drive/hr-photo.webp       cover/hr.webp            '-'               900x
# Not referenced by any department yet: the implementation spec defines five
# departments, and inventing a sixth is not ours to do. Kept for when it is.
derive drive/operations-photo.webp cover/operations.webp  '-'               900x

echo "scene"
# Dusk, printed charts, no readable text: dark enough to carry white type, so
# it backs the decision-revision band rather than sitting in the cover row.
derive chat/strategy-desk.webp   scene/decision-desk.webp '-'               1600x

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
