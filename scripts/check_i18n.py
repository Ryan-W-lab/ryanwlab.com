"""Check that the Chinese and English pages stay in sync.

Both pages are hand-written HTML, so they drift: a section was once unclosed
in the English copy, and footer fixes repeatedly landed in one language only.
This compares the structural skeleton and the visitor-facing strings that
must match, and fails when one side is missing or out of date.

Run: python3 scripts/check_i18n.py
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ZH = ROOT / "index.html"
EN = ROOT / "en" / "index.html"


class Skeleton(HTMLParser):
    """Collect section ids, headings and the ids of the message box widgets."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.section_ids = []
        self.element_ids = []
        self.h2 = []
        self._in_h2 = False
        self._buf = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and "id" in attrs:
            self.section_ids.append(attrs["id"])
        if "id" in attrs:
            self.element_ids.append(attrs["id"])
        if tag == "h2":
            self._in_h2 = True
            self._buf = []

    def handle_endtag(self, tag):
        if tag == "h2" and self._in_h2:
            self.h2.append("".join(self._buf).strip())
            self._in_h2 = False

    def handle_data(self, data):
        if self._in_h2:
            self._buf.append(data)


def read(path):
    return path.read_text(encoding="utf-8")


zh_text, en_text = read(ZH), read(EN)
zh, en = Skeleton(), Skeleton()
zh.feed(zh_text)
en.feed(en_text)

failures = []


def check(condition, message):
    if not condition:
        failures.append(message)


# 1. Same number of chapters, in the same order.
check(
    len(zh.section_ids) == len(en.section_ids),
    f"章节数量不一致: 中文 {len(zh.section_ids)} 个, 英文 {len(en.section_ids)} 个",
)
for index, (zh_id, en_id) in enumerate(zip(zh.section_ids, en.section_ids)):
    check(zh_id == en_id, f"第 {index + 1} 个章节 id 不一致: {zh_id} != {en_id}")

# 2. Same number of top-level headings.
check(
    len(zh.h2) == len(en.h2),
    f"h2 数量不一致: 中文 {len(zh.h2)}, 英文 {len(en.h2)}",
)

# 3. The message box widgets must exist on both sides.
for element_id in ("message-form", "message-text", "message-count", "message-note"):
    check(element_id in zh.element_ids, f"中文页缺少 #{element_id}")
    check(element_id in en.element_ids, f"英文页缺少 #{element_id}")

# 4. The character limit hint must exist on both sides, with the same number.
zh_meta = re.search(r'<div class="message-meta"><span>([^<]*)</span>', zh_text)
en_meta = re.search(r'<div class="message-meta"><span>([^<]*)</span>', en_text)
check(bool(zh_meta), "中文页缺少字数提示")
check(bool(en_meta), "英文页缺少字数提示")
if zh_meta and en_meta:
    for text in (zh_meta.group(1), en_meta.group(1)):
        check("500" in text, f"字数提示未写明 500 上限: {text}")

# 5. The character-limit hint must not drift back to the internal wording.
for label, text in (("中文", zh_text), ("英文", en_text)):
    for forbidden in ("北京时间零点重置", "带密钥摘要", "midnight Beijing time", "daily keyed digest"):
        check(forbidden not in text, f"{label}页仍残留内部说明: {forbidden}")

# 6. The quota note must exist on both sides.
for label, text, needle in (
    ("中文", zh_text, "3 条"),
    ("英文", en_text, "3 messages"),
):
    check(needle in text, f"{label}页缺少每日额度说明（未找到 {needle!r}）")

# 7. §04 模型区：各表行数中英一致；中文模型墙（JS 渲染）条数 = 英文本地清单行数。
#    注意：中文页的本地清单是 JS 卡片墙（没有 <table>），英文页是静态表格，两者靠条数对齐。
#    §04 的表格顺序：前沿超大模型 → 闭源旗舰 → 本地可部署清单（仅英文有第三张表）。
def section(text, start_marker, end_marker):
    i = text.index(start_marker)
    j = text.index(end_marker, i)
    return text[i:j]


def count_rows(block):
    return len(re.findall(r"<tr>", block))


def table_bodies(block):
    """返回每个 <tbody>...</tbody> 的内容。"""
    bodies = []
    pos = 0
    while True:
        i = block.find("<tbody>", pos)
        if i == -1:
            break
        j = block.index("</tbody>", i)
        bodies.append(block[i:j])
        pos = j
    return bodies


zh_models = section(zh_text, 'id="models"', '<!-- ======= 05')
en_models = section(en_text, 'id="models"', '<!-- ======= 05')
zh_tables = table_bodies(zh_models)
en_tables = table_bodies(en_models)

check(len(zh_tables) >= 1, "中文页 §04 缺少前沿超大模型表")
check(len(en_tables) >= 2, "英文页 §04 缺少前沿表或本地清单表")

# 前沿表、闭源表：逐个对应比较行数
for index in range(min(len(zh_tables), len(en_tables))):
    check(
        count_rows(zh_tables[index]) == count_rows(en_tables[index]),
        f"§04 第 {index + 1} 张表行数不一致: 中文 {count_rows(zh_tables[index])}, 英文 {count_rows(en_tables[index])}",
    )

# 英文最后一张表是本地可部署清单，对应中文的 JS 卡片墙
if zh_tables and len(en_tables) >= 2:
    local_table = en_tables[-1]
    js_path = ROOT / "assets" / "js" / "main.js"
    js_source = js_path.read_text(encoding="utf-8")
    js_names = re.findall(r'\{\s*n:"([^"]+)"', js_source)
    js_cards = len(js_names)
    check(
        js_cards == count_rows(local_table),
        f"本地清单条数不一致: 中文卡片墙 {js_cards} 个, 英文表格 {count_rows(local_table)} 行",
    )

    # 逐条比对模型标识（取含数字的型号 token），防止两边名单悄悄错位
    def tokens(name):
        return {t for t in re.findall(r"[A-Za-z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*", name) if any(c.isdigit() for c in t)}

    en_names = re.findall(r"<td><b>([^<]+)</b></td>", local_table)
    js_tokens = [tokens(n) for n in js_names]
    for name in en_names:
        want = tokens(name)
        if want and not any(want <= have for have in js_tokens):
            check(False, f"英文本地清单里的 {name!r} 在中文卡片墙里找不到对应模型")

if failures:
    for item in failures:
        print(f"FAIL: {item}")
    sys.exit(1)

print(
    f"PASS: 中英文页面结构一致（{len(zh.section_ids)} 个章节 / {len(zh.h2)} 个 h2），"
    "留言框组件与提示文案均已同步"
)
