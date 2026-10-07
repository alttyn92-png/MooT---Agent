import { microphone } from './microphone.js';
import { transcription } from '../ai/transcription.js';
import { openAI } from '../ai/openai-client.js';
import { VoiceActivity } from './voice-activity.js';

export class LiveConversation {
  constructor({ onTranscript, onSpeechStart, onState, onError }) {
    Object.assign(this, { onTranscript, onSpeechStart, onState, onError });
    this.active = false;
    this.epoch = 0;
    this.detector = new VoiceActivity();
  }
  async start() {
    if (this.active) return;
    this.active = true;
    const epoch = ++this.epoch;
    this.onState('connecting');
    try {
      await openAI.getApiKey();
      if (!this.active || epoch !== this.epoch) return;
      const stream = await microphone.getStream();
      if (!this.active || epoch !== this.epoch) { stream.getTracks().forEach(t => t.stop()); return; }
      this.context = new AudioContext();
      await this.context.resume();
      if (!this.active || epoch !== this.epoch) return;
      this.source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);
      this.samples = new Float32Array(this.analyser.fftSize);
      stream.getAudioTracks()[0].onended = () => this.fail(new Error('Микрофон отключён. Подключи его и включи разговор снова.'));
      this.beginSegment(stream);
      this.timer = setInterval(() => this.tick(), 40);
      this.onState('listening');
    } catch (error) { await this.fail(error); }
  }
  beginSegment(stream = this.stream) {
    this.stream = stream;
    this.detector.reset();
    this.segmentStarted = performance.now();
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onerror = e => this.fail(e.error || new Error('Не удалось записать голос.'));
    this.segment = { recorder, chunks };
    recorder.start(200);
  }
  tick() {
    if (!this.active || this.transcribing || !this.segment) return;
    try {
      this.analyser.getFloatTimeDomainData(this.samples);
      const level = Math.sqrt(this.samples.reduce((sum, n) => sum + n * n, 0) / this.samples.length);
      const now = performance.now();
      const event = this.detector.sample(level, now);
      if (event.began) {
        this.onState('hearing');
        Promise.resolve(this.onSpeechStart?.()).catch(e => this.fail(e));
      }
      if (event.ended) void this.finishSegment(event.speech);
      else if (this.detector.started === null && now - this.segmentStarted > 3000) void this.finishSegment(false);
    } catch (error) { void this.fail(error); }
  }
  async finishSegment(send) {
    const segment = this.segment;
    if (!segment) return;
    this.segment = null;
    const epoch = this.epoch;
    try {
      await new Promise((resolve, reject) => {
        segment.recorder.addEventListener('stop', resolve, { once: true });
        segment.recorder.addEventListener('error', reject, { once: true });
        segment.recorder.stop();
      });
      if (!this.active || epoch !== this.epoch) return;
      if (send) {
        this.transcribing = true;
        this.transcriptionAbort = new AbortController();
        this.onState('transcribing');
        const blob = new Blob(segment.chunks, { type: segment.recorder.mimeType });
        const result = await transcription.transcribeRecording({ blob, mimeType: blob.type }, {
          prompt: 'Conversation with MOOT. Russian, Kazakh or English. Preserve the language and names.',
          timeout: 30000,
          signal: this.transcriptionAbort.signal,
        });
        if (!this.active || epoch !== this.epoch) return;
        if (result.text.trim()) {
          // Capture the next utterance while the agent executes this one.
          Promise.resolve(this.onTranscript(result.text)).catch(e => this.fail(e));
        }
      }
      if (this.active && epoch === this.epoch) {
        this.transcribing = false;
        this.beginSegment();
        this.onState('listening');
      }
    } catch (error) { if (epoch === this.epoch) await this.fail(error); }
  }
  async stop() {
    this.active = false;
    ++this.epoch;
    this.transcriptionAbort?.abort();
    clearInterval(this.timer);
    const segment = this.segment;
    this.segment = null;
    if (segment?.recorder.state === 'recording') segment.recorder.stop();
    this.source?.disconnect();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') await context.close();
    await microphone.stop();
    this.transcribing = false;
    this.onState('off');
  }
  async fail(error) {
    await this.stop();
    this.onError(error);
  }
}
