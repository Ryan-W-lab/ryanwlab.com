#!/usr/bin/env bash
# 版面自检：用无头 Chrome 量真实渲染尺寸，而不是靠肉眼看截图。
#
# 检查三件容易回退的事：
#   1. 每章导语（.lead）是否与正文同宽（曾经卡在 960px，比表格窄 92px）
#   2. 表格是否溢出容器、要横向滚动（桌面端出现滚动条是缺陷）
#   3. 厂商列是否被折成两行（「阿里 · 通义」曾被挤断）
#
# 用法：scripts/check_layout.sh            # 默认 1500 / 1280 / 1024
#       scripts/check_layout.sh 1600 1440  # 自定义宽度
#
# 需要 Google Chrome。CI 的 ubuntu runner 没有预装，所以这个脚本只在本地跑。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
WIDTHS=("$@")
[ ${#WIDTHS[@]} -eq 0 ] && WIDTHS=(1500 1280 1024)

if [ ! -x "$CHROME" ]; then
  echo "SKIP: 找不到 Chrome（可用 CHROME=/path/to/chrome 指定）"
  exit 0
fi
[ -f "$ROOT/site-dist/index.html" ] || { echo "先把站点构建到 site-dist/ 再跑"; exit 1; }

fail=0
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R "$ROOT/site-dist" "$tmp/dist"

python3 - "$tmp/dist" <<'PY'
import sys
from pathlib import Path

root = Path(sys.argv[1])
probe = """
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  function W(el){ return el ? Math.round(el.getBoundingClientRect().width) : 0; }
  var out = {vw: innerWidth, docW: document.documentElement.scrollWidth, leads: [], tables: [], wrapped: []};
  document.querySelectorAll('.lead').forEach(function(el){
    var p = el.parentElement, cs = getComputedStyle(p);
    var avail = Math.round(p.getBoundingClientRect().width
      - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    if (avail - W(el) > 4) out.leads.push(W(el) + 'px of ' + avail + 'px');
  });
  document.querySelectorAll('.tbl-scroll').forEach(function(c){
    var t = c.querySelector('table'); if (!t) return;
    var over = c.scrollWidth - c.clientWidth;
    if (over > 2) out.tables.push((t.id || '(no id)') + ' +' + over + 'px');
  });
  ['tbl-frontier','tbl-closed','tbl-embed','tbl-ocr','tbl-audio','tbl-video'].forEach(function(id){
    var t = document.getElementById(id); if (!t) return;
    Array.prototype.forEach.call(t.querySelectorAll('tbody tr'), function(tr){
      var td = tr.children[1]; if (!td) return;
      var lh = parseFloat(getComputedStyle(td).lineHeight) || 18;
      if (getComputedStyle(td).whiteSpace !== 'nowrap' && td.getBoundingClientRect().height > lh * 1.6)
        out.wrapped.push(id + ': ' + td.textContent.trim().slice(0, 24));
    });
  });
  document.title = 'LAYOUT::' + JSON.stringify(out);
}, 1500); });
</script>
"""
for name in ("index.html", "en/index.html"):
    p = root / name
    t = p.read_text(encoding="utf-8")
    t = t.replace("</body>", probe + "</body>", 1)
    t = t.replace(
        "<head>",
        "<head>\n<style>#veil{display:none!important}"
        ".reveal-seed>*{opacity:1!important}*{animation:none!important;"
        "transition:none!important}</style>",
        1,
    )
    p.write_text(t, encoding="utf-8")
PY

for w in "${WIDTHS[@]}"; do
  for page in index.html en/index.html; do
    label=$([ "$page" = "index.html" ] && echo "中文" || echo "英文")
    json=$("$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=15000 \
      --window-size="${w},1000" --dump-dom "file://$tmp/dist/$page" 2>/dev/null \
      | grep -o '<title>LAYOUT::[^<]*' | sed 's/<title>LAYOUT:://')

    if [ -z "$json" ]; then
      echo "  ✗ ${label} @${w}px：测量脚本没有返回结果"
      fail=1
      continue
    fi

    if python3 -c "
import json, sys
d = json.loads(sys.argv[1])
bad = []
if d['docW'] > d['vw'] + 1:
    bad.append('页面出现横向滚动（%d > %d）' % (d['docW'], d['vw']))
if d['leads']:
    bad.append('导语未与正文同宽：' + ', '.join(d['leads'][:3]))
if d['tables']:
    bad.append('表格溢出容器：' + ', '.join(d['tables'][:4]))
if d['wrapped']:
    bad.append('厂商列折行：' + ', '.join(d['wrapped'][:3]))
if bad:
    print('  ✗ ${label} @${w}px：' + ' | '.join(bad)); sys.exit(1)
print('  ✓ ${label} @${w}px')
" "$json"; then :; else fail=1; fi
  done
done

if [ "$fail" -ne 0 ]; then
  echo "版面自检未通过"
  exit 1
fi
echo "PASS: 版面自检通过（导语满宽、表格不溢出、厂商列不折行）"
