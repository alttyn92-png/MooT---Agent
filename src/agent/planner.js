/**
 * MOOT PLANNER
 *
 * Преобразует ответ модели
 * в понятное решение для task-loop.
 */

import {
  validateToolCall,
  toolExists,
} from "./tool-registry.js";

// =====================================================
// TYPES
// =====================================================

export const PLAN_TYPES =
  Object.freeze({
    MESSAGE:
      "message",

    TOOL:
      "tool",

    COMPLETE:
      "complete",

    STOP:
      "stop",

    ERROR:
      "error",
  });

// =====================================================
// PARSE MODEL OUTPUT
// =====================================================

export function parseModelDecision(
  modelOutput
) {
  if (
    modelOutput === null ||
    modelOutput === undefined
  ) {
    return errorPlan(
      "Model returned no decision."
    );
  }

  if (
    typeof modelOutput ===
      "string"
  ) {
    return parseTextDecision(
      modelOutput
    );
  }

  if (
    typeof modelOutput ===
      "object" &&
    !Array.isArray(
      modelOutput
    )
  ) {
    return parseObjectDecision(
      modelOutput
    );
  }

  return errorPlan(
    "Unsupported model decision format."
  );
}

// =====================================================
// TEXT
// =====================================================

function parseTextDecision(
  text
) {
  const normalized =
    cleanText(
      text
    );

  if (!normalized) {
    return errorPlan(
      "Model returned empty text."
    );
  }

  const parsed =
    tryParseJSON(
      normalized
    );

  if (parsed) {
    return parseObjectDecision(
      parsed
    );
  }

  return {
    type:
      PLAN_TYPES.MESSAGE,

    message:
      normalized,

    continue:
      false,
  };
}

// =====================================================
// OBJECT
// =====================================================

function parseObjectDecision(
  value
) {
  // ---------------------------------------------------
  // TOOL
  // ---------------------------------------------------

  if (
    value.tool ||
    value.toolCall
  ) {
    const tool =
      normalizeToolCall(
        value.tool ||
        value.toolCall
      );

    const validation =
      validateToolCall(
        tool
      );

    if (
      !validation.valid
    ) {
      return errorPlan(
        validation.error
      );
    }

    return {
      type:
        PLAN_TYPES.TOOL,

      tool: {
        name:
          validation
            .definition
            .name,

        arguments:
          validation
            .arguments,
      },

      message:
        cleanText(
          value.message
        ),

      continue:
        value.continue !==
        false,
    };
  }

  // ---------------------------------------------------
  // COMPLETE
  // ---------------------------------------------------

  if (
    value.complete ===
      true ||
    value.done ===
      true ||
    value.status ===
      "completed"
  ) {
    return {
      type:
        PLAN_TYPES.COMPLETE,

      message:
        cleanText(
          value.message ||
          value.result ||
          "Готово."
        ),

      continue:
        false,
    };
  }

  // ---------------------------------------------------
  // STOP
  // ---------------------------------------------------

  if (
    value.stop ===
      true ||
    value.status ===
      "stopped"
  ) {
    return {
      type:
        PLAN_TYPES.STOP,

      message:
        cleanText(
          value.message ||
          "Остановлено."
        ),

      continue:
        false,
    };
  }

  // ---------------------------------------------------
  // MESSAGE
  // ---------------------------------------------------

  if (
    value.message ||
    value.text ||
    value.content
  ) {
    return {
      type:
        PLAN_TYPES.MESSAGE,

      message:
        cleanText(
          value.message ||
          value.text ||
          value.content
        ),

      continue:
        Boolean(
          value.continue
        ),
    };
  }

  return errorPlan(
    "Model decision could not be interpreted."
  );
}

// =====================================================
// TOOL NORMALIZER
// =====================================================

function normalizeToolCall(
  value
) {
  if (
    typeof value ===
      "string"
  ) {
    return {
      name:
        value,

      arguments: {},
    };
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {
      name: null,
      arguments: {},
    };
  }

  let args =
    value.arguments ??
    value.args ??
    value.input ??
    {};

  if (
    typeof args ===
      "string"
  ) {
    args =
      tryParseJSON(
        args
      ) ||
      {};
  }

  return {
    name:
      value.name ||
      value.tool ||
      value.function
        ?.name ||
      null,

    arguments:
      args &&
      typeof args ===
        "object"
        ? args
        : {},
  };
}

// =====================================================
// VALIDATE PLAN
// =====================================================

export function validatePlan(
  plan
) {
  if (
    !plan ||
    typeof plan !==
      "object"
  ) {
    return {
      valid:
        false,

      error:
        "Plan must be an object.",
    };
  }

  if (
    !Object.values(
      PLAN_TYPES
    ).includes(
      plan.type
    )
  ) {
    return {
      valid:
        false,

      error:
        `Unknown plan type: ${plan.type}`,
    };
  }

  if (
    plan.type ===
      PLAN_TYPES.TOOL
  ) {
    if (
      !plan.tool?.name ||
      !toolExists(
        plan.tool.name
      )
    ) {
      return {
        valid:
          false,

        error:
          "Invalid tool plan.",
      };
    }
  }

  return {
    valid:
      true,
  };
}

// =====================================================
// PLANNER INSTRUCTION
// =====================================================

export function buildPlannerInstruction() {
  return `
When browser work is required, use the provided function tools.

Prefer ONE meaningful browser action per turn so the result can be observed before continuing.

Do not claim that a click, navigation, form submission, message send, registration, or other browser action succeeded until you observe evidence that it actually succeeded.

When no tool is required, answer the user normally.

When the requested task is actually complete, give a concise final answer.

If the user asks to stop, stop immediately.

If a tool fails:
- inspect the new page state
- change strategy
- do not blindly repeat the exact same failed action

Do not expose private chain-of-thought. User-facing progress should only describe the action or result briefly.
`.trim();
}

// =====================================================
// ERROR PLAN
// =====================================================

function errorPlan(
  message
) {
  return {
    type:
      PLAN_TYPES.ERROR,

    error:
      String(
        message ||
        "Planner error"
      ),

    continue:
      false,
  };
}

// =====================================================
// JSON
// =====================================================

function tryParseJSON(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  let text =
    value.trim();

  text =
    text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /```\s*$/,
        ""
      )
      .trim();

  if (
    !text.startsWith(
      "{"
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return null;
  }
}

// =====================================================
// TEXT
// =====================================================

function cleanText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value ===
      "string"
  ) {
    return value.trim();
  }

  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(value);
  }
}