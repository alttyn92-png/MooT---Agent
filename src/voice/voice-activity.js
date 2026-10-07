// Pure endpoint detector; independent of browser audio and network APIs.
export class VoiceActivity {
  constructor({ threshold = 0.018, silenceMs = 850, minSpeechMs = 180, maxMs = 20000 } = {}) {
    Object.assign(this, { threshold, silenceMs, minSpeechMs, maxMs });
    this.reset();
  }
  reset() { this.started = null; this.lastVoice = null; this.voicedMs = 0; this.previous = null; this.confirmed = false; }
  sample(level, now) {
    const elapsed = this.previous === null ? 0 : Math.min(100, now - this.previous);
    this.previous = now;
    let began = false;
    if (level >= this.threshold) {
      this.started ??= now;
      this.lastVoice = now;
      this.voicedMs += elapsed;
      if (!this.confirmed && this.voicedMs >= this.minSpeechMs) {
        this.confirmed = true;
        began = true;
      }
    }
    const ended = this.started !== null &&
      (now - this.lastVoice >= this.silenceMs || now - this.started >= this.maxMs);
    const speech = this.confirmed;
    if (ended) this.reset();
    return { began, ended, speech };
  }
}
