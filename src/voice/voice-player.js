/**
 * MOOT VOICE PLAYER
 *
 * Воспроизводит аудиоответы MOOT.
 *
 * Поддерживает:
 * - Blob;
 * - URL;
 * - data URL;
 * - ArrayBuffer;
 *
 * Также умеет:
 * - pause
 * - resume
 * - stop
 * - volume
 * - playbackRate
 */

export class MutVoicePlayer {
  constructor() {
    this.audio =
      new Audio();

    this.objectUrl =
      null;

    this.listeners =
      new Map();

    this.audio.preload =
      "auto";

    this.installEvents();
  }

  // ===================================================
  // PLAY
  // ===================================================

  async play(
    source,
    options = {}
  ) {
    await this.stop();

    const url =
      await normalizeAudioSource(
        source,
        options.mimeType
      );

    if (!url) {
      throw new Error(
        "Invalid audio source."
      );
    }

    if (
      url.startsWith(
        "blob:"
      )
    ) {
      this.objectUrl =
        url;
    }

    this.audio.src =
      url;

    if (
      Number.isFinite(
        options.volume
      )
    ) {
      this.setVolume(
        options.volume
      );
    }

    if (
      Number.isFinite(
        options.playbackRate
      )
    ) {
      this.setPlaybackRate(
        options.playbackRate
      );
    }

    if (
      options.loop === true
    ) {
      this.audio.loop =
        true;
    } else {
      this.audio.loop =
        false;
    }

    await this.audio.play();

    return {
      playing: true,

      src:
        this.audio.src,
    };
  }

  // ===================================================
  // PAUSE
  // ===================================================

  pause() {
    if (
      this.audio.paused
    ) {
      return false;
    }

    this.audio.pause();

    return true;
  }

  // ===================================================
  // RESUME
  // ===================================================

  async resume() {
    if (
      !this.audio.src
    ) {
      return false;
    }

    if (
      !this.audio.paused
    ) {
      return true;
    }

    await this.audio.play();

    return true;
  }

  // ===================================================
  // STOP
  // ===================================================

  async stop() {
    try {
      this.audio.pause();

      this.audio.currentTime =
        0;
    } catch {
      // ignore
    }

    if (
      this.objectUrl
    ) {
      try {
        URL.revokeObjectURL(
          this.objectUrl
        );
      } catch {
        // ignore
      }

      this.objectUrl =
        null;
    }

    this.audio.removeAttribute(
      "src"
    );

    try {
      this.audio.load();
    } catch {
      // ignore
    }

    return {
      stopped: true,
    };
  }

  // ===================================================
  // VOLUME
  // ===================================================

  setVolume(
    value
  ) {
    const volume =
      Math.max(
        0,
        Math.min(
          1,
          Number(value)
        )
      );

    this.audio.volume =
      volume;

    return volume;
  }

  // ===================================================
  // RATE
  // ===================================================

  setPlaybackRate(
    value
  ) {
    const rate =
      Math.max(
        0.5,
        Math.min(
          3,
          Number(value)
        )
      );

    this.audio.playbackRate =
      rate;

    return rate;
  }

  // ===================================================
  // SEEK
  // ===================================================

  seek(
    seconds
  ) {
    if (
      !Number.isFinite(
        seconds
      )
    ) {
      return false;
    }

    try {
      this.audio.currentTime =
        Math.max(
          0,
          seconds
        );

      return true;
    } catch {
      return false;
    }
  }

  // ===================================================
  // STATUS
  // ===================================================

  getStatus() {
    return {
      playing:
        Boolean(
          this.audio.src &&
          !this.audio.paused &&
          !this.audio.ended
        ),

      paused:
        this.audio.paused,

      ended:
        this.audio.ended,

      currentTime:
        this.audio.currentTime,

      duration:
        Number.isFinite(
          this.audio.duration
        )
          ? this.audio.duration
          : null,

      volume:
        this.audio.volume,

      playbackRate:
        this.audio.playbackRate,

      src:
        this.audio.src ||
        null,
    };
  }

  // ===================================================
  // EVENTS
  // ===================================================

  installEvents() {
    const events = [
      "play",
      "pause",
      "ended",
      "loadedmetadata",
      "timeupdate",
      "error",
    ];

    for (
      const eventName of
      events
    ) {
      this.audio.addEventListener(
        eventName,
        () => {
          this.emit(
            eventName,
            this.getStatus()
          );
        }
      );
    }
  }

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

  emit(
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
        listener(
          payload
        );
      } catch {
        // ignore
      }
    }
  }
}

// =====================================================
// NORMALIZE SOURCE
// =====================================================

async function normalizeAudioSource(
  source,
  mimeType =
    "audio/mpeg"
) {
  if (!source) {
    return null;
  }

  if (
    typeof source ===
      "string"
  ) {
    return source;
  }

  if (
    source instanceof Blob
  ) {
    return URL.createObjectURL(
      source
    );
  }

  if (
    source instanceof
      ArrayBuffer
  ) {
    const blob =
      new Blob(
        [source],
        {
          type:
            mimeType,
        }
      );

    return URL.createObjectURL(
      blob
    );
  }

  if (
    ArrayBuffer.isView(
      source
    )
  ) {
    const blob =
      new Blob(
        [
          source.buffer.slice(
            source.byteOffset,
            source.byteOffset +
              source.byteLength
          ),
        ],
        {
          type:
            mimeType,
        }
      );

    return URL.createObjectURL(
      blob
    );
  }

  if (
    typeof source ===
      "object"
  ) {
    if (
      source.blob instanceof
      Blob
    ) {
      return URL.createObjectURL(
        source.blob
      );
    }

    if (
      typeof source.url ===
        "string"
    ) {
      return source.url;
    }

    if (
      typeof source.dataUrl ===
        "string"
    ) {
      return source.dataUrl;
    }
  }

  return null;
}

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const voicePlayer =
  new MutVoicePlayer();