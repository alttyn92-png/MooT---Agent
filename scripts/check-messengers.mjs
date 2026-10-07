import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const extension = resolve(process.env.MOOT_EXTENSION_DIR || '.');
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'moot-messengers-')), {
  headless: true, channel: 'chromium',
  ...(process.env.MOOT_BROWSER_EXECUTABLE ? { executablePath: process.env.MOOT_BROWSER_EXECUTABLE } : {}),
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${id}/src/sidepanel/index.html`);
  for (const [host, app, editor] of [
    ['web.whatsapp.com', 'WhatsApp Web', '<div id="editor" role="textbox" contenteditable="true"><p><br></p></div>'],
    ['web.telegram.org', 'Telegram Web', '<div id="editor" class="input-message-input" contenteditable="true"><br></div>'],
    ['discord.com', 'Discord Web', '<div id="editor" role="textbox" contenteditable="true" data-slate-editor="true"><div data-slate-node="element"><span data-slate-node="text"><span data-slate-string="true"></span></span></div></div>'],
  ]) {
    await context.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta charset="utf-8"><style>[contenteditable]{min-height:45px;border:1px solid}#log{min-height:20px}</style>
      <button id="chat">Тестовый контакт</button><button id="other">Другой чат</button><header><h1 id="heading">Выбери чат</h1></header>
      <input id="search" placeholder="Поиск"><div id="log" role="log"></div>${editor}<button id="send" aria-label="Отправить">Отправить</button>
      <div id="scroll-panel" style="height:40px;overflow:auto"><div style="height:400px">История</div></div>
      <button class="duplicate">Одинаковый</button><button class="duplicate">Одинаковый</button>
      <script>
      window.sent = 0; window.draft = ''; window.inputEvents = 0;
      const editor = document.querySelector('#editor');
      document.querySelector('#chat').onclick=()=>document.querySelector('#heading').textContent='Тестовый контакт';
      document.querySelector('#other').onclick=()=>document.querySelector('#heading').textContent='Другой чат';
      editor.addEventListener('input',()=>{window.draft=editor.innerText;window.inputEvents++});
      function send(){if(!window.draft.trim() || window.blockSend)return;const node=document.createElement('p');node.textContent=window.draft;document.querySelector('#log').append(node);editor.replaceChildren();window.draft='';window.sent++}
      document.querySelector('#send').onclick=send;
      editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
      </script>` }));
    const site = await context.newPage();
    await site.goto(`https://${host}/moot-fixture`);
    const tabId = await worker.evaluate(async host => (await chrome.tabs.query({ url: `https://${host}/*` }))[0].id, host);
    const command = args => panel.evaluate(async ({ tabId, args }) => {
      const result = await chrome.runtime.sendMessage({ type: 'SEND_TO_PAGE', payload: { tabId, command: { type: 'MESSENGER', args } } });
      if (!result.success || !result.response.success) throw new Error(result.error || result.response.error);
      return result.response.messenger;
    }, { tabId, args });
    assert.equal((await command({ action: 'inspect' })).app, app);
    await command({ action: 'open_chat', target: { selector: '#chat' } });
    const args = { target: { selector: '#editor' }, chatTarget: { selector: '#heading' }, expectedChat: 'Тестовый контакт', messageListTarget: { selector: '#log' }, text: 'Привет, MOOT! 👋\nВторая строка — қазақша.' };
    assert.equal((await command({ ...args, action: 'draft', text: '\n👋\n\nКонец\n' })).verified, true);
    await site.locator('#editor').evaluate(el => el.setAttribute('aria-readonly', 'true'));
    await assert.rejects(command({ ...args, action: 'draft' }), /недоступно/);
    await site.locator('#editor').evaluate(el => el.removeAttribute('aria-readonly'));
    assert.equal((await command({ ...args, action: 'draft' }).catch(async error => {
      console.log(await site.locator('#editor').evaluate(el => ({ text: el.innerText, html: el.innerHTML })));
      throw error;
    })).verified, true);
    assert.equal(await site.evaluate(() => window.inputEvents > 0), true);
    assert.equal((await command({ ...args, action: 'send', ...(app !== 'Discord Web' ? { sendTarget: { selector: '#send' } } : {}) })).sent, true);
    assert.equal(await site.evaluate(() => window.sent), 1);
    const scrollResult = await panel.evaluate(async tabId => chrome.runtime.sendMessage({
      type: 'SEND_TO_PAGE', payload: { tabId, command: { type: 'EXECUTE_ACTION', action: { type: 'scroll', options: { target: { selector: '#scroll-panel' }, direction: 'down', amount: 100 } } } },
    }), tabId);
    assert.equal(scrollResult.success, true);
    assert.equal(await site.locator('#scroll-panel').evaluate(el => el.scrollTop), 100);
    await assert.rejects(command({ ...args, action: 'send' }), /не совпадает/);
    await assert.rejects(command({ ...args, action: 'draft', expectedChat: 'Другой получатель' }), /другой чат/);
    await assert.rejects(command({ action: 'open_chat', target: { text: 'Не существует', role: 'button' } }), /не найден|not found/);
    await assert.rejects(command({ action: 'open_chat', target: { selector: '.duplicate' } }), /несколько/);
    // A blocked send stays unconfirmed and does not fall back to another click.
    await command({ ...args, action: 'draft' });
    await site.evaluate(() => window.blockSend = true);
    assert.equal((await command({ ...args, action: 'send', sendTarget: { selector: '#send' } })).status, 'unconfirmed');
    assert.equal(await site.evaluate(() => window.sent), 1);
    console.log(`PASS ${app}: chat, editor input events, multiline/emoji, send, wrong recipient, missing/ambiguous target, unconfirmed send.`);
    await site.close();
  }
} finally { await context.close(); }
