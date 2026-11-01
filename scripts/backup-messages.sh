#!/usr/bin/env bash
# 备份留言箱到本地 CSV（应对 90 天自动清理或误删）
#
# 用法:
#   scripts/backup-messages.sh              # 导出全部
#   scripts/backup-messages.sh --days 30    # 只导出最近 30 天
#
# 输出:
#   backups/messages-YYYYMMDD-HHMMSS.csv   （已被 .gitignore 排除，不会进仓库）
#
# 说明:
#   - 备份含访客昵称与留言正文，属于个人数据：存本地、别传仓库、别上传网盘。
#   - 首次使用需先执行 `npx wrangler@4.156.0 login`（浏览器授权）。
set -euo pipefail
cd "$(dirname "$0")/.."
WRANGLER_VERSION="4.156.0"
DAYS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --days) DAYS="${2:-}"; shift ;;
    *) echo "用法: $0 [--days N]" >&2; exit 1 ;;
  esac
  shift
done

if ! npx --yes "wrangler@${WRANGLER_VERSION}" whoami >/dev/null 2>&1; then
  echo "还没登录 Cloudflare，请先执行:" >&2
  echo "  npx wrangler@${WRANGLER_VERSION} login" >&2
  exit 1
fi

if [ -n "$DAYS" ]; then
  FILTER="WHERE created_at >= (strftime('%s','now') - ${DAYS}*86400)"
else
  FILTER=""
fi

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/messages-${STAMP}.csv"

npx --yes "wrangler@${WRANGLER_VERSION}" d1 execute ryanwlab-messages --remote \
  --config backend/wrangler.jsonc \
  --json \
  --command "SELECT datetime(created_at,'unixepoch','+8 hours') AS beijing_time, nickname, message FROM messages ${FILTER} ORDER BY created_at DESC;" \
  | python3 -c '
import csv,json,sys
data=json.load(sys.stdin)
rows=data[0]["results"] if data and isinstance(data[0],dict) and "results" in data[0] else data
w=csv.writer(sys.stdout)
w.writerow(["beijing_time","nickname","message"])
for r in rows:
    w.writerow([r.get("beijing_time",""), r.get("nickname") or "", r.get("message","")])
' > "$OUT"

COUNT=$(($(wc -l < "$OUT") - 1))
echo "✓ 已导出 $COUNT 条留言 → $OUT"
echo "  提示：备份含个人数据，请留在本机并妥善保管（该目录已被 .gitignore 排除）。"
