import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudio extends EventTarget {
  constructor() { super(); this.paused = true; this.src = ''; }
  pause() { this.paused = true; }
  load() {}
  removeAttribute() { this.src = ''; }
  async play() { this.paused = false; this.dispatchEvent(new Event('play')); }
}
globalThis.Audio = FakeAudio;
const { MutVoiceController } = await import('../src/voice/voice-controller.js');
const { speech } = await import('../src/ai/speech.js');
const { voicePlayer } = await import('../src/voice/voice-player.js');
const { LiveConversation } = await import('../src/voice/live-conversation.js');
const { microphone } = await import('../src/voice/microphone.js');
const { openAI } = await import('../src/ai/openai-client.js');
const { transcription } = await import('../src/ai/transcription.js');

test('stopping during speech generation prevents late playback', async t => {
  const controller = new MutVoiceController();
  let generated;
  let played = 0;
  t.mock.method(speech, 'generate', () => new Promise(resolve => { generated = resolve; }));
  t.mock.method(voicePlayer, 'play', async () => { played++; });
  const pending = controller.speak('Old response');
  await new Promise(r => setImmediate(r));
  await controller.stopSpeaking();
  generated({ blob: new Blob(['fake']), mimeType: 'audio/mpeg' });
  await pending;
  assert.equal(played, 0);
  assert.equal(controller.getState().speaking, false);
});

class FakeRecorder extends EventTarget {
  static isTypeSupported() { return true; }
  constructor() { super(); this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  start() { this.state = 'recording'; this.ondataavailable({ data: new Blob(['voice']) }); }
  stop() { this.state = 'inactive'; queueMicrotask(() => this.dispatchEvent(new Event('stop'))); }
}
class FakeContext {
  constructor() { this.state = 'running'; }
  async resume() {}
  async close() { this.state = 'closed'; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(samples) { samples.fill(0); } }; }
}
function setup(t) {
  t.mock.property(globalThis, 'MediaRecorder', FakeRecorder);
  t.mock.property(globalThis, 'AudioContext', FakeContext);
  const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  t.mock.method(openAI, 'getApiKey', async () => 'fake');
  t.mock.method(microphone, 'getStream', async () => stream);
  t.mock.method(microphone, 'stop', async () => track.stop());
  return { stream, track };
}
// Define the browser globals before replacing them using test mocks.
globalThis.MediaRecorder = FakeRecorder;
globalThis.AudioContext = FakeContext;

test('automatic segment delivers transcript and starts listening again', async t => {
  const { track } = setup(t);
  const transcripts = [];
  const live = new LiveConversation({ onTranscript: text => transcripts.push(text), onState() {}, onError: error => { throw error; } });
  t.mock.method(transcription, 'transcribeRecording', async () => ({ text: 'Открой страницу' }));
  await live.start();
  await live.finishSegment(true);
  assert.deepEqual(transcripts, ['Открой страницу']);
  assert.equal(live.segment.recorder.state, 'recording');
  await live.stop();
  assert.equal(track.readyState, 'ended');
  assert.equal(live.segment, null);
});

test('ending a call drops transcription that arrives after stop', async t => {
  setup(t);
  const transcripts = [];
  let transcribed;
  t.mock.method(transcription, 'transcribeRecording', () => new Promise(resolve => { transcribed = resolve; }));
  const live = new LiveConversation({ onTranscript: text => transcripts.push(text), onState() {}, onError: error => { throw error; } });
  await live.start();
  const pending = live.finishSegment(true);
  await new Promise(r => setImmediate(r));
  await live.stop();
  transcribed({ text: 'Late command' });
  await pending;
  assert.deepEqual(transcripts, []);
  assert.equal(live.segment, null);
});
