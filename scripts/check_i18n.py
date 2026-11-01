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

if failures:
    for item in failures:
        print(f"FAIL: {item}")
    sys.exit(1)

print(
    f"PASS: 中英文页面结构一致（{len(zh.section_ids)} 个章节 / {len(zh.h2)} 个 h2），"
    "留言框组件与提示文案均已同步"
)
