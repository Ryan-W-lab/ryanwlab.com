(function () {
  'use strict';
  const form = document.getElementById('message-form');
  if (!form) return;
  const en = document.documentElement.lang.startsWith('en');
  const endpoint = document.querySelector('meta[name="message-api"]')?.content.trim();
  const message = form.elements.message;
  const nickname = form.elements.nickname;
  const count = document.getElementById('message-count');
  const status = document.getElementById('message-status');
  const submit = form.querySelector('[type="submit"]');
  const strings = en ? {
    unavailable:'The message box is not connected yet. Nothing will be submitted.',
    length:'Enter 1–500 characters and a nickname of no more than 20 characters.',
    pending:'Submitting…', success:'Message received. Thank you! Replies are not guaranteed.',
    daily:'This network address has reached today’s 3-message limit. Try after midnight Beijing time (UTC+8).',
    cooldown:'Please wait 60 seconds after your last successful submission.',
    failure:'Could not confirm receipt. Your text is preserved; retry to avoid duplicate messages.',
    invalid:'Please check the message length and try again.', conflict:'This submission changed during a retry. Edit the message and try again.',
    send:'Submit message', sending:'Submitting…'
  } : {
    unavailable:'留言箱尚未接通，暂时无法提交。',
    length:'留言需为 1—500 个字符，昵称最多 20 个字符。',
    pending:'正在提交…', success:'已收到，谢谢你的留言！不保证逐条回复。',
    daily:'同一网络地址今日已提交 3 条，请北京时间零点后再试。',
    cooldown:'请在上次成功提交 60 秒后再试。',
    failure:'暂时无法确认是否收到，内容已保留。请重试，同一次提交不会重复保存。',
    invalid:'请检查字数与内容后重试。', conflict:'本次重试内容发生变化，请编辑留言后重新提交。',
    send:'提交留言', sending:'正在提交…'
  };
  // The production endpoint is a public URL, never an API key or database token.
  let ready = false;
  try { ready = !!endpoint && new URL(endpoint, location.href).protocol === 'https:'; } catch (_) {}
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
  if (local && endpoint) {
    try { const url = new URL(endpoint, location.href); ready ||= url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname); } catch (_) {}
  }
  let pending = false;
  let requestId = null;
  let fingerprint = '';
  function updateCount() {
    const size = [...message.value.trim()].length;
    count.textContent = size + ' / 500';
    count.classList.toggle('over-limit', size > 500);
    submit.disabled = !ready || pending || size < 1 || size > 500 || [...nickname.value.trim()].length > 20;
  }
  form.addEventListener('input', updateCount);
  updateCount();
  status.textContent = ready ? "" : strings.unavailable;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !ready) return;
    const text = message.value.trim();
    const name = nickname.value.trim();
    if (!text || [...text].length > 500 || [...name].length > 20) { status.textContent = strings.length; return; }
    const next = JSON.stringify([name, text]);
    if (next !== fingerprint || !requestId) { requestId = crypto.randomUUID(); fingerprint = next; }
    pending = true;
    message.readOnly = nickname.readOnly = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = strings.pending;
    status.dataset.state = 'pending';
    submit.textContent = strings.sending;
    updateCount();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:requestId, nickname:name, message:text}),
        credentials:'omit', signal:controller.signal,
      });
      const data = await response.json();
      if (response.ok && ['RECEIVED', 'ALREADY_RECEIVED'].includes(data.code)) {
        message.value = '';
        requestId = null;
        fingerprint = '';
        status.textContent = strings.success;
        status.dataset.state = 'success';
      } else {
        const labels = {DAILY_LIMIT:'daily', COOLDOWN:'cooldown', INVALID_MESSAGE:'invalid', TOO_LARGE:'invalid', ID_CONFLICT:'conflict', NOT_CONFIGURED:'unavailable'};
        status.textContent = strings[labels[data.code] || 'failure'];
        status.dataset.state = 'error';
      }
    } catch (_) {
      status.textContent = strings.failure;
      status.dataset.state = 'error';
    } finally {
      clearTimeout(timeout);
      pending = false;
      message.readOnly = nickname.readOnly = false;
      submit.textContent = strings.send;
      form.removeAttribute('aria-busy');
      updateCount();
    }
  });
})();
