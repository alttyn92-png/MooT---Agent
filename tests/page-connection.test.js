import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePageConnection, sendPageCommand } from '../src/background/page-connection.js';

function setup(t, sendMessage) {
  const previous = globalThis.chrome;
  let injections = 0;
  globalThis.chrome = {
    tabs: { get: async id => ({ id, url: 'https://example.com' }), sendMessage },
    scripting: { executeScript: async ({ files, target }) => {
      injections++;
      assert.equal(files.at(-1), 'src/content/content-script.js');
      assert.deepEqual(target.frameIds, [0]);
    } },
  };
  t.after(() => { globalThis.chrome = previous; });
  return () => injections;
}

test('an existing receiver needs no injection', async t => {
  const count = setup(t, async () => ({ type: 'PONG_PAGE' }));
  await ensurePageConnection(1);
  assert.equal(count(), 0);
});

test('concurrent requests recover an old tab with one injection', async t => {
  let ready = false;
  const count = setup(t, async () => {
    if (!ready) { ready = true; throw new Error('Could not establish connection. Receiving end does not exist.'); }
    return { type: 'PONG_PAGE' };
  });
  await Promise.all([ensurePageConnection(2), ensurePageConnection(2), ensurePageConnection(2)]);
  assert.equal(count(), 1);
});

test('a closed port never replays an action that could already have succeeded', async t => {
  let actions = 0;
  const count = setup(t, async (id, message) => {
    if (message.type === 'PING_PAGE') return { type: 'PONG_PAGE' };
    actions++;
    throw new Error('The message port closed before a response was received.');
  });
  await assert.rejects(sendPageCommand(3, { type: 'EXECUTE_ACTION' }), /message port closed/);
  assert.equal(actions, 1);
  assert.equal(count(), 0);
});

test('restricted pages are rejected before injection', async t => {
  const count = setup(t, () => { throw new Error('Must not send'); });
  chrome.tabs.get = async id => ({ id, url: 'chrome://extensions' });
  await assert.rejects(ensurePageConnection(4), /браузер запрещает/);
  assert.equal(count(), 0);
});

test('permission failures provide a useful error and allow a later retry', async t => {
  setup(t, async () => { throw new Error('Receiving end does not exist.'); });
  chrome.scripting.executeScript = async () => { throw new Error('Cannot access contents of the page'); };
  await assert.rejects(ensurePageConnection(5), /Проверь доступ/);
  chrome.tabs.sendMessage = async () => ({ type: 'PONG_PAGE' });
  assert.equal((await ensurePageConnection(5)).type, 'PONG_PAGE');
});
