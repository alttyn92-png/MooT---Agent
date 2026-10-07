/**
 * MOOT VISION
 *
 * Анализ изображений:
 *
 * - screenshot
 * - фото
 * - учебные задания
 * - интерфейсы
 * - ошибки на экране
 */

import {
  openAI,
} from "./openai-client.js";

import {
  selectModel,
  MODEL_TASK_TYPES,
} from "./model-router.js";

// =====================================================
// VISION
// =====================================================

export class MutVision {
  constructor(
    options = {}
  ) {
    this.maxOutputTokens =
      options.maxOutputTokens ||
      3000;

    this.instructions =
      options.instructions ||
      `
You are MOOT Vision.

Analyze only what is actually visible in the supplied image.

When analyzing a UI:
- identify important text
- identify buttons
- identify inputs
- identify navigation
- identify dialogs
- identify errors
- identify controls relevant to the user's task

Do not invent buttons or text that are not visible.

If image quality is insufficient, explicitly say what cannot be determined.
      `.trim();
  }

  // ===================================================
  // ONE IMAGE
  // ===================================================

  async analyzeImage({
    image,

    prompt =
      "Проанализируй изображение.",

    detail =
      "auto",

    instructions =
      "",

    forceModel =
      null,
  } = {}) {
    return this.analyzeImages({
      images: [
        image,
      ],

      prompt,

      detail,

      instructions,

      forceModel,
    });
  }

  // ===================================================
  // MANY IMAGES
  // ===================================================

  async analyzeImages({
    images = [],

    prompt =
      "Проанализируй изображения.",

    detail =
      "auto",

    instructions =
      "",

    forceModel =
      null,
  } = {}) {
    const normalized =
      images
        .map(
          normalizeImage
        )
        .filter(Boolean);

    if (
      !normalized.length
    ) {
      throw new Error(
        "Vision requires at least one valid image."
      );
    }

    const selected =
      await selectModel({
        taskType:
          MODEL_TASK_TYPES.VISION,

        hasImage:
          true,

        forceModel,
      });

    const content = [
      {
        type:
          "input_text",

        text:
          String(
            prompt || ""
          ),
      },
    ];

    for (
      const imageUrl of
      normalized
    ) {
      content.push({
        type:
          "input_image",

        image_url:
          imageUrl,

        detail:
          normalizeDetail(
            detail
          ),
      });
    }

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

          input: [
            {
              role:
                "user",

              content,
            },
          ],

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
    };
  }

  // ===================================================
  // BROWSER SCREENSHOT
  // ===================================================

  async analyzeBrowserScreenshot({
    image,

    task = "",
  } = {}) {
    return this.analyzeImage({
      image,

      detail:
        "high",

      prompt:
        `
Analyze this browser screenshot.

USER TASK:
${String(
  task || ""
)}

Return concise structured observations:

1. Current screen state.
2. Important visible text.
3. Relevant buttons or controls.
4. Any dialog, error, loading state, CAPTCHA or blocker.
5. Most useful next browser action.

Do not say an action succeeded unless the screenshot proves it.
        `.trim(),
    });
  }
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
// DETAIL
// =====================================================

function normalizeDetail(
  detail
) {
  return [
    "auto",
    "low",
    "high",
  ].includes(
    detail
  )
    ? detail
    : "auto";
}

// =====================================================
// DEFAULT
// =====================================================

export const vision =
  new MutVision();