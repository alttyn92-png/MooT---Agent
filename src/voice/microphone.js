/**
 * MOOT MICROPHONE
 *
 * Управляет доступом к микрофону.
 *
 * Возможности:
 * - запросить разрешение;
 * - получить MediaStream;
 * - выключить микрофон;
 * - проверить состояние;
 * - выбрать конкретное аудиоустройство.
 */

export class MutMicrophone {
  constructor() {
    this.stream = null;
    this.deviceId = null;
  }

  // ===================================================
  // REQUEST ACCESS
  // ===================================================

  async requestAccess({
    deviceId = null,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
  } = {}) {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error(
        "Microphone is not supported in this browser."
      );
    }

    await this.stop();

    const audioConstraints = {
      echoCancellation,
      noiseSuppression,
      autoGainControl,
    };

    if (deviceId) {
      audioConstraints.deviceId = {
        exact: deviceId,
      };
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio:
            audioConstraints,
          video: false,
        });

      this.stream =
        stream;

      this.deviceId =
        deviceId;

      return {
        granted: true,
        stream,
        deviceId:
          this.getCurrentDeviceId(),
      };
    } catch (error) {
      throw normalizeMicrophoneError(
        error
      );
    }
  }

  // ===================================================
  // GET STREAM
  // ===================================================

  async getStream(
    options = {}
  ) {
    if (
      this.stream &&
      this.isActive()
    ) {
      return this.stream;
    }

    const result =
      await this.requestAccess(
        options
      );

    return result.stream;
  }

  // ===================================================
  // STOP
  // ===================================================

  async stop() {
    if (!this.stream) {
      return {
        stopped: true,
      };
    }

    for (
      const track of
      this.stream.getTracks()
    ) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }

    this.stream = null;

    return {
      stopped: true,
    };
  }

  // ===================================================
  // ACTIVE
  // ===================================================

  isActive() {
    if (!this.stream) {
      return false;
    }

    return this.stream
      .getAudioTracks()
      .some(
        (track) =>
          track.readyState ===
            "live" &&
          track.enabled
      );
  }

  // ===================================================
  // MOOTE
  // ===================================================

  mute() {
    if (!this.stream) {
      return false;
    }

    for (
      const track of
      this.stream.getAudioTracks()
    ) {
      track.enabled = false;
    }

    return true;
  }

  // ===================================================
  // UNMOOTE
  // ===================================================

  unmute() {
    if (!this.stream) {
      return false;
    }

    for (
      const track of
      this.stream.getAudioTracks()
    ) {
      track.enabled = true;
    }

    return true;
  }

  // ===================================================
  // TOGGLE
  // ===================================================

  toggleMute() {
    if (!this.stream) {
      return false;
    }

    const tracks =
      this.stream.getAudioTracks();

    if (!tracks.length) {
      return false;
    }

    const shouldEnable =
      !tracks.some(
        (track) =>
          track.enabled
      );

    for (
      const track of
      tracks
    ) {
      track.enabled =
        shouldEnable;
    }

    return shouldEnable;
  }

  // ===================================================
  // DEVICES
  // ===================================================

  async listDevices() {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return [];
    }

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    return devices
      .filter(
        (device) =>
          device.kind ===
          "audioinput"
      )
      .map(
        (device) => ({
          deviceId:
            device.deviceId,

          groupId:
            device.groupId,

          label:
            device.label ||
            "Microphone",
        })
      );
  }

  // ===================================================
  // CURRENT DEVICE
  // ===================================================

  getCurrentDeviceId() {
    if (!this.stream) {
      return (
        this.deviceId ||
        null
      );
    }

    const track =
      this.stream
        .getAudioTracks()[0];

    if (!track) {
      return (
        this.deviceId ||
        null
      );
    }

    const settings =
      track.getSettings?.();

    return (
      settings?.deviceId ||
      this.deviceId ||
      null
    );
  }

  // ===================================================
  // STATUS
  // ===================================================

  getStatus() {
    const track =
      this.stream
        ?.getAudioTracks?.()[0] ||
      null;

    return {
      active:
        this.isActive(),

      muted:
        track
          ? !track.enabled
          : false,

      readyState:
        track?.readyState ||
        null,

      deviceId:
        this.getCurrentDeviceId(),
    };
  }
}

// =====================================================
// ERROR NORMALIZER
// =====================================================

function normalizeMicrophoneError(
  error
) {
  const name =
    error?.name ||
    "MicrophoneError";

  let message =
    error?.message ||
    "Microphone access failed.";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      message =
        "Microphone permission was denied.";
      break;

    case "NotFoundError":
    case "DevicesNotFoundError":
      message =
        "No microphone was found.";
      break;

    case "NotReadableError":
    case "TrackStartError":
      message =
        "Microphone is busy or cannot be accessed.";
      break;

    case "OverconstrainedError":
      message =
        "Requested microphone settings are not available.";
      break;

    case "SecurityError":
      message =
        "Microphone access is blocked by browser security settings.";
      break;

    default:
      break;
  }

  const normalized =
    new Error(message);

  normalized.name =
    name;

  return normalized;
}

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const microphone =
  new MutMicrophone();