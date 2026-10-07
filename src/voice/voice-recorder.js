/**
 * MOOT VOICE RECORDER
 *
 * Записывает голос пользователя через MediaRecorder.
 *
 * Возвращает:
 * - Blob;
 * - ArrayBuffer;
 * - base64/data URL;
 * - MIME type;
 * - длительность записи.
 */

import {
  microphone,
} from "./microphone.js";

export class MutVoiceRecorder {
  constructor() {
    this.recorder = null;

    this.chunks = [];

    this.startedAt =
      null;

    this.stoppedAt =
      null;

    this.recording =
      false;

    this.currentStream =
      null;

    this.listeners =
      new Map();
  }

  // ===================================================
  // START
  // ===================================================

  async start({
    deviceId = null,
    mimeType = null,
    audioBitsPerSecond = 64000,
  } = {}) {
    if (this.recording) {
      throw new Error(
        "Voice recording is already active."
      );
    }

    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      throw new Error(
        "MediaRecorder is not supported."
      );
    }

    const stream =
      await microphone.getStream({
        deviceId,
      });

    this.currentStream =
      stream;

    const options = {
      audioBitsPerSecond,
    };

    const selectedMime =
      chooseMimeType(
        mimeType
      );

    if (selectedMime) {
      options.mimeType =
        selectedMime;
    }

    this.chunks = [];

    this.recorder =
      new MediaRecorder(
        stream,
        options
      );

    this.recorder.ondataavailable =
      (event) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          this.chunks.push(
            event.data
          );
        }
      };

    this.recorder.onerror =
      (event) => {
        this.emit(
          "error",
          event.error ||
            new Error(
              "Voice recorder error."
            )
        );
      };

    this.startedAt =
      Date.now();

    this.stoppedAt =
      null;

    this.recording =
      true;

    this.recorder.start(
      250
    );

    await this.emit(
      "start",
      {
        startedAt:
          this.startedAt,

        mimeType:
          this.recorder.mimeType,
      }
    );

    return {
      started: true,

      mimeType:
        this.recorder.mimeType,

      startedAt:
        this.startedAt,
    };
  }

  // ===================================================
  // STOP
  // ===================================================

  async stop() {
    if (
      !this.recorder ||
      !this.recording
    ) {
      return null;
    }

    const recorder =
      this.recorder;

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const onStop =
          async () => {
            cleanup();

            this.recording =
              false;

            this.stoppedAt =
              Date.now();

            const mimeType =
              recorder.mimeType ||
              this.chunks[0]
                ?.type ||
              "audio/webm";

            const blob =
              new Blob(
                this.chunks,
                {
                  type:
                    mimeType,
                }
              );

            const durationMs =
              this.startedAt
                ? this.stoppedAt -
                  this.startedAt
                : null;

            const result = {
              blob,

              mimeType,

              size:
                blob.size,

              durationMs,

              startedAt:
                this.startedAt,

              stoppedAt:
                this.stoppedAt,
            };

            this.recorder =
              null;

            await this.emit(
              "stop",
              result
            );

            resolve(result);
          };

        const onError =
          (event) => {
            cleanup();

            this.recording =
              false;

            reject(
              event.error ||
                new Error(
                  "Failed to stop voice recording."
                )
            );
          };

        const cleanup = () => {
          recorder.removeEventListener(
            "stop",
            onStop
          );

          recorder.removeEventListener(
            "error",
            onError
          );
        };

        recorder.addEventListener(
          "stop",
          onStop,
          {
            once: true,
          }
        );

        recorder.addEventListener(
          "error",
          onError,
          {
            once: true,
          }
        );

        try {
          recorder.stop();
        } catch (error) {
          cleanup();

          this.recording =
            false;

          reject(error);
        }
      }
    );
  }

  // ===================================================
  // CANCEL
  // ===================================================

  async cancel() {
    if (
      this.recorder &&
      this.recording
    ) {
      try {
        this.recorder.stop();
      } catch {
        // ignore
      }
    }

    this.recorder =
      null;

    this.chunks = [];

    this.recording =
      false;

    this.startedAt =
      null;

    this.stoppedAt =
      null;

    await this.emit(
      "cancel",
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
  // PAUSE
  // ===================================================

  pause() {
    if (
      !this.recorder ||
      this.recorder.state !==
        "recording"
    ) {
      return false;
    }

    this.recorder.pause();

    return true;
  }

  // ===================================================
  // RESUME
  // ===================================================

  resume() {
    if (
      !this.recorder ||
      this.recorder.state !==
        "paused"
    ) {
      return false;
    }

    this.recorder.resume();

    return true;
  }

  // ===================================================
  // STATUS
  // ===================================================

  getStatus() {
    return {
      recording:
        this.recording,

      state:
        this.recorder
          ?.state ||
        "inactive",

      startedAt:
        this.startedAt,

      stoppedAt:
        this.stoppedAt,

      chunkCount:
        this.chunks.length,
    };
  }

  // ===================================================
  // BLOB -> ARRAY BUFFER
  // ===================================================

  async toArrayBuffer(
    blob
  ) {
    if (
      !(blob instanceof Blob)
    ) {
      throw new Error(
        "toArrayBuffer requires Blob."
      );
    }

    return blob.arrayBuffer();
  }

  // ===================================================
  // BLOB -> DATA URL
  // ===================================================

  async toDataURL(
    blob
  ) {
    if (
      !(blob instanceof Blob)
    ) {
      throw new Error(
        "toDataURL requires Blob."
      );
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onload =
          () =>
            resolve(
              reader.result
            );

        reader.onerror =
          () =>
            reject(
              reader.error ||
                new Error(
                  "Failed to convert audio to data URL."
                )
            );

        reader.readAsDataURL(
          blob
        );
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
        // ignore listener error
      }
    }
  }
}

// =====================================================
// MIME TYPE
// =====================================================

function chooseMimeType(
  preferred
) {
  const candidates = [
    preferred,
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ].filter(Boolean);

  for (
    const type of
    candidates
  ) {
    try {
      if (
        MediaRecorder.isTypeSupported(
          type
        )
      ) {
        return type;
      }
    } catch {
      // ignore
    }
  }

  return "";
}

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const voiceRecorder =
  new MutVoiceRecorder();