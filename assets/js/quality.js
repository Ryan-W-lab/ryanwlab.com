/* Shared, keyboard-accessible copy behavior for static and generated examples. */
(function () {
  'use strict';
  const en = document.documentElement.lang.startsWith('en');
  function enhance() {
    document.querySelectorAll('.copy:not(button)').forEach(old => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = old.className;
      button.textContent = old.textContent;
      if (old.dataset.copy) button.dataset.copy = old.dataset.copy;
      old.replaceWith(button);
    });
    document.querySelectorAll('.copy').forEach(button => {
      button.setAttribute('aria-label', en ? 'Copy code' : '复制代码');
      button.setAttribute('aria-live', 'polite');
    });
  }
  enhance();
  document.addEventListener('click', async event => {
    const button = event.target.closest('.copy');
    if (!button) return;
    const pre = button.closest('.term')?.querySelector('pre');
    if (!pre) return;
    // Copy the displayed code, excluding decorative prompts and sample output.
    const clone = pre.cloneNode(true);
    clone.querySelectorAll('.p, .o').forEach(node => node.remove());
    const text = (button.dataset.copy || clone.textContent).replace(/\u200b/g, '').trim();
    const old = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = en ? '✓ Copied' : '✓ 已复制';
    } catch (_) {
      button.textContent = en ? 'Select code to copy' : '请选中代码手动复制';
    }
    setTimeout(() => { button.textContent = old; }, 1800);
  });
})();
