"""Check local links, chapter IDs and the shipped example without network access."""
from html.parser import HTMLParser
from pathlib import Path
import ast
import importlib.util
import json
import unittest.mock as mock

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.pre = [], [], []
        self.in_pre = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])
        if tag == 'pre':
            self.in_pre = True
            self.pre.append('')
    def handle_endtag(self, tag):
        if tag == 'pre':
            self.in_pre = False
    def handle_data(self, data):
        if self.in_pre:
            self.pre[-1] += data

example = (ROOT / 'examples/local_rag.py').read_text()
ast.parse(example)
for relative in ['index.html', 'en/index.html']:
    file = ROOT / relative
    text = file.read_text()
    page = Page()
    page.feed(text)
    assert len(page.ids) == len(set(page.ids)), f'Duplicate ID: {relative}'
    for link in page.links:
        if link.startswith('#') and len(link) > 1:
            assert link[1:] in page.ids, (relative, link)
        elif not link.startswith(('http:', 'https:', 'mailto:', '//', 'data:')):
            target = link.split('#')[0].split('?')[0]
            target_path = ROOT / target.lstrip('/') if target.startswith('/') else file.parent / target
            assert target_path.exists(), (relative, link)
    assert example in page.pre, f'Displayed example differs from download: {relative}'
    assert '--num-ctx' not in text
    assert 'Qwen3-32B-A3B' not in text
    print(f'PASS: {relative}: unique IDs, local links, matching Python source')

spec = importlib.util.spec_from_file_location('local_rag', ROOT / 'examples/local_rag.py')
rag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rag)
assert rag.retrieve('拍摄后多久交付照片？')[0][0] == 'guide-02'
assert rag.retrieve('When are photos delivered?')[0][0] == 'guide-02'
assert rag.retrieve('zzzxxyy') == []
assert 'Not enough' in rag.answer('zzzxxyy')
response = mock.MagicMock()
response.__enter__.return_value.read.return_value = json.dumps({'message': {'content': '七个工作日 [guide-02]'}}).encode()
opener = mock.MagicMock()
opener.open.return_value = response
with mock.patch.object(rag.urllib.request, 'build_opener', return_value=opener):
    answer = rag.answer('拍摄后多久交付照片？')
    request = opener.open.call_args[0][0]
    payload = json.loads(request.data)
    assert request.full_url == 'http://127.0.0.1:11434/api/chat'
    assert payload['stream'] is False
    assert '[guide-02]' in payload['messages'][0]['content']
    assert '七个工作日' in answer and 'guide-02' in answer
print('PASS: retrieval, missing information, local API request and response (mocked; not model inference)')
