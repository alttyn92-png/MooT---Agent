/**
 * MOOT MODEL ROUTER
 *
 * Выбирает модель в зависимости от сложности задачи.
 *
 * Основная идея:
 *
 * gpt-6-luna
 *   дешёвая модель для большинства шагов агента
 *
 * gpt-6-sol
 *   сложные задачи / восстановление
 *
 * gpt-6-astra
 *   самые сложные случаи
 *
 * Пользователь всегда может переопределить модели
 * через настройки MOOT.
 */

// =====================================================
// MODELS
// =====================================================

export const DEFAULT_MODELS =
  Object.freeze({
    cheap:
      "gpt-6-luna",

    balanced:
      "gpt-6-sol",

    strong:
      "gpt-6-astra",

    vision:
      "gpt-6-luna",
  });

// =====================================================
// TASK TYPES
// =====================================================

export const MODEL_TASK_TYPES =
  Object.freeze({
    CHAT:
      "chat",

    AGENT:
      "agent",

    COMPLEX_AGENT:
      "complex_agent",

    VISION:
      "vision",

    RECOVERY:
      "recovery",

    LONG_CONTEXT:
      "long_context",
  });

// =====================================================
// SELECT MODEL
// =====================================================

export async function selectModel({
  taskType =
    MODEL_TASK_TYPES.AGENT,

  step = 1,

  consecutiveErrors = 0,

  hasImage = false,

  contextSize = 0,

  forceModel = null,
} = {}) {
  if (
    typeof forceModel ===
      "string" &&
    forceModel.trim()
  ) {
    return {
      model:
        forceModel.trim(),

      reason:
        "forced_model",

      reasoningEffort:
        "low",
    };
  }

  const settings =
    await getModelSettings();

  const models = {
    cheap:
      settings.cheapModel ||
      DEFAULT_MODELS.cheap,

    balanced:
      settings.balancedModel ||
      DEFAULT_MODELS.balanced,

    strong:
      settings.strongModel ||
      DEFAULT_MODELS.strong,

    vision:
      settings.visionModel ||
      DEFAULT_MODELS.vision,
  };

  // ===================================================
  // VISION
  // ===================================================

  if (
    hasImage ||
    taskType ===
      MODEL_TASK_TYPES.VISION
  ) {
    return {
      model:
        models.vision,

      reason:
        "vision_input",

      reasoningEffort:
        "low",
    };
  }

  // ===================================================
  // MANY ERRORS
  // ===================================================

  if (
    consecutiveErrors >= 4
  ) {
    return {
      model:
        models.strong,

      reason:
        "repeated_failures",

      reasoningEffort:
        "high",
    };
  }

  if (
    consecutiveErrors >= 2 ||
    taskType ===
      MODEL_TASK_TYPES.RECOVERY
  ) {
    return {
      model:
        models.balanced,

      reason:
        "recovery",

      reasoningEffort:
        "medium",
    };
  }

  // ===================================================
  // VERY COMPLEX AGENT
  // ===================================================

  if (
    taskType ===
      MODEL_TASK_TYPES.COMPLEX_AGENT
  ) {
    return {
      model:
        models.balanced,

      reason:
        "complex_agent",

      reasoningEffort:
        "medium",
    };
  }

  // ===================================================
  // LARGE CONTEXT
  // ===================================================

  if (
    contextSize >
      100000 ||
    taskType ===
      MODEL_TASK_TYPES.LONG_CONTEXT
  ) {
    return {
      model:
        models.balanced,

      reason:
        "large_context",

      reasoningEffort:
        "low",
    };
  }

  // ===================================================
  // LONG TASK ESCALATION
  // ===================================================

  if (
    step >= 30
  ) {
    return {
      model:
        models.balanced,

      reason:
        "long_task",

      reasoningEffort:
        "medium",
    };
  }

  // ===================================================
  // NORMAL CHAT / AGENT
  // ===================================================

  return {
    model:
      models.cheap,

    reason:
      taskType ===
        MODEL_TASK_TYPES.CHAT
        ? "cheap_chat"
        : "cheap_agent",

    reasoningEffort:
      "low",
  };
}

// =====================================================
// CLASSIFY TASK
// =====================================================

export function classifyTask({
  userMessage = "",

  hasImage = false,

  consecutiveErrors = 0,
} = {}) {
  if (
    hasImage
  ) {
    return MODEL_TASK_TYPES
      .VISION;
  }

  if (
    consecutiveErrors >= 2
  ) {
    return MODEL_TASK_TYPES
      .RECOVERY;
  }

  const text =
    String(
      userMessage || ""
    )
      .toLowerCase()
      .trim();

  if (!text) {
    return MODEL_TASK_TYPES
      .CHAT;
  }

  const browserWords = [
    "открой",
    "зайди",
    "перейди",
    "нажми",
    "найди",
    "введи",
    "напиши",
    "отправь",
    "ответь",
    "заполни",
    "зарегистрируй",
    "запишись",
    "закрой",
    "переключи",
    "скачай",

    "open",
    "navigate",
    "click",
    "find",
    "type",
    "send",
    "fill",
    "register",
  ];

  const complexWords = [
    "самостоятельно",
    "полностью",
    "сам разберись",
    "выбери подходящий",
    "сравни",
    "сделай всё",
    "выполни полностью",
    "найди лучший",
  ];

  const browserTask =
    browserWords.some(
      (
        word
      ) =>
        text.includes(
          word
        )
    );

  const complexTask =
    complexWords.some(
      (
        word
      ) =>
        text.includes(
          word
        )
    );

  if (
    browserTask &&
    complexTask
  ) {
    return MODEL_TASK_TYPES
      .COMPLEX_AGENT;
  }

  if (
    browserTask
  ) {
    return MODEL_TASK_TYPES
      .AGENT;
  }

  return MODEL_TASK_TYPES
    .CHAT;
}

// =====================================================
// CONTEXT SIZE ESTIMATE
// =====================================================

export function estimateContextSize(
  value
) {
  let text = "";

  try {
    text =
      typeof value ===
        "string"
        ? value
        : JSON.stringify(
            value
          );
  } catch {
    text =
      String(
        value || ""
      );
  }

  /*
   * Грубая оценка.
   *
   * Это не точный tokenizer.
   */
  return Math.ceil(
    text.length / 4
  );
}

// =====================================================
// SETTINGS
// =====================================================

async function getModelSettings() {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    return {};
  }

  try {
    const result =
      await chrome.storage.local.get(
        "mutSettings"
      );

    return (
      result.mutSettings
        ?.models ||
      {}
    );
  } catch {
    return {};
  }
}

// =====================================================
// SAVE
// =====================================================

export async function saveModelSettings(
  models = {}
) {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    throw new Error(
      "Chrome storage is unavailable."
    );
  }

  const result =
    await chrome.storage.local.get(
      "mutSettings"
    );

  const current =
    result.mutSettings ||
    {};

  const next = {
    ...current,

    models: {
      ...(current.models ||
        {}),

      ...models,
    },

    updatedAt:
      Date.now(),
  };

  await chrome.storage.local.set({
    mutSettings:
      next,
  });

  return next.models;
}