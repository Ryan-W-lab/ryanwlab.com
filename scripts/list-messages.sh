#!/usr/bin/env bash
# 查看线上留言箱
#
# 用法:
#   scripts/list-messages.sh              # 最近 20 条
#   scripts/list-messages.sh 100          # 最近 100 条
#   scripts/list-messages.sh --watch      # 每 30 秒自动刷新
#   scripts/list-messages.sh --watch 10   # 每 10 秒刷新
#
# 说明:
#   - 本脚本不含任何密钥。它复用你本机的 Cloudflare OAuth 登录态
#     （~/Library/Preferences/.wrangler/config/default.toml，在仓库之外）。
#   - 首次使用需先执行 `npx wrangler@4.156.0 login`（浏览器授权）。
#   - 只执行 SELECT，不写入、不删除任何留言。
#   - 别人拿到本脚本也读不到你的留言：D1 数据库在你的 Cloudflare 账号下，
#     读取需要该账号权限；网站本身没有留言读取接口（GET 返回 405）。
set -euo pipefail
cd "$(dirname "$0")/.."
WRANGLER_VERSION="4.156.0"

LIMIT=20
WATCH=0
INTERVAL=30
while [ $# -gt 0 ]; do
  case "$1" in
    --watch) WATCH=1; [ $# -ge 2 ] && case "$2" in ''|*[!0-9]*) ;; *) INTERVAL="$2"; shift;; esac ;;
    ''|*[!0-9]*) echo "用法: $0 [条数] [--watch [刷新秒数]]" >&2; exit 1 ;;
    *) LIMIT="$1" ;;
  esac
  shift
done

if ! npx --yes "wrangler@${WRANGLER_VERSION}" whoami >/dev/null 2>&1; then
  echo "还没登录 Cloudflare，请先执行:" >&2
  echo "  npx wrangler@${WRANGLER_VERSION} login" >&2
  exit 1
fi

fetch() {
  npx --yes "wrangler@${WRANGLER_VERSION}" d1 execute ryanwlab-messages --remote \
    --config backend/wrangler.jsonc \
    --json \
    --command "SELECT datetime(created_at,'unixepoch','+8 hours') AS beijing_time, nickname, message FROM messages ORDER BY created_at DESC LIMIT $LIMIT;" \
    | python3 -c '
import json,sys
raw=sys.stdin.read().strip()
try:
    data=json.loads(raw)
except json.JSONDecodeError:
    print(raw); raise SystemExit(0)
rows=data[0]["results"] if data and isinstance(data[0],dict) and "results" in data[0] else data
if not rows:
    print("（还没有留言）"); raise SystemExit(0)
for i,r in enumerate(rows,1):
    when=r.get("beijing_time","?")
    nick=r.get("nickname") or "（匿名）"
    msg=str(r.get("message","")).replace("\n","\n    ")
    print("[%d] %s  %s" % (i,when,nick))
    print("    "+msg)
    print()
'
}

if [ "$WATCH" -eq 0 ]; then
  echo "→ 查询 ryanwlab-messages（最近 $LIMIT 条）…"
  fetch
  exit 0
fi

echo "→ 实时模式：每 ${INTERVAL}s 刷新（Ctrl-C 退出）"
trap 'echo; echo "已退出实时模式。"' INT
while true; do
  clear
  echo "=== ryanwlab-messages · 最近 $LIMIT 条 · $(date '+%Y-%m-%d %H:%M:%S') ==="
  fetch
  sleep "$INTERVAL"
done
