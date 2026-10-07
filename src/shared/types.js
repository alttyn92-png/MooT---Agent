/**
 * MOOT SHARED TYPES
 *
 * В JavaScript это не TypeScript-типы,
 * а единые enum/константы по проекту.
 */

// =====================================================
// ROLES
// =====================================================

export const MESSAGE_ROLES =
  Object.freeze({
    USER:
      "user",

    ASSISTANT:
      "assistant",

    SYSTEM:
      "system",

    TOOL:
      "tool",
  });

// =====================================================
// MESSAGE SOURCES
// =====================================================

export const MESSAGE_SOURCES =
  Object.freeze({
    TEXT:
      "text",

    VOICE:
      "voice",

    IMAGE:
      "image",

    SYSTEM:
      "system",
  });

// =====================================================
// TASK STATUS
// =====================================================

export const TASK_STATUS =
  Object.freeze({
    RUNNING:
      "running",

    COMPLETED:
      "completed",

    ERROR:
      "error",

    STOPPED:
      "stopped",

    MAX_STEPS:
      "max_steps",
  });

// =====================================================
// AGENT STATE
// =====================================================

export const AGENT_STATE =
  Object.freeze({
    IDLE:
      "idle",

    THINKING:
      "thinking",

    WORKING:
      "working",

    LISTENING:
      "listening",

    SPEAKING:
      "speaking",

    STOPPED:
      "stopped",

    ERROR:
      "error",

    COMPLETE:
      "complete",
  });

// =====================================================
// TOOL CATEGORIES
// =====================================================

export const TOOL_CATEGORY =
  Object.freeze({
    PAGE:
      "page",

    ACTION:
      "action",

    BROWSER:
      "browser",

    VISION:
      "vision",

    OBSERVER:
      "observer",

    SYSTEM:
      "system",
  });

// =====================================================
// ACTION TYPES
// =====================================================

export const ACTION_TYPES =
  Object.freeze({
    CLICK:
      "click",

    DOUBLE_CLICK:
      "doubleClick",

    TYPE:
      "type",

    CLEAR:
      "clear",

    FOCUS:
      "focus",

    BLUR:
      "blur",

    SCROLL:
      "scroll",

    SCROLL_INTO_VIEW:
      "scrollIntoView",

    SELECT:
      "select",

    CHECK:
      "check",

    UNCHECK:
      "uncheck",

    HOVER:
      "hover",

    PRESS_KEY:
      "pressKey",
  });

// =====================================================
// VOICE STATE
// =====================================================

export const VOICE_STATE =
  Object.freeze({
    IDLE:
      "idle",

    LISTENING:
      "listening",

    TRANSCRIBING:
      "transcribing",

    PROCESSING:
      "processing",

    SPEAKING:
      "speaking",

    ERROR:
      "error",
  });

// =====================================================
// MEMORY TYPES
// =====================================================

export const MEMORY_TYPE =
  Object.freeze({
    PROFILE:
      "profile",

    PREFERENCE:
      "preference",

    FACT:
      "fact",

    INSTRUCTION:
      "instruction",

    PROJECT:
      "project",

    GENERAL:
      "general",
  });

// =====================================================
// MODEL TIERS
// =====================================================

export const MODEL_TIER =
  Object.freeze({
    CHEAP:
      "cheap",

    BALANCED:
      "balanced",

    STRONG:
      "strong",

    VISION:
      "vision",
  });

// =====================================================
// HELPER
// =====================================================

export function isValidEnumValue(
  enumObject,
  value
) {
  return Object.values(
    enumObject
  ).includes(
    value
  );
}