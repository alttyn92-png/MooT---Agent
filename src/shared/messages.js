/**
 * MOOT SHARED MESSAGES
 *
 * Единые названия сообщений между:
 *
 * Side Panel
 * Background
 * Content Script
 * Agent
 *
 * Нужен, чтобы не писать строки руками
 * по всему проекту.
 */

// =====================================================
// BACKGROUND MESSAGE TYPES
// =====================================================

export const BACKGROUND_MESSAGES =
  Object.freeze({
    PING:
      "PING",

    GET_EXTENSION_INFO:
      "GET_EXTENSION_INFO",

    GET_MOOT_STATE:
      "GET_MOOT_STATE",

    SET_MOOT_STATE:
      "SET_MOOT_STATE",

    GET_SETTINGS:
      "GET_SETTINGS",

    UPDATE_SETTINGS:
      "UPDATE_SETTINGS",

    GET_ACTIVE_TAB:
      "GET_ACTIVE_TAB",

    GET_CURRENT_PAGE:
      "GET_CURRENT_PAGE",

    OPEN_TAB:
      "OPEN_TAB",

    CLOSE_TAB:
      "CLOSE_TAB",

    SWITCH_TAB:
      "SWITCH_TAB",

    RELOAD_TAB:
      "RELOAD_TAB",

    NAVIGATE_TAB:
      "NAVIGATE_TAB",

    LIST_TABS:
      "LIST_TABS",

    SEND_TO_PAGE:
      "SEND_TO_PAGE",

    CHECK_PAGE_CONNECTION:
      "CHECK_PAGE_CONNECTION",

    CAPTURE_VISIBLE_TAB:
      "CAPTURE_VISIBLE_TAB",

    STOP_MOOT:
      "STOP_MOOT",

    PAGE_EVENT:
      "PAGE_EVENT",

    MOOT_STATE_UPDATED:
      "MOOT_STATE_UPDATED",
  });

// =====================================================
// CONTENT MESSAGE TYPES
// =====================================================

export const PAGE_MESSAGES =
  Object.freeze({
    PING_PAGE:
      "PING_PAGE",

    READ_PAGE:
      "READ_PAGE",

    READ_PAGE_TEXT:
      "READ_PAGE_TEXT",

    GET_INTERACTIVE_ELEMENTS:
      "GET_INTERACTIVE_ELEMENTS",

    GET_FORMS:
      "GET_FORMS",

    GET_PAGE_METADATA:
      "GET_PAGE_METADATA",

    GET_SELECTION:
      "GET_SELECTION",

    GET_PAGE_STATE:
      "GET_PAGE_STATE",

    SCAN_DOM:
      "SCAN_DOM",

    GET_DOM_SNAPSHOT:
      "GET_DOM_SNAPSHOT",

    EXECUTE_ACTION:
      "EXECUTE_ACTION",

    GET_PAGE_CHANGES:
      "GET_PAGE_CHANGES",

    CLEAR_PAGE_CHANGES:
      "CLEAR_PAGE_CHANGES",

    WAIT_FOR_PAGE_CHANGE:
      "WAIT_FOR_PAGE_CHANGE",

    WAIT_FOR_PAGE_STABLE:
      "WAIT_FOR_PAGE_STABLE",

    START_PAGE_OBSERVER:
      "START_PAGE_OBSERVER",

    STOP_PAGE_OBSERVER:
      "STOP_PAGE_OBSERVER",

    GET_PAGE_OBSERVER_STATE:
      "GET_PAGE_OBSERVER_STATE",
  });

// =====================================================
// AGENT EVENTS
// =====================================================

export const AGENT_EVENTS =
  Object.freeze({
    MESSAGE:
      "message",

    PROGRESS:
      "progress",

    STEP:
      "step",

    ERROR:
      "error",

    STATE:
      "state",

    STOPPED:
      "stopped",

    TASK_COMPLETE:
      "task_complete",

    CONVERSATION_CLEARED:
      "conversation_cleared",
  });

// =====================================================
// VOICE EVENTS
// =====================================================

export const VOICE_EVENTS =
  Object.freeze({
    STATE:
      "state",

    LISTENING_STARTED:
      "listening_started",

    LISTENING_CANCELLED:
      "listening_cancelled",

    RECORDING_READY:
      "recording_ready",

    TRANSCRIPT:
      "transcript",

    MOOT_RESPONSE:
      "mut_response",

    SPEECH_STARTED:
      "speech_started",

    SPEECH_ENDED:
      "speech_ended",

    ERROR:
      "error",
  });

// =====================================================
// PAGE EVENTS
// =====================================================

export const PAGE_EVENTS =
  Object.freeze({
    PAGE_CONNECTED:
      "PAGE_CONNECTED",

    PAGE_LOADED:
      "PAGE_LOADED",

    DOM_READY:
      "DOM_READY",

    PAGE_FOCUS:
      "PAGE_FOCUS",

    PAGE_BLUR:
      "PAGE_BLUR",

    PAGE_VISIBILITY_CHANGED:
      "PAGE_VISIBILITY_CHANGED",

    PAGE_URL_CHANGED:
      "PAGE_URL_CHANGED",
  });

// =====================================================
// MESSAGE FACTORIES
// =====================================================

export function createRuntimeMessage(
  type,
  payload = null
) {
  if (!type) {
    throw new Error(
      "Runtime message requires type."
    );
  }

  return {
    type,

    payload,

    timestamp:
      Date.now(),
  };
}

export function createPageCommand(
  type,
  data = {}
) {
  if (!type) {
    throw new Error(
      "Page command requires type."
    );
  }

  return {
    type,

    ...data,

    timestamp:
      Date.now(),
  };
}

export function createPageAction(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    throw new Error(
      "Page action must be an object."
    );
  }

  return {
    type:
      PAGE_MESSAGES.EXECUTE_ACTION,

    action,

    timestamp:
      Date.now(),
  };
}

// =====================================================
// RESPONSE HELPERS
// =====================================================

export function createSuccessResponse(
  data = {}
) {
  return {
    success: true,

    ...data,

    timestamp:
      Date.now(),
  };
}

export function createErrorResponse(
  error
) {
  return {
    success: false,

    error:
      error?.message ||
      String(
        error ||
        "Unknown error"
      ),

    timestamp:
      Date.now(),
  };
}