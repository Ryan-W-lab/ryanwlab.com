#!/usr/bin/env bash
# Render one section of the site in isolation and screenshot it, so layout can be checked.
# 用法: scripts/shot-section.sh <section-id> [output.png] [width] [height]
set -euo pipefail
cd "$(dirname "$0")/.."
SEC="${1:-models}"
OUT="${2:-/tmp/section.png}"
W="${3:-1500}"
H="${4:-2600}"

TMP=$(mktemp -d)
cp -R site-dist/. "$TMP/"
python3 - "$TMP/index.html" "$SEC" <<'PY'
import re, sys
path, sec = sys.argv[1], sys.argv[2]
html = open(path, encoding='utf-8').read()
css = f"""
<style id="shotfix">
#veil{{display:none!important}}
.reveal-seed>*{{opacity:1!important;transform:none!important}}
*{{animation:none!important;transition:none!important}}
body>*:not(main){{display:none!important}}
main>*:not(#{sec}){{display:none!important}}
main{{padding-top:20px!important}}
</style>
"""
html = html.replace("</head>", css + "</head>")
open(path, "w", encoding='utf-8').write(html)
PY

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --screenshot="$OUT" --window-size="$W,$H" --virtual-time-budget=12000 \
  "file://$TMP/index.html" 2>/dev/null || true
rm -rf "$TMP"
echo "→ $OUT ($(stat -f%z "$OUT" 2>/dev/null || echo 0) bytes)"
