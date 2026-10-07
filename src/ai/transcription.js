import { fetchWithTimeout } from './request.js';
/**
 * MOOT TRANSCRIPTION
 *
 * Audio Blob
 *   ↓
 * OpenAI transcription API
 *   ↓
 * text
 */

import {
  openAI,
} from "./openai-client.js";

// =====================================================
// CONSTANTS
// =====================================================

const TRANSCRIPTION_URL =
  "https://api.openai.com/v1/audio/transcriptions";

const DEFAULT_MODEL =
  "gpt-4o-mini-transcribe";

const DEFAULT_TIMEOUT =
  120000;

// =====================================================
// CLASS
// =====================================================

export class MutTranscription {
  constructor(
    options = {}
  ) {
    this.model =
      options.model ||
      DEFAULT_MODEL;

    this.timeout =
      options.timeout ||
      DEFAULT_TIMEOUT;
  }

  // ===================================================
  // TRANSCRIBE
  // ===================================================

  async transcribe(
    audio,
    options = {}
  ) {
    const blob =
      normalizeAudio(
        audio,
        options.mimeType
      );

    if (!blob) {
      throw new Error(
        "Transcription requires audio."
      );
    }

    if (
      blob.size === 0
    ) {
      throw new Error(
        "Audio recording is empty."
      );
    }

    const apiKey =
      await openAI
        .getApiKey();

    const form =
      new FormData();

    const file =
      new File(
        [
          blob,
        ],
        options.fileName ||
        createFileName(
          blob.type
        ),
        {
          type:
            blob.type ||
            "audio/webm",
        }
      );

    form.append(
      "file",
      file
    );

    form.append(
      "model",
      options.model ||
      this.model
    );

    form.append(
      "response_format",
      "json"
    );

    if (
      options.language
    ) {
      form.append(
        "language",
        String(
          options.language
        )
      );
    }

    if (
      options.prompt
    ) {
      form.append(
        "prompt",
        String(
          options.prompt
        )
      );
    }

    const startedAt =
      Date.now();

    const response =
      await fetchWithTimeout(
        TRANSCRIPTION_URL,
        {
          method: "POST",
          signal: options.signal,

          headers: {
            Authorization:
              `Bearer ${apiKey}`,
          },

          body:
            form,
        },
        options.timeout ||
        this.timeout
      );

    const data =
      await parseJSON(
        response
      );

    if (
      !response.ok
    ) {
      throw createAPIError(
        data,
        response.status
      );
    }

    return {
      text:
        String(
          data.text ||
          ""
        ).trim(),

      language:
        data.language ||
        options.language ||
        null,

      duration:
        data.duration ||
        null,

      model:
        options.model ||
        this.model,

      executionTimeMs:
        Date.now() -
        startedAt,

      raw:
        data,
    };
  }

  // ===================================================
  // RECORDING RESULT
  // ===================================================

  async transcribeRecording(
    recording,
    options = {}
  ) {
    if (
      !recording
        ?.blob
    ) {
      throw new Error(
        "Recording has no audio Blob."
      );
    }

    return this.transcribe(
      recording.blob,
      {
        mimeType:
          recording.mimeType,

        ...options,
      }
    );
  }

  // ===================================================
  // SIMPLE TEXT
  // ===================================================

  async toText(
    audio,
    options = {}
  ) {
    const result =
      await this.transcribe(
        audio,
        options
      );

    return result.text;
  }

  // ===================================================
  // MODEL
  // ===================================================

  setModel(
    model
  ) {
    if (
      typeof model ===
        "string" &&
      model.trim()
    ) {
      this.model =
        model.trim();
    }

    return this.model;
  }
}

// =====================================================
// NORMALIZE AUDIO
// =====================================================

function normalizeAudio(
  audio,
  mimeType =
    "audio/webm"
) {
  if (
    audio instanceof
      Blob
  ) {
    return audio;
  }

  if (
    audio instanceof
      ArrayBuffer
  ) {
    return new Blob(
      [
        audio,
      ],
      {
        type:
          mimeType,
      }
    );
  }

  if (
    ArrayBuffer.isView(
      audio
    )
  ) {
    return new Blob(
      [
        audio.buffer.slice(
          audio.byteOffset,
          audio.byteOffset +
            audio.byteLength
        ),
      ],
      {
        type:
          mimeType,
      }
    );
  }

  if (
    audio?.blob instanceof
      Blob
  ) {
    return audio.blob;
  }

  return null;
}

// =====================================================
// FILE NAME
// =====================================================

function createFileName(
  mimeType
) {
  const type =
    String(
      mimeType || ""
    ).toLowerCase();

  if (
    type.includes(
      "ogg"
    )
  ) {
    return "mut-recording.ogg";
  }

  if (
    type.includes(
      "wav"
    )
  ) {
    return "mut-recording.wav";
  }

  if (
    type.includes(
      "mpeg"
    ) ||
    type.includes(
      "mp3"
    )
  ) {
    return "mut-recording.mp3";
  }

  if (
    type.includes(
      "mp4"
    )
  ) {
    return "mut-recording.m4a";
  }

  return "mut-recording.webm";
}

// =====================================================
// FETCH
// =====================================================


// =====================================================
// JSON
// =====================================================

async function parseJSON(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      raw:
        text,
    };
  }
}

// =====================================================
// ERROR
// =====================================================

function createAPIError(
  data,
  status
) {
  const error =
    new Error(
      data?.error
        ?.message ||
      `Transcription API error (${status}).`
    );

  error.status =
    status;

  error.code =
    data?.error
      ?.code ||
    null;

  return error;
}

// =====================================================
// DEFAULT
// =====================================================

export const transcription =
  new MutTranscription();