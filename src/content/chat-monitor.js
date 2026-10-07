(() => {
  'use strict';
  window.MOOTChatMonitor?.stop();
  let observer, timer, current;
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  function get(target) {
    const element = window.MOOTElementFinder.findElement(target || {});
    if (!element) throw new Error('Нужный элемент чата не найден.');
    return element;
  }
  function verify(config) {
    const header = get(config.chatTarget);
    if (normalize(header.innerText || header.getAttribute('title') || header.getAttribute('aria-label')) !== normalize(config.expectedChat)) {
      throw new Error('Открыт другой чат. Жду возвращения в выбранный чат.');
    }
  }
  function snapshot(config) {
    verify(config);
    const list = get(config.messageListTarget);
    const rows = [...list.querySelectorAll(config.messageSelector)].slice(-200);
    const messages = rows.map(row => {
      const id = row.getAttribute(config.idAttribute || 'id');
      if (!id) throw new Error('Для мониторинга нужен стабильный идентификатор каждого сообщения. Уточни messageSelector и idAttribute.');
      const content = config.textSelector ? row.querySelector(config.textSelector) : row;
      const outgoing = row.matches('.message-out, .is-out, [data-outgoing="true"]') ||
        (config.outgoingSelector && row.matches(config.outgoingSelector));
      return { id, text: (content?.innerText || '').trim().slice(0, 8000), outgoing: Boolean(outgoing) };
    });
    if (new Set(messages.map(m => m.id)).size !== messages.length) throw new Error('Идентификаторы сообщений повторяются. Уточни контейнер сообщения.');
    return { url: location.href, messages };
  }
  function start(config) {
    if (current?.id === config.id && observer) return snapshot(config);
    stop(); current = config;
    observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        chrome.runtime.sendMessage({ type: 'MONITOR_TICK', id: config.id }).catch(() => {});
      }, 700);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return snapshot(config);
  }
  function stop() { observer?.disconnect(); observer = null; clearTimeout(timer); timer = null; current = null; }
  async function action(config, action) {
    await authorized(config);
    verify(config);
    if (action.type === 'reply') {
      const args = { ...config, target: config.composerTarget, text: action.text };
      await window.MOOTMessenger.execute({ ...args, action: 'draft' });
      await authorized(config);
      verify(config);
      return window.MOOTMessenger.execute({ ...args, action: 'send' });
    }
    if (!config.allowActions || !['click', 'type', 'scroll', 'focus'].includes(action.type)) throw new Error('Это действие не входит в разрешённый мониторинг.');
    return window.MOOTActionExecutor.execute({ ...action, options: { ...action.options, highlight: false } });
  }
  async function authorized(config) {
    const { mootMonitor, mutState } = await chrome.storage.local.get(['mootMonitor', 'mutState']);
    const monitors = mootMonitor?.monitors || (mootMonitor ? [mootMonitor] : []);
    if (!monitors.some(item => item.enabled && item.id === config.id)) throw new Error('Мониторинг остановлен.');
    if (mutState?.running) throw new Error('Браузер занят текущей командой пользователя.');
  }
  window.MOOTChatMonitor = { start, stop, snapshot, action };
})();
