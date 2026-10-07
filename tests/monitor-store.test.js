import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorEntries, monitorCollection } from '../src/background/monitor-store.js';

test('single-chat migration retains pending messages and uncertain action journal', () => {
  const old = { id: 'a', enabled: true, queue: [{ id: 'message' }], inFlight: 'message', status: 'acting' };
  const state = monitorCollection([...monitorEntries(old), { id: 'b', enabled: true, status: 'waiting' }]);
  assert.equal(state.monitors.length, 2);
  assert.deepEqual(state.monitors[0], old);
});

test('stopping one observer preserves others and aggregate state', () => {
  const state = monitorCollection([{ id: 'a', enabled: false, status: 'stopped' }, { id: 'b', enabled: true, status: 'thinking' }]);
  assert.equal(state.enabled, true);
  assert.equal(state.id, 'b');
  assert.equal(state.status, 'thinking');
  assert.equal(monitorCollection(state.monitors.map(item => ({ ...item, enabled: false }))).status, 'stopped');
});
