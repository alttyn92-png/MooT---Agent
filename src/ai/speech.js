import { fetchWithTimeout } from './request.js';
/**
 * MOOT SPEECH
 *
 * Text
 *  ↓
 * OpenAI TTS
 *  ↓
 * Blob
 */

import {
  openAI,
} from "./openai-client.js";

// =====================================================
// CONSTANTS
// =====================================================

const SPEECH_URL =
  "https://api.openai.com/v1/audio/speech";

const DEFAULT_MODEL =
  "gpt-4o-mini-tts";

const DEFAULT_VOICE =
  "alloy";

const DEFAULT_FORMAT =
  "mp3";

const DEFAULT_TIMEOUT =
  120000;

// =====================================================
// SPEECH
// =====================================================

export class MutSpeech {
  constructor(
    options = {}
  ) {
    this.model =
      options.model ||
      DEFAULT_MODEL;

    this.voice =
      options.voice ||
      DEFAULT_VOICE;

    this.format =
      options.format ||
      DEFAULT_FORMAT;

    this.timeout =
      options.timeout ||
      DEFAULT_TIMEOUT;
  }

  // ===================================================
  // GENERATE
  // ===================================================

  async generate(
    text,
    options = {}
  ) {
    const input =
      String(
        text || ""
      ).trim();

    if (!input) {
      throw new Error(
        "Speech text is empty."
      );
    }

    const apiKey =
      await openAI
        .getApiKey();

    const format =
      normalizeFormat(
        options.format ||
        this.format
      );

    const body = {
      model:
        options.model ||
        this.model,

      voice:
        options.voice ||
        this.voice,

      input,

      response_format:
        format,
    };

    if (
      options.instructions
    ) {
      body.instructions =
        String(
          options.instructions
        );
    }

    if (
      Number.isFinite(
        options.speed
      )
    ) {
      body.speed =
        Math.max(
          0.25,
          Math.min(
            4,
            options.speed
          )
        );
    }

    const startedAt =
      Date.now();

    const response =
      await fetchWithTimeout(
        SPEECH_URL,
        {
          method: "POST",
          signal: options.signal,

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body:
            JSON.stringify(
              body
            ),
        },
        options.timeout ||
        this.timeout
      );

    if (
      !response.ok
    ) {
      const data =
        await parseError(
          response
        );

      throw createAPIError(
        data,
        response.status
      );
    }

    const buffer =
      await response
        .arrayBuffer();

    const mimeType =
      mimeFromFormat(
        format
      );

    const blob =
      new Blob(
        [
          buffer,
        ],
        {
          type:
            mimeType,
        }
      );

    return {
      blob,

      arrayBuffer:
        buffer,

      mimeType,

      model:
        body.model,

      voice:
        body.voice,

      format,

      size:
        blob.size,

      executionTimeMs:
        Date.now() -
        startedAt,
    };
  }

  // ===================================================
  // BLOB
  // ===================================================

  async toBlob(
    text,
    options = {}
  ) {
    return (
      await this.generate(
        text,
        options
      )
    ).blob;
  }

  // ===================================================
  // DATA URL
  // ===================================================

  async toDataURL(
    text,
    options = {}
  ) {
    const blob =
      await this.toBlob(
        text,
        options
      );

    return blobToDataURL(
      blob
    );
  }

  // ===================================================
  // SETTINGS
  // ===================================================

  setVoice(
    voice
  ) {
    if (
      voice
    ) {
      this.voice =
        String(
          voice
        );
    }

    return this.voice;
  }

  setModel(
    model
  ) {
    if (
      model
    ) {
      this.model =
        String(
          model
        );
    }

    return this.model;
  }
}

// =====================================================
// FORMAT
// =====================================================

function normalizeFormat(
  value
) {
  const format =
    String(
      value || ""
    ).toLowerCase();

  const formats = [
    "mp3",
    "opus",
    "aac",
    "flac",
    "wav",
    "pcm",
  ];

  return formats.includes(
    format
  )
    ? format
    : "mp3";
}

// =====================================================
// MIME
// =====================================================

function mimeFromFormat(
  format
) {
  switch (
    format
  ) {
    case "opus":
      return "audio/ogg";

    case "aac":
      return "audio/aac";

    case "flac":
      return "audio/flac";

    case "wav":
      return "audio/wav";

    case "pcm":
      return "audio/pcm";

    case "mp3":
    default:
      return "audio/mpeg";
  }
}

// =====================================================
// FETCH
// =====================================================


// =====================================================
// ERROR
// =====================================================

async function parseError(
  response
) {
  const text =
    await response.text();

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      message:
        text,
    };
  }
}

function createAPIError(
  data,
  status
) {
  const error =
    new Error(
      data?.error
        ?.message ||
      data?.message ||
      `Speech API error (${status}).`
    );

  error.status =
    status;

  return error;
}

// =====================================================
// DATA URL
// =====================================================

function blobToDataURL(
  blob
) {
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
            reader.error
          );

      reader.readAsDataURL(
        blob
      );
    }
  );
}

// =====================================================
// DEFAULT
// =====================================================

export const speech =
  new MutSpeech();