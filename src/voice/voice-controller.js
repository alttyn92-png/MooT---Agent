/**
 * MOOT VOICE CONTROLLER
 *
 * Связывает всю голосовую систему:
 *
 * Microphone
 *     ↓
 * Recorder
 *     ↓
 * Transcription
 *     ↓
 * MOOT Agent
 *     ↓
 * Speech
 *     ↓
 * Voice Player
 *
 * Пользователь нажимает микрофон,
 * говорит команду, отпускает/останавливает,
 * а MOOT получает её как обычное сообщение.
 */

import {
  microphone,
} from "./microphone.js";

import {
  voiceRecorder,
} from "./voice-recorder.js";

import {
  voicePlayer,
} from "./voice-player.js";

import {
  transcription,
} from "../ai/transcription.js";

import {
  speech,
} from "../ai/speech.js";

import {
  MOOT,
} from "../agent/mut-agent.js";

// =====================================================
// DEFAULT SETTINGS
// =====================================================

const DEFAULT_OPTIONS = {
  language:
    null,

  voice:
    "alloy",

  autoSpeak:
    false,

  speechSpeed:
    1,

  transcriptionPrompt:
    "The user may speak Russian, Kazakh or English. Preserve names, technical terms and commands accurately.",

  voiceInstructions:
    "Speak naturally, clearly and concisely as a helpful personal AI assistant.",
};

// =====================================================
// VOICE CONTROLLER
// =====================================================

export class MutVoiceController {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.state = {
      recording: false,

      transcribing: false,

      processing: false,

      speaking: false,

      lastTranscript: "",

      lastResponse: "",

      lastError: null,
    };

    this.listeners =
      new Map();

    this.installPlayerEvents();
  }

  // ===================================================
  // START RECORDING
  // ===================================================

  async startListening(
    options = {}
  ) {
    if (
      this.state.recording
    ) {
      return {
        recording: true,
        alreadyRecording:
          true,
      };
    }

    this.state.lastError =
      null;

    try {
      await voicePlayer.stop();

      const result =
        await voiceRecorder.start({
          deviceId:
            options.deviceId ||
            null,
        });

      this.state.recording =
        true;

      await this.emitState();

      await this.emit(
        "listening_started",
        result
      );

      return result;
    } catch (error) {
      await this.handleError(
        error
      );

      throw error;
    }
  }

  // ===================================================
  // STOP + PROCESS
  // ===================================================

  async stopListening({
    sendToMut = true,
    speakResponse = null,
  } = {}) {
    if (
      !this.state.recording
    ) {
      return null;
    }

    this.state.recording =
      false;

    await this.emitState();

    try {
      const recording =
        await voiceRecorder.stop();

      if (
        !recording?.blob ||
        recording.blob.size === 0
      ) {
        throw new Error(
          "Voice recording is empty."
        );
      }

      await this.emit(
        "recording_ready",
        {
          durationMs:
            recording.durationMs,

          size:
            recording.size,

          mimeType:
            recording.mimeType,
        }
      );

      // -----------------------------------------------
      // TRANSCRIPTION
      // -----------------------------------------------

      this.state.transcribing =
        true;

      await this.emitState();

      const transcript =
        await transcription
          .transcribeRecording(
            recording,
            {
              language:
                this.options
                  .language,

              prompt:
                this.options
                  .transcriptionPrompt,
            }
          );

      this.state.transcribing =
        false;

      this.state.lastTranscript =
        transcript.text;

      await this.emitState();

      await this.emit(
        "transcript",
        {
          text:
            transcript.text,

          transcript,
        }
      );

      if (
        !transcript.text
      ) {
        return {
          transcript:
            "",

          response:
            null,
        };
      }

      // -----------------------------------------------
      // ONLY TRANSCRIBE
      // -----------------------------------------------

      if (!sendToMut) {
        return {
          transcript:
            transcript.text,

          response:
            null,
        };
      }

      // -----------------------------------------------
      // SEND TO MOOT
      // -----------------------------------------------

      this.state.processing =
        true;

      await this.emitState();

      const mutResult =
        await MOOT.sendMessage({
          text:
            transcript.text,

          source:
            "voice",
        });

      this.state.processing =
        false;

      const responseText =
        extractMutResponse(
          mutResult
        );

      this.state.lastResponse =
        responseText;

      await this.emitState();

      await this.emit(
        "mut_response",
        {
          text:
            responseText,

          result:
            mutResult,
        }
      );

      // -----------------------------------------------
      // SPEAK RESULT
      // -----------------------------------------------

      const shouldSpeak =
        speakResponse === null
          ? this.options
              .autoSpeak
          : Boolean(
              speakResponse
            );

      if (
        shouldSpeak &&
        responseText
      ) {
        await this.speak(
          responseText
        );
      }

      return {
        transcript:
          transcript.text,

        response:
          responseText,

        result:
          mutResult,
      };
    } catch (error) {
      this.state.recording =
        false;

      this.state.transcribing =
        false;

      this.state.processing =
        false;

      await this.handleError(
        error
      );

      throw error;
    }
  }

  // ===================================================
  // CANCEL LISTENING
  // ===================================================

  async cancelListening() {
    await voiceRecorder.cancel();
    await microphone.stop();

    this.state.recording =
      false;

    this.state.transcribing =
      false;

    await this.emitState();

    await this.emit(
      "listening_cancelled",
      {
        timestamp:
          Date.now(),
      }
    );

    return {
      cancelled: true,
    };
  }

  // ===================================================
  // SPEAK
  // ===================================================

  async speak(
    text,
    options = {}
  ) {
    const content =
      String(
        text || ""
      ).trim();

    if (!content) {
      return null;
    }

    this.speechAbort?.abort();
    this.speechAbort = new AbortController();
    const generation = this.speechGeneration = (this.speechGeneration || 0) + 1;
    try {
      await voicePlayer.stop();

      this.state.speaking =
        true;

      await this.emitState();

      const audio =
        await speech.generate(
          content,
          {
            signal: this.speechAbort.signal,
            voice:
              options.voice ||
              this.options.voice,

            speed:
              options.speed ??
              this.options
                .speechSpeed,

            instructions:
              options.instructions ||
              this.options
                .voiceInstructions,

            format:
              options.format ||
              "mp3",
          }
        );

      if (generation !== this.speechGeneration) return null;
      await voicePlayer.play(
        audio.blob,
        {
          mimeType:
            audio.mimeType,

          volume:
            options.volume ??
            1,

          playbackRate:
            options.playbackRate ??
            1,
        }
      );

      this.state.speaking = true;

      await this.emit(
        "speech_started",
        {
          text:
            content,

          voice:
            audio.voice,
        }
      );

      return audio;
    } catch (error) {
      if (generation !== this.speechGeneration) return null;
      this.state.speaking =
        false;

      await this.handleError(
        error
      );

      throw error;
    }
  }

  // ===================================================
  // STOP SPEAKING
  // ===================================================

  async stopSpeaking() {
    this.speechAbort?.abort();
    this.speechGeneration = (this.speechGeneration || 0) + 1;
    await voicePlayer.stop();

    this.state.speaking =
      false;

    await this.emitState();

    return {
      stopped: true,
    };
  }

  // ===================================================
  // VOICE REPLY MODE
  // ===================================================

  setAutoSpeak(
    enabled
  ) {
    this.options.autoSpeak =
      Boolean(enabled);

    this.emitState();

    return this.options
      .autoSpeak;
  }

  toggleAutoSpeak() {
    return this.setAutoSpeak(
      !this.options
        .autoSpeak
    );
  }

  // ===================================================
  // LANGUAGE
  // ===================================================

  setLanguage(
    language
  ) {
    this.options.language =
      language
        ? String(language)
        : null;

    return this.options
      .language;
  }

  // ===================================================
  // VOICE
  // ===================================================

  setVoice(
    voice
  ) {
    if (!voice) {
      return this.options
        .voice;
    }

    this.options.voice =
      String(voice);

    speech.setVoice(
      this.options.voice
    );

    return this.options
      .voice;
  }

  // ===================================================
  // MICROPHONE DEVICES
  // ===================================================

  async listMicrophones() {
    return microphone
      .listDevices();
  }

  // ===================================================
  // STATUS
  // ===================================================

  getState() {
    return {
      ...this.state,

      autoSpeak:
        this.options
          .autoSpeak,

      voice:
        this.options.voice,

      language:
        this.options
          .language,

      microphone:
        microphone.getStatus(),

      recorder:
        voiceRecorder
          .getStatus(),

      player:
        voicePlayer
          .getStatus(),
    };
  }

  // ===================================================
  // PLAYER EVENTS
  // ===================================================

  installPlayerEvents() {
    voicePlayer.on(
      "ended",
      async () => {
        this.state.speaking =
          false;

        await this.emitState();

        await this.emit(
          "speech_ended",
          {
            timestamp:
              Date.now(),
          }
        );
      }
    );

    voicePlayer.on(
      "pause",
      async () => {
        if (
          !voicePlayer
            .getStatus()
            .playing
        ) {
          this.state.speaking =
            false;

          await this.emitState();
        }
      }
    );
  }

  // ===================================================
  // ERRORS
  // ===================================================

  async handleError(
    error
  ) {
    this.state.lastError =
      error?.message ||
      String(error);

    await this.emitState();

    await this.emit(
      "error",
      {
        error:
          this.state
            .lastError,

        timestamp:
          Date.now(),
      }
    );
  }

  // ===================================================
  // EVENTS
  // ===================================================

  on(
    event,
    listener
  ) {
    if (
      typeof listener !==
      "function"
    ) {
      return () => {};
    }

    if (
      !this.listeners.has(
        event
      )
    ) {
      this.listeners.set(
        event,
        new Set()
      );
    }

    this.listeners
      .get(event)
      .add(listener);

    return () =>
      this.off(
        event,
        listener
      );
  }

  off(
    event,
    listener
  ) {
    return (
      this.listeners
        .get(event)
        ?.delete(
          listener
        ) ||
      false
    );
  }

  async emit(
    event,
    payload
  ) {
    const listeners =
      this.listeners.get(
        event
      );

    if (!listeners) {
      return;
    }

    for (
      const listener of
      listeners
    ) {
      try {
        await listener(
          payload
        );
      } catch {
        // UI listeners must
        // never break voice mode.
      }
    }
  }

  async emitState() {
    await this.emit(
      "state",
      this.getState()
    );
  }
}

// =====================================================
// EXTRACT MOOT RESULT
// =====================================================

function extractMutResponse(
  result
) {
  if (!result) {
    return "";
  }

  if (
    typeof result ===
      "string"
  ) {
    return result;
  }

  if (
    typeof result.message ===
      "string"
  ) {
    return result.message;
  }

  if (
    typeof result.response ===
      "string"
  ) {
    return result.response;
  }

  if (
    typeof result.text ===
      "string"
  ) {
    return result.text;
  }

  return "";
}

// =====================================================
// DEFAULT CONTROLLER
// =====================================================

export const voiceController =
  new MutVoiceController();
