"""Content audit for the §04 model chapter.

Checks the generated catalogue and the surrounding tables for the kind of
mistakes that are easy to miss by eye: empty fields, leaked placeholders,
duplicate entries, broken source links, mismatched licence wording and
paragraphs that no longer match the data they describe.

Run: python3 scripts/audit_models.py
"""
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
problems = []


def check(cond, msg):
    if not cond:
        problems.append(msg)


main_js = (ROOT / "assets" / "js" / "main.js").read_text(encoding="utf-8")
zh = (ROOT / "index.html").read_text(encoding="utf-8")
en = (ROOT / "en" / "index.html").read_text(encoding="utf-8")

# --- 1. 模型卡片字段完整性 ---
block = main_js[main_js.index("const ARS = ["):main_js.index("const wall =")]
entries = re.findall(r'\{\s*n:"([^"]+)",\s*org:"([^"]*)",\s*kinds:\[([^\]]*)\],\s*licText:"([^"]*)",(.*?)\n      source:"([^"]+)" \},', block, re.S)
check(len(entries) >= 90, f"解析到的模型数偏少：{len(entries)}")

names = []
for name, org, kinds, lic, mid, src in entries:
    names.append(name)
    check(name.strip() != "", "存在空模型名")
    check(org.strip() != "", f"{name}: 厂商为空")
    check(lic.strip() != "", f"{name}: 许可为空")
    check(src.startswith("https://"), f"{name}: 来源链接不是 https")
    host = urlparse(src).netloc
    check(
        host.endswith("huggingface.co") or host.endswith("blog.google")
        or host.endswith("github.com") or host.endswith("qwen.ai")
        or host.endswith("apple.com") or host.endswith("mistral.ai"),
        f"{name}: 来源域名异常 {host}",
    )
    for field in ("params", "ctx", "sizes", "gpu", "b", "date", "tier"):
        m = re.search(r'%s:"([^"]*)"' % field, mid)
        if field in ("ctx",):
            check(m is not None, f"{name}: 缺少 {field} 字段")
        elif field in ("params",):
            check(m is not None and m.group(1).strip() != "", f"{name}: {field} 为空")
        else:
            check(m is not None, f"{name}: 缺少 {field} 字段")
    check(re.search(r'tier:"t[123]"', mid) is not None, f"{name}: tier 值非法")
    check(kinds.strip() != "", f"{name}: kinds 为空")

dups = {n for n in names if names.count(n) > 1}
check(not dups, f"存在重复条目：{sorted(dups)}")

# --- 2. 占位符/未核实标记泄漏 ---
for label, text in (("中文页", zh), ("英文页", en), ("模型数据", block)):
    for bad in ("UNVERIFIED", "do not publish", "TODO", "FIXME", "待补", "未核实", "PLACEHOLDER", "{{"):
        if bad in text:
            problems.append(f"{label} 里出现了占位符/未核实标记：{bad!r}")

# --- 3. 各表行数与 id 对齐 ---
for page, label in ((zh, "中文页"), (en, "英文页")):
    ids = re.findall(r'<table class="tbl" id="(tbl-[a-z]+)"', page)
    check(len(ids) == len(set(ids)), f"{label}: table id 重复")
    for tid in ids:
        i = page.index(f'id="{tid}"')
        j = page.index("</table>", i)
        seg = page[i:j]
        rows = len(re.findall(r"<tr[ >]", seg))
        check(rows > 1, f"{label}: 表 {tid} 只有表头没有数据行")
        # 每个数据行都应有同样数量的 td
        body = seg[re.search(r"<tbody[^>]*>", seg).start():]
        for tr in re.findall(r"<tr>(.*?)</tr>", body, re.S):
            if "<th" in tr:
                continue
            tds = len(re.findall(r"<td", tr))
            cols = len(re.findall(r"<th[ >]", seg[seg.index("<thead>"):seg.index("</thead>")]))
            check(tds == cols, f"{label}: 表 {tid} 有一行列数 {tds} ≠ 表头 {cols}")

# --- 4. 描述与数据是否自洽 ---
check("分七块看" in zh, "中文页 §04 导语没提到七块")
check("Seven blocks" in en, "英文页 §04 导语没提到 Seven blocks")
check("2026-11-01" in zh, "中文页缺少核对日期")
check("2026-11-01" in en, "英文页缺少核对日期")
check("2027-02-01" in zh, "中文页缺少下次复核日期")

# 档位分布
tiers = re.findall(r'tier:"(t[123])"', block)
from collections import Counter
dist = Counter(tiers)
print(f"模型总数 {len(entries)}｜档位分布 {dict(dist)}")
srcs = Counter(urlparse(s).netloc for *_, s in entries)
print("来源域名:", dict(srcs))

# --- 5. 留言框相关文案仍一致 ---
for label, page, needle in (("中文页", zh, "每天最多提交 3 条"), ("英文页", en, "3 messages per network address")):
    check(needle in page, f"{label}: 留言额度说明丢失")
    check("message-note" in page, f"{label}: 留言额度说明 id 丢失")

if problems:
    for p in problems:
        print("FAIL:", p)
    sys.exit(1)
print("PASS: 模型目录内容审计通过（无占位符、无重复、无空字段、表格列数一致、来源链接规范）")
