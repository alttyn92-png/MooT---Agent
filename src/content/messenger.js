(() => {
  'use strict';
  const visible = element => window.MOOTElementFinder.isVisible(element);
  const normalize = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const text = element => normalize(element?.innerText || element?.getAttribute('aria-label') || element?.getAttribute('title'));
  function selector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const path = [];
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const siblings = [...node.parentElement.children].filter(other => other.tagName === node.tagName);
      path.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
      if (document.querySelectorAll(path.join(' > ')).length === 1) return path.join(' > ');
    }
    return path.join(' > ');
  }
  function describe(element) {
    return { target: { selector: selector(element) }, text: text(element).slice(0, 180), label: element.getAttribute('aria-label'), role: element.getAttribute('role') };
  }
  function find(target) {
    const element = window.MOOTElementFinder.findElement(target || {});
    if (!element) throw new Error('Элемент не найден. Сначала вызови messenger inspect или прочитай страницу.');
    return element;
  }
  function appName() {
    const host = location.hostname;
    if (host === 'web.whatsapp.com') return 'WhatsApp Web';
    if (host === 'web.telegram.org') return 'Telegram Web';
    if (['discord.com', 'canary.discord.com', 'ptb.discord.com'].includes(host)) return 'Discord Web';
    throw new Error('Открой WhatsApp Web, Telegram Web или Discord Web.');
  }
  function inspect() {
    const collect = (query, limit = 50) => [...document.querySelectorAll(query)].filter(visible).slice(0, limit).map(describe);
    return {
      app: appName(), url: location.href,
      editors: collect('textarea, input:not([type="password"]):not([type="hidden"]), [contenteditable]:not([contenteditable="false"])', 20),
      chats: collect('[role="row"], [role="listitem"], [role="treeitem"], a[href*="/channels/"], .chatlist-chat, [data-peer-id], [title]'),
      headings: collect('header [title], header h1, header h2, [role="heading"], .chat-info .title, .chat-info .peer-title, .topbar .peer-title, [class*="title"] h1, [class*="title"] h2', 30),
      messageLists: collect('[role="log"], [data-testid="conversation-panel-messages"], .bubbles-inner, .messages-container, [data-list-id="chat-messages"], ol[id^="chat-messages"]', 10),
      messageRows: [...document.querySelectorAll('[data-id], [data-mid], [data-message-id], [id^="chat-messages-"]')].filter(visible).slice(-20).map(element => ({
        ...describe(element), id: element.id, dataId: element.getAttribute('data-id'), dataMid: element.getAttribute('data-mid'), dataMessageId: element.getAttribute('data-message-id'), classes: element.className,
      })),
      sendButtons: collect('button, [role="button"]').filter(item => /send|отправ|жібер/i.test(`${item.label} ${item.text}`)),
      scrollPanels: [...document.querySelectorAll('div, section, main, aside, ul, ol')].filter(element =>
        element.scrollHeight > element.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(element).overflowY) && visible(element)
      ).slice(0, 15).map(describe),
      guidance: 'Targets are observed DOM elements. Identify the requested chat/channel and its current header. Use read_page for missing controls or search. Never treat search as the message composer.',
    };
  }
  function verifyChat(args) {
    if (!args.expectedChat || !args.chatTarget) throw new Error('Для сообщения нужны expectedChat и chatTarget из заголовка открытого чата.');
    if (text(find(args.chatTarget)) !== normalize(args.expectedChat)) throw new Error('Открыт другой чат. Сообщение не отправлено.');
  }
  function messageCount(list, expected) {
    return [...list.querySelectorAll('*')].filter(node => !node.isContentEditable && visible(node) && text(node) === expected &&
      ![...node.children].some(child => text(child) === expected)).length;
  }
  async function execute(args = {}) {
    appName();
    if (args.action === 'inspect') return inspect();
    if (args.action === 'open_chat') {
      await window.MOOTActionExecutor.click(args.target, { highlight: false });
      await new Promise(resolve => setTimeout(resolve, 200));
      return { status: 'clicked', ...inspect() };
    }
    if (!['draft', 'send', 'validate_send'].includes(args.action)) throw new Error('Неизвестная команда мессенджера.');
    verifyChat(args);
    if (typeof args.text !== 'string' || !args.text.trim()) throw new Error('Сообщение пустое.');
    const editor = find(args.target);
    if (!editor.isContentEditable && !(editor instanceof HTMLTextAreaElement)) throw new Error('Выбери поле сообщения, а не поиск.');
    const label = ['aria-label', 'placeholder', 'data-placeholder'].map(name => editor.getAttribute(name) || '').join(' ');
    if (/search|поиск|іздеу/i.test(label) || editor.closest('[role="search"]')) throw new Error('Выбрано поле поиска. Найди поле сообщения в открытом чате.');
    const url = location.href;
    if (args.action === 'draft') {
      const result = await window.MOOTEditor.write(editor, args.text);
      verifyChat(args);
      if (location.href !== url) throw new Error('Чат изменился во время ввода. Проверь черновик.');
      return { status: 'draft', ...result, sent: false };
    }
    if (window.MOOTEditor.read(editor) !== window.MOOTEditor.normalize(args.text)) throw new Error('Текст в поле не совпадает с отправляемым. Сначала проверь или создай черновик.');
    const list = find(args.messageListTarget);
    if (list.contains(editor) || editor.contains(list)) throw new Error('Выбери список сообщений отдельно от поля ввода.');
    const count = messageCount(list, normalize(args.text));
    verifyChat(args);
    if (args.sendTarget) {
      const button = find(args.sendTarget);
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') throw new Error('Кнопка отправки недоступна.');
    }
    if (args.action === 'validate_send') return { status: 'ready' };
    if (args.sendTarget) await window.MOOTActionExecutor.click(args.sendTarget, { highlight: false });
    else await window.MOOTActionExecutor.pressKey(args.target, 'Enter', { highlight: false });
    // Never try a second click/Enter when the first result is uncertain.
    for (let i = 0; i < 25; i++) {
      await new Promise(resolve => setTimeout(resolve, 120));
      if (location.href !== url || !list.isConnected || !editor.isConnected) break;
      try { verifyChat(args); } catch { break; }
      if (!window.MOOTEditor.read(editor).trim() && messageCount(list, normalize(args.text)) > count) {
        return { status: 'observed_in_chat', verified: true, sent: true, note: 'Новое сообщение появилось в переписке. Доставка получателю не проверялась.' };
      }
    }
    return { status: 'unconfirmed', verified: false, sent: null, note: 'Отправка выполнена один раз, но результат не подтверждён. Проверь переписку. Не отправляй повторно автоматически.' };
  }
  window.MOOTMessenger = { execute };
})();
