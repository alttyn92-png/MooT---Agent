/**
 * MOOT CONSTANTS
 *
 * Общие константы проекта.
 */

export const MOOT_NAME =
  "MOOT";

export const MOOT_VERSION =
  "0.1.0";

export const DEFAULT_LANGUAGE =
  "ru";

export const DEFAULT_MAX_STEPS =
  50;

export const DEFAULT_STEP_DELAY_MS =
  150;

export const DEFAULT_PAGE_STABLE_MS =
  800;

export const DEFAULT_PAGE_TIMEOUT_MS =
  10000;

export const DEFAULT_API_TIMEOUT_MS =
  120000;

export const DEFAULT_MAX_HISTORY_MESSAGES =
  30;

export const DEFAULT_MAX_PAGE_ELEMENTS =
  200;

export const DEFAULT_MAX_PAGE_TEXT =
  15000;

export const DEFAULT_MAX_MOOTATIONS =
  100;

export const DEFAULT_TRANSCRIPTION_MODEL =
  "gpt-4o-mini-transcribe";

export const DEFAULT_TTS_MODEL =
  "gpt-4o-mini-tts";

export const DEFAULT_TTS_VOICE =
  "alloy";

export const DEFAULT_MODELS =
  Object.freeze({
    cheap:
      "gpt-5.6-luna",

    balanced:
      "gpt-5.6-terra",

    strong:
      "gpt-5.6-sol",

    vision:
      "gpt-5.6-luna",
  });

export const STORAGE_KEYS =
  Object.freeze({
    STATE:
      "mutState",

    SETTINGS:
      "mutSettings",

    PROFILE:
      "mutUserProfile",

    CONVERSATION:
      "mutConversation",

    ACTIVE_CHAT_ID:
      "mutActiveChatId",
  });

export const PAGE_LIMITS =
  Object.freeze({
    maxText:
      15000,

    maxInteractive:
      250,

    maxForms:
      50,

    maxTables:
      20,

    maxDialogs:
      30,

    maxLists:
      30,
  });

export const SAFE_PROTOCOLS =
  Object.freeze([
    "http:",
    "https:",
  ]);

export const BLOCKED_PAGE_PREFIXES =
  Object.freeze([
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "devtools://",
  ]);

export const AUDIO_FORMATS =
  Object.freeze([
    "mp3",
    "opus",
    "aac",
    "flac",
    "wav",
    "pcm",
  ]);

export const IMAGE_MIME_PREFIX =
  "image/";

export const AUDIO_MIME_PREFIX =
  "audio/";

export const UI_STATE =
  Object.freeze({
    IDLE:
      "idle",

    BUSY:
      "busy",

    ERROR:
      "error",

    LISTENING:
      "listening",

    SPEAKING:
      "speaking",
  });