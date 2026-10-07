/**
 * MOOT CHAT
 *
 * Обычный разговор с MOOT без необходимости
 * выполнять браузерные действия.
 *
 * Использует Responses API через openai-client.js.
 */

import {
  openAI,
} from "./openai-client.js";

import {
  selectModel,
  MODEL_TASK_TYPES,
} from "./model-router.js";

// =====================================================
// CHAT
// =====================================================

export class MutChat {
  constructor(
    options = {}
  ) {
    this.maxOutputTokens =
      options.maxOutputTokens ||
      2048;

    this.instructions =
      options.instructions ||
      `
You are MOOT, a personal AI assistant.

Respond naturally and clearly.

Use the same language as the user.

Prefer concise responses unless more detail is requested.

Do not claim that you performed browser actions unless the browser agent actually performed them.

Do not expose private chain-of-thought.
      `.trim();
  }

  // ===================================================
  // SEND
  // ===================================================

  async send({
    message,

    conversation = [],

    instructions = "",

    images = [],

    forceModel = null,
  } = {}) {
    const text =
      String(
        message || ""
      ).trim();

    if (
      !text &&
      !images.length
    ) {
      throw new Error(
        "Chat message is empty."
      );
    }

    const selected =
      await selectModel({
        taskType:
          images.length
            ? MODEL_TASK_TYPES.VISION
            : MODEL_TASK_TYPES.CHAT,

        hasImage:
          images.length > 0,

        forceModel,
      });

    const input =
      buildInput({
        message:
          text,

        conversation,

        images,
      });

    const response =
      await openAI
        .createResponse({
          model:
            selected.model,

          instructions: [
            this.instructions,
            instructions,
          ]
            .filter(Boolean)
            .join("\n\n"),

          input,

          reasoningEffort:
            selected
              .reasoningEffort,

          maxOutputTokens:
            this.maxOutputTokens,
        });

    return {
      text:
        response.text,

      model:
        response.model,

      responseId:
        response.id,

      usage:
        response.usage,

      status:
        response.status,
    };
  }
}

// =====================================================
// BUILD INPUT
// =====================================================

function buildInput({
  message,
  conversation,
  images,
}) {
  const input = [];

  for (
    const item of
    Array.isArray(
      conversation
    )
      ? conversation
      : []
  ) {
    if (
      ![
        "user",
        "assistant",
      ].includes(
        item?.role
      )
    ) {
      continue;
    }

    const content =
      String(
        item.content || ""
      ).trim();

    if (!content) {
      continue;
    }

    input.push({
      role:
        item.role,

      content,
    });
  }

  const current = [];

  if (message) {
    current.push({
      type:
        "input_text",

      text:
        message,
    });
  }

  for (
    const image of
    images || []
  ) {
    const imageUrl =
      normalizeImage(
        image
      );

    if (!imageUrl) {
      continue;
    }

    current.push({
      type:
        "input_image",

      image_url:
        imageUrl,

      detail:
        "auto",
    });
  }

  input.push({
    role:
      "user",

    content:
      current,
  });

  return input;
}

// =====================================================
// IMAGE
// =====================================================

function normalizeImage(
  image
) {
  if (
    typeof image ===
      "string"
  ) {
    return image;
  }

  if (
    image &&
    typeof image ===
      "object"
  ) {
    return (
      image.dataUrl ||
      image.url ||
      image.image_url ||
      null
    );
  }

  return null;
}

// =====================================================
// DEFAULT
// =====================================================

export const chat =
  new MutChat();