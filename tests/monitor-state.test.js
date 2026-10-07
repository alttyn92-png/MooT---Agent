import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverMessages, parseMonitorPlan } from '../src/background/monitor-state.js';

test('idle monitor does not queue old history; outgoing and own echoes are skipped', () => {
  const state = { seen: ['1'], queue: [], echoes: [{ text: 'Ответ', until: 5000 }] };
  const rows = [{ id: '1', text: 'Старое' }, { id: '2', text: 'Новое' }, { id: '3', text: 'Моё', outgoing: true }, { id: '4', text: 'Ответ' }];
  const next = discoverMessages(state, rows, 1000);
  assert.deepEqual(next.queue.map(m => m.id), ['2']);
  assert.equal(discoverMessages({ ...state, ...next, queue: [] }, rows, 1001).queue.length, 0);
});
test('queue survives another snapshot while a reply is being generated', () => {
  const state = { seen: ['1', '2'], queue: [{ id: '2', text: 'Первое' }] };
  const next = discoverMessages(state, [{ id: '2', text: 'Первое' }, { id: '3', text: 'Второе' }]);
  assert.deepEqual(next.queue.map(m => m.id), ['2', '3']);
});
test('replaced/virtualized history and startup warmup do not trigger replies', () => {
  const rows = [{ id: 'old', text: 'Сообщение из истории' }];
  assert.equal(discoverMessages({ seen: ['new'] }, rows).queue.length, 0);
  assert.equal(discoverMessages({ seen: [], warmupUntil: 2000 }, rows, 1000).queue.length, 0);
});
test('only bounded configured plans are accepted', () => {
  assert.equal(parseMonitorPlan('{"type":"reply","text":"Привет"}', false).type, 'reply');
  assert.throws(() => parseMonitorPlan('{"type":"action","action":{"type":"click"}}', false));
  assert.throws(() => parseMonitorPlan('{"type":"action","action":{"type":"pressKey"}}', true));
  assert.throws(() => parseMonitorPlan('{"type":"reply","text":""}', true));
});
test('full queue does not mark deferred messages as processed', () => {
  const state = { seen: ['base'], queue: Array.from({ length: 100 }, (_, i) => ({ id: `pending-${i}` })) };
  const rows = [{ id: 'base', text: 'old' }, { id: 'new', text: 'new' }];
  const next = discoverMessages(state, rows);
  assert.equal(next.seen.includes('new'), false);
  const after = discoverMessages({ ...next, queue: next.queue.slice(1) }, rows);
  assert.equal(after.queue.at(-1).id, 'new');
});
