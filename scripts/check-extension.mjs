import { chromium } from '@playwright/test';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const extension = resolve(process.env.MOOT_EXTENSION_DIR || 'dist');
const profile = mkdtempSync(join(tmpdir(), 'moot-check-'));
mkdirSync('artifacts', { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true,
  ...(process.env.MOOT_BROWSER_EXECUTABLE ? { executablePath: process.env.MOOT_BROWSER_EXECUTABLE } : {}),
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  viewport: { width: 400, height: 900 },
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`chrome-extension://${id}/src/sidepanel/index.html`);
  await page.getByRole('heading', { name: 'Давай сделаем это вместе.' }).waitFor();
  await page.screenshot({ path: 'artifacts/moot-desktop.png' });
  for (const width of [320, 400, 600]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
  }
  await page.setViewportSize({ width: 400, height: 900 });
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.locator('[data-mut-setting-api-key]').fill('test-only');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByText('Сохранено', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  let requests = 0;
  await context.route('https://api.openai.com/v1/responses', async route => {
    requests++;
    await route.fulfill({ json: { output: [{ type: 'message', content: [{ type: 'output_text', text: 'Привет! Я MOOT. Чем займёмся?' }] }] } });
  });
  await page.getByRole('textbox', { name: 'Сообщение MOOT' }).fill('Привет');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await page.getByText('Привет! Я MOOT. Чем займёмся?', { exact: true }).waitFor();
  assert.equal(requests, 1);
  await page.screenshot({ path: 'artifacts/moot-chat.png' });
  await page.reload();
  await page.getByText('Привет! Я MOOT. Чем займёмся?', { exact: true }).waitFor();
  assert.equal(await page.locator('.mut-message').count(), 2);
  await page.getByRole('button', { name: 'Начать голосовой разговор', exact: true }).click();
  await page.getByText('Слушаю · можно говорить', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/moot-voice.png' });
  await context.route('https://api.openai.com/v1/audio/transcriptions', route => route.fulfill({ json: { text: 'Это голосовая команда' } }));
  await context.route('https://api.openai.com/v1/audio/speech', route => {
    // A short PCM WAV so real browser audio playback can be exercised offline.
    const wav = Buffer.alloc(44 + 1600);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(1600, 40);
    return route.fulfill({ contentType: 'audio/wav', body: wav });
  });
  await page.waitForFunction(() => window.MOOTApp.live.segment?.chunks.length > 0);
  await page.evaluate(() => window.MOOTApp.live.finishSegment(true));
  await page.getByText('Это голосовая команда', { exact: true }).waitFor({ timeout: 10000 }).catch(async error => {
    console.log(await page.locator('body').innerText());
    throw error;
  });
  await page.waitForFunction(() => !window.MOOTApp.busy);
  assert.equal(await page.locator('.mut-message--user').count(), 2);
  assert.equal(await page.locator('.mut-message--assistant').count(), 2);
  await page.getByRole('button', { name: 'Завершить голосовой разговор', exact: true }).click();
  await page.getByRole('button', { name: 'Начать голосовой разговор', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.MOOTApp.live.active), false);
  assert.equal(await page.evaluate(() => window.MOOTApp.live.stream.getTracks().every(track => track.readyState === 'ended')), true);
  await context.unroute('https://api.openai.com/v1/responses');
  let requested;
  const started = new Promise(resolve => { requested = resolve; });
  await context.route('https://api.openai.com/v1/responses', async route => {
    requested();
    await new Promise(r => setTimeout(r, 500));
    await route.fulfill({ json: { output: [{ type: 'message', content: [{ type: 'output_text', text: 'STALE RESPONSE' }] }] } }).catch(() => {});
  });
  await page.getByRole('textbox', { name: 'Сообщение MOOT' }).fill('Долгая задача');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await started;
  await page.getByRole('button', { name: 'Остановить MOOT' }).click();
  await page.waitForFunction(() => !window.MOOTApp.busy);
  assert.equal(await page.getByText('STALE RESPONSE', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'История', exact: true }).click();
  await page.getByRole('button', { name: '+ Новый чат', exact: true }).click();
  await page.getByRole('heading', { name: 'Давай сделаем это вместе.' }).waitFor();
  await context.unroute('https://api.openai.com/v1/responses');
  await context.route('https://moot-test.example/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<meta charset="utf-8"><button id="target" onclick="this.textContent=\'Нажато\'">Тестовая кнопка</button>' }));
  const site = await context.newPage();
  await site.goto('https://moot-test.example/');
  await site.bringToFront();
  // Simulate a tab left open across an extension reload: no live receiver,
  // but the old initialization marker remains in the isolated world.
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'https://moot-test.example/*' });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      chrome.runtime.onMessage.removeListener(window.__MOOT_MESSAGE_LISTENER__);
      window.__MOOT_CONTENT_SCRIPT_LOADED__ = true;
    } });
  });
  let step = 0;
  await context.route('https://api.openai.com/v1/responses', route => {
    step++;
    const output = step === 1 ? [{ type: 'function_call', name: 'click', arguments: JSON.stringify({ target: { selector: '#target' } }), call_id: 'test_click' }] : [{ type: 'message', content: [{ type: 'output_text', text: 'Кнопка нажата.' }] }];
    return route.fulfill({ json: { output } });
  });
  await page.getByRole('textbox', { name: 'Сообщение MOOT' }).fill('Нажми тестовую кнопку');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await page.getByText('Кнопка нажата.', { exact: true }).waitFor();
  assert.equal(await site.locator('#target').textContent(), 'Нажато');
  assert.deepEqual(errors, []);
  const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
  assert.equal(manifest.short_name, 'MOOT');
  console.log('PASS: extension startup, 3 panel widths, settings, chat, persistence, microphone lifecycle, voice transcript → agent → speech, Stop, new chat, missing receiver recovery and browser click; no page errors.');
} finally { await context.close(); }
