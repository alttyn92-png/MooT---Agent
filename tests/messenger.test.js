import test from 'node:test';
import assert from 'node:assert/strict';
import { messengerTool } from '../src/tools/messenger.js';

test('same task cannot send the same message twice, including concurrent calls', async t => {
  const previous = globalThis.chrome;
  t.after(() => { globalThis.chrome = previous; });
  let calls = 0;
  const cache = {};
  globalThis.chrome = {
    tabs: { query: async () => [{ id: 7 }] },
    storage: {
      local: { get: async () => ({ mutState: { currentTaskId: 'task-1' } }) },
      session: { get: async key => ({ [key]: cache[key] }), set: async values => Object.assign(cache, values) },
    },
    runtime: { sendMessage: async message => { if (message.payload.command.args.action === 'send') calls++; return { success: true, response: { success: true, messenger: { status: 'observed_in_chat', sent: true } } }; } },
  };
  const args = { action: 'send', text: 'Тест', expectedChat: 'Test' };
  await Promise.all([messengerTool(args), messengerTool(args)]);
  assert.equal(calls, 1);
  assert.equal((await messengerTool(args)).duplicatePrevented, true);
  assert.equal(calls, 1);
});

test('lost send response is not replayed', async t => {
  const previous = globalThis.chrome;
  t.after(() => { globalThis.chrome = previous; });
  const cache = {};
  let calls = 0;
  globalThis.chrome = {
    tabs: { query: async () => [{ id: 9 }] },
    storage: {
      local: { get: async () => ({ mutState: { currentTaskId: 'task-2' } }) },
      session: { get: async key => ({ [key]: cache[key] }), set: async values => Object.assign(cache, values) },
    },
    runtime: { sendMessage: async message => {
      if (message.payload.command.args.action === 'validate_send') return { success: true, response: { success: true, messenger: { status: 'ready' } } };
      calls++; throw new Error('Connection closed');
    } },
  };
  const args = { action: 'send', text: 'Тест', expectedChat: 'Test' };
  assert.equal((await messengerTool(args)).status, 'unconfirmed');
  assert.equal((await messengerTool(args)).duplicatePrevented, true);
  assert.equal(calls, 1);
});
