import { chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const extension = resolve(process.env.MOOT_EXTENSION_DIR || 'dist');
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'moot-monitor-')), {
  channel: 'chromium', headless: true,
  ...(process.env.MOOT_BROWSER_EXECUTABLE ? { executablePath: process.env.MOOT_BROWSER_EXECUTABLE } : {}),
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await panel.waitForFunction(() => window.MOOTApp?.components?.header);
  // Model stub runs inside the test worker. No real requests or account messages.
  await worker.evaluate(() => {
    self.modelCalls = 0;
    self.fetch = async (url, options) => {
      self.modelCalls++;
      if (self.holdModel) await new Promise(resolve => self.releaseModel = resolve);
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ type: 'reply', text: 'Тестовый автоответ ' + self.modelCalls }) }] }] });
    };
  });
  await context.route(/^https:\/\/(web\.whatsapp\.com|web\.telegram\.org|discord\.com)\//, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta charset="utf-8"><style>#editor{min-height:40px}#log{min-height:50px}</style>
  <header><h1 id="heading">Тестовый чат</h1></header><div id="log" role="log"><p id="old">Старое сообщение</p></div><div id="editor" contenteditable="true"></div><button id="send">Отправить</button>
  <script>window.sent=0;document.querySelector('#send').onclick=()=>{const editor=document.querySelector('#editor');const p=document.createElement('p');p.id='out-'+(++window.sent);p.className='message-out';p.textContent=editor.innerText;document.querySelector('#log').append(p);editor.replaceChildren()};</script>` }));
  const site = await context.newPage(); await site.goto('https://web.whatsapp.com/'); await site.bringToFront();
  const start = await panel.evaluate(async () => {
    const { mutSettings = {} } = await chrome.storage.local.get('mutSettings');
    await chrome.storage.local.set({ mutSettings: { ...mutSettings, openai: { apiKey: 'fixture-only' } } });
    return chrome.runtime.sendMessage({ type: 'MONITOR_START', payload: {
      instruction: 'Отвечай на новые сообщения коротким приветствием. Не отвечай на старые и свои сообщения.', expectedChat: 'Тестовый чат',
      chatTarget: { selector: '#heading' }, messageListTarget: { selector: '#log' }, composerTarget: { selector: '#editor' }, sendTarget: { selector: '#send' },
      messageSelector: 'p', idAttribute: 'id', outgoingSelector: '.message-out',
    } });
  });
  assert.equal(start.success, true, JSON.stringify(start));
  await panel.getByText('Тестовый чат · Жду новые сообщения', { exact: true }).waitFor();
  assert.equal(await worker.evaluate(() => self.modelCalls), 0);
  const add = (id, text) => site.evaluate(({ id, text }) => { const p=document.createElement('p'); p.id=id; p.textContent=text; document.querySelector('#log').append(p); }, { id, text });
  // Closing the panel must not cancel the persisted task.
  await panel.close();
  await add('incoming-1', 'Привет');
  await site.waitForFunction(() => window.sent === 1, { timeout: 15000 });
  await add('incoming-2', 'Как дела?');
  await site.waitForFunction(() => window.sent === 2, { timeout: 15000 });
  assert.equal(await worker.evaluate(() => self.modelCalls), 2);
  const control = await context.newPage();
  await control.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await control.waitForFunction(() => window.MOOTApp?.components?.header);
  await control.evaluate(async () => {
    const { mutSettings } = await chrome.storage.local.get('mutSettings');
    await chrome.storage.local.set({ mutSettings: { ...mutSettings, openai: { apiKey: 'fixture-only' } } });
  });
  await control.waitForFunction(async () => {
    const { monitor } = await chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' });
    return monitor.monitors.every(item => !item.inFlight && item.queue.length === 0);
  });
  // No replay after a fresh controller instance sees an unfinished journal entry.
  await control.evaluate(async () => {
    const { mootMonitor } = await chrome.storage.local.get('mootMonitor');
    const monitors = mootMonitor.monitors.map((item, index) => index ? item : { ...item, inFlight: 'interrupted', queue: [{ id: 'interrupted', text: 'Already attempted' }] });
    await chrome.storage.local.set({ mootMonitor: { ...mootMonitor, monitors } });
    const fresh = await import(chrome.runtime.getURL('src/background/monitor-controller.js') + '?restart-fixture');
    await fresh.monitorTick();
  });
  assert.equal(await site.evaluate(() => window.sent), 2);
  // Three independent services; a foreground task keeps its full browser access.
  const extraSites = [];
  const extraIds = [];
  for (const url of ['https://web.telegram.org/k/', 'https://discord.com/channels/@me']) {
    const other = await context.newPage(); await other.goto(url); await other.bringToFront();
    const added = await control.evaluate(async () => {
      const { mootMonitor } = await chrome.storage.local.get('mootMonitor');
      return chrome.runtime.sendMessage({ type: 'MONITOR_START', payload: mootMonitor.monitors[0].config });
    });
    assert.equal(added.success, true, JSON.stringify(added));
    extraSites.push(other); extraIds.push(added.monitor.id);
  }
  const status = await control.evaluate(() => chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' }));
  assert.equal(status.monitor.monitors.filter(item => item.enabled).length, 3);
  await control.evaluate(() => chrome.runtime.sendMessage({ type: 'SET_MOOT_STATE', payload: { running: true } }));
  for (const other of extraSites) await other.evaluate(() => {
    const p = document.createElement('p'); p.id = 'while-busy'; p.textContent = 'Новое сообщение'; document.querySelector('#log').append(p);
  });
  // A real foreground draft/send to Telegram succeeds while all observers remain enabled.
  const telegramId = status.monitor.monitors[1].tabId;
  const send = await control.evaluate(async tabId => {
    const { mootMonitor } = await chrome.storage.local.get('mootMonitor');
    const config = mootMonitor.monitors[1].config;
    const command = { type: 'MESSENGER', args: { ...config, target: config.composerTarget, text: 'Сводка из WhatsApp', action: 'draft' } };
    const draft = await chrome.runtime.sendMessage({ type: 'SEND_TO_PAGE', payload: { tabId, command } });
    if (!draft.response?.success) return draft;
    command.args.action = 'send';
    return chrome.runtime.sendMessage({ type: 'SEND_TO_PAGE', payload: { tabId, command } });
  }, telegramId);
  assert.equal(send.response?.success, true, JSON.stringify(send));
  assert.equal(await extraSites[0].locator('#log').innerText().then(text => text.includes('Сводка из WhatsApp')), true);
  // Trigger an explicit scan and ensure notifications queue without auto-sending during foreground work.
  await extraSites[0].evaluate(() => document.querySelector('#log').append(document.createTextNode(' ')));
  await control.waitForFunction(async () => {
    const r = await chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' });
    return r.monitor.monitors.slice(1).every(item => item.queue.length === 1 && item.status === 'waiting_agent');
  }).catch(async error => { console.error(JSON.stringify(await control.evaluate(() => chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' })))); throw error; });
  assert.equal(await extraSites[0].evaluate(() => window.sent), 1);
  assert.equal(await extraSites[1].evaluate(() => window.sent), 0);
  await control.evaluate(() => chrome.runtime.sendMessage({ type: 'SET_MOOT_STATE', payload: { running: false } }));
  await extraSites[0].waitForFunction(() => window.sent === 2).catch(async error => { console.error(JSON.stringify(await control.evaluate(() => chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' })))); throw error; });
  await extraSites[1].waitForFunction(() => window.sent === 1);
  const stoppedOne = await control.evaluate(id => chrome.runtime.sendMessage({ type: 'MONITOR_STOP', payload: { id } }), extraIds[0]);
  assert.equal(stoppedOne.monitor.monitors.filter(item => item.enabled).length, 2);
  assert.equal(await worker.evaluate(async () => Boolean(await chrome.alarms.get('moot-monitor'))), true);
  for (const other of extraSites) await other.evaluate(() => {
    const p = document.createElement('p'); p.id = 'after-one-stopped'; p.textContent = 'Ещё вопрос'; document.querySelector('#log').append(p);
  });
  await extraSites[1].waitForFunction(() => window.sent === 2);
  assert.equal(await extraSites[0].evaluate(() => window.sent), 2, 'stopped Telegram must stay stopped while Discord replies');
  await worker.evaluate(() => { self.holdModel = true; });
  await add('incoming-3', 'Ответь после паузы');
  await control.waitForFunction(async () => { const r = await chrome.runtime.sendMessage({ type: 'MONITOR_STATUS' }); return r.monitor.status === 'thinking'; });
  await control.evaluate(async () => {
    await chrome.runtime.sendMessage({ type: 'MONITOR_STOP' });
  });
  await worker.evaluate(() => { self.releaseModel?.(); });
  await add('incoming-4', 'После стопа');
  const reopened = await context.newPage();
  await reopened.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await reopened.waitForFunction(() => window.MOOTApp?.monitorState?.status === 'stopped');
  assert.equal(await site.evaluate(() => window.sent), 2);
  assert.equal(await worker.evaluate(async () => Boolean(await chrome.alarms.get('moot-monitor'))), false);
  console.log('PASS: three services, queued events during foreground work, automatic resume, individual stop, panel closed, baseline, outgoing ignored, uncertain action not replayed, Stop during model request, alarm cleared.');
} finally { await context.close(); }
