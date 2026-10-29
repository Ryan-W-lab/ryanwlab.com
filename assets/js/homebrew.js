/* Local-only starter tags, checked against Ollama Library on 2026-10-29.
   No throughput or hardware benchmark claims. */
(function () {
  'use strict';
  const mount = document.getElementById('hbwall');
  if (!mount) return;
  const en = document.documentElement.lang.startsWith('en');
  const items = [
    ['qwen3:1.7b', '1.4 GB', '先验证安装与基础对话', 'Check installation and basic chat'],
    ['qwen3:8b', '5.2 GB', '基础对话进阶；先确认可用内存', 'Larger chat model; check available memory first'],
    ['qwen2.5-coder:7b', '4.7 GB', '代码生成与解释；输出仍需测试', 'Code generation and explanation; test its output'],
    ['deepseek-r1:8b', '5.2 GB', '推理模型；思考可能增加等待时间', 'Reasoning model; thinking can increase latency']
  ];
  mount.innerHTML = items.map(([tag, size, zh, english]) => `<article class="mcard">
    <h3>${tag}</h3><p>${en ? english : zh}</p>
    <p>${en ? 'Listed download size' : '模型页下载大小'}: ${size} · 2026-10-29</p>
    <div class="term"><div class="bar"><span>Terminal</span><button type="button" class="copy">⧉ ${en ? 'Copy' : '复制'}</button></div><pre>ollama run ${tag}</pre></div>
    <p><a href="https://ollama.com/library/${tag}" target="_blank" rel="noopener">${en ? 'Model, tags and license' : '模型、标签与许可'} ↗</a></p>
  </article>`).join('');
})();
