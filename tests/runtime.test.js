import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceActivity } from '../src/voice/voice-activity.js';
import { MutTaskLoop } from '../src/agent/task-loop.js';
import { MutOpenAIClient } from '../src/ai/openai-client.js';
import { fetchWithTimeout } from '../src/ai/request.js';

test('silence and short clicks do not submit audio; a pause ends a spoken phrase once', () => {
  const vad = new VoiceActivity();
  for (let t = 0; t < 1000; t += 40) assert.equal(vad.sample(0, t).speech, false);
  vad.sample(.05, 1000);
  assert.deepEqual(vad.sample(0, 2000), { began: false, ended: true, speech: false });
  let starts = 0;
  for (let t = 2040; t < 2440; t += 40) starts += Number(vad.sample(.05, t).began);
  assert.equal(starts, 1);
  assert.equal(vad.sample(0, 2800).ended, false);
  assert.equal(vad.sample(0, 3400).speech, true);
  assert.equal(vad.sample(0, 3500).ended, false);
});

test('long speech is bounded so recordings cannot grow forever', () => {
  const vad = new VoiceActivity({ maxMs: 1000 });
  let result;
  for (let t = 0; t <= 1000; t += 40) result = vad.sample(.1, t);
  assert.equal(result.ended, true);
  assert.equal(result.speech, true);
});

test('Stop discards a delayed model tool decision before any action', async () => {
  let resolve;
  let steps = 0;
  const loop = new MutTaskLoop({ onStep: () => steps++ });
  const running = loop.run({ decide: () => new Promise(r => { resolve = r; }) });
  await new Promise(r => setImmediate(r));
  loop.requestStop();
  resolve({ tool: { name: 'click', arguments: { selector: '#buy' } } });
  const result = await running;
  assert.equal(result.status, 'stopped');
  assert.equal(steps, 0);
});

test('invalid credentials fail once instead of spending five retries', async () => {
  let calls = 0;
  const loop = new MutTaskLoop();
  const result = await loop.run({ decide: () => { calls++; throw Object.assign(new Error('Invalid API key'), { status: 401 }); } });
  assert.equal(result.status, 'error');
  assert.equal(calls, 1);
  assert.equal(result.message, 'Invalid API key');
});

test('API uses one tool per step, preserves optional parameters and forwards abort', async t => {
  const client = new MutOpenAIClient({ apiKey: 'test-only' });
  const controller = new AbortController();
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = options;
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Привет' }] }] });
  });
  const result = await client.decide({
    userMessage: 'Привет', conversation: [{ role: 'user', content: 'Привет' }],
    forceModel: 'test-model', signal: controller.signal,
    tools: [{ type: 'function', name: 'read_page', parameters: { type: 'object', properties: { limit: { type: 'number' } } } }],
  });
  const body = JSON.parse(request.body);
  assert.equal(body.parallel_tool_calls, false);
  assert.equal(body.tools[0].strict, false);
  assert.equal(body.input.length, 1);
  assert.equal(result.text, 'Привет');
  t.mock.method(globalThis, 'fetch', (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')));
  }));
  const pending = client.decide({ userMessage: 'go', forceModel: 'test', signal: controller.signal });
  await new Promise(r => setImmediate(r));
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('timeout covers a stalled response body', async t => {
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => ({
    arrayBuffer: () => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
  }));
  await assert.rejects(fetchWithTimeout('https://test.invalid', {}, 10), /Сервер не ответил/);
});
