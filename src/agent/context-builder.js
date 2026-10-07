/**
 * MOOT CONTEXT BUILDER
 *
 * Собирает компактный контекст,
 * который отправляется модели.
 */

import {
  getToolsForPrompt,
} from "./tool-registry.js";

import {
  buildSystemPrompt,
} from "./system-prompt.js";
import { monitorEntries } from '../background/monitor-store.js';

// =====================================================
// MAIN
// =====================================================

export async function buildAgentContext({
  userMessage = "",

  userProfile = "",

  conversation = [],

  browserState = null,

  pageState = null,

  taskState = null,

  extraContext = "",
} = {}) {
  const tools =
    getToolsForPrompt();

  const stored = await chrome.storage.local.get('mootMonitor');
  const monitors = monitorEntries(stored.mootMonitor).filter(item => item.enabled).map(item => ({
    id: item.id, tabId: item.tabId, url: item.url, chat: item.config.expectedChat,
    instruction: item.config.instruction, status: item.status,
  }));
  extraContext += '\nBACKGROUND MONITORS (independent of the current request; preserve their tabs):\n' + JSON.stringify(monitors);

  const currentContext =
    buildCurrentContext({
      userMessage,

      browserState,

      pageState,

      taskState,

      extraContext,
    });

  const systemPrompt =
    buildSystemPrompt({
      userProfile,

      tools,

      currentContext,
    });

  return {
    systemPrompt,

    conversation:
      normalizeConversation(
        conversation
      ),

    tools,

    currentContext,

    metadata: {
      builtAt:
        Date.now(),

      hasProfile:
        Boolean(
          String(
            userProfile ||
            ""
          ).trim()
        ),

      hasBrowser:
        Boolean(
          browserState
        ),

      hasPage:
        Boolean(
          pageState
        ),

      hasTask:
        Boolean(
          taskState
        ),
    },
  };
}

// =====================================================
// CURRENT CONTEXT
// =====================================================

function buildCurrentContext({
  userMessage,
  browserState,
  pageState,
  taskState,
  extraContext,
}) {
  const sections = [];

  if (
    String(
      userMessage ||
      ""
    ).trim()
  ) {
    sections.push(
      [
        "CURRENT USER REQUEST",
        String(
          userMessage
        ).trim(),
      ].join("\n")
    );
  }

  if (
    browserState
  ) {
    sections.push(
      [
        "CURRENT BROWSER",
        compactJSON(
          sanitizeContext(
            browserState
          )
        ),
      ].join("\n")
    );
  }

  if (
    pageState
  ) {
    sections.push(
      [
        "CURRENT PAGE OBSERVATION",
        compactJSON(
          sanitizeContext(
            pageState
          )
        ),
      ].join("\n")
    );
  }

  if (
    taskState
  ) {
    sections.push(
      [
        "CURRENT TASK",
        compactJSON(
          sanitizeContext(
            taskState
          )
        ),
      ].join("\n")
    );
  }

  if (
    String(
      extraContext ||
      ""
    ).trim()
  ) {
    sections.push(
      [
        "EXTRA CONTEXT",
        String(
          extraContext
        ).trim(),
      ].join("\n")
    );
  }

  return sections
    .join("\n\n")
    .trim();
}

// =====================================================
// NORMALIZE CONVERSATION
// =====================================================

export function normalizeConversation(
  conversation = []
) {
  if (
    !Array.isArray(
      conversation
    )
  ) {
    return [];
  }

  return conversation
    .filter(
      (
        message
      ) =>
        message &&
        [
          "user",
          "assistant",
        ].includes(
          message.role
        )
    )
    .map(
      (
        message
      ) => ({
        role:
          message.role,

        content:
          normalizeContent(
            message.content
          ),

        createdAt:
          message.createdAt ||
          null,
      })
    )
    .filter(
      (
        message
      ) =>
        Boolean(
          message.content
        )
    );
}

// =====================================================
// COMPACT CONVERSATION
// =====================================================

export function compactConversation(
  conversation = [],
  {
    maxMessages = 30,
    maxCharacters = 30000,
  } = {}
) {
  const normalized =
    normalizeConversation(
      conversation
    );

  const recent =
    normalized.slice(
      -Math.max(
        1,
        maxMessages
      )
    );

  const result = [];

  let totalCharacters =
    0;

  for (
    let i =
      recent.length - 1;
    i >= 0;
    i--
  ) {
    const message =
      recent[i];

    const size =
      message.content.length;

    if (
      result.length > 0 &&
      totalCharacters +
        size >
        maxCharacters
    ) {
      break;
    }

    totalCharacters +=
      size;

    result.unshift(
      message
    );
  }

  return result;
}

// =====================================================
// SANITIZE CONTEXT
// =====================================================

function sanitizeContext(
  value
) {
  const clone =
    safeClone(
      value
    );

  removeSensitiveData(
    clone
  );

  return clone;
}

// =====================================================
// REMOVE SENSITIVE / LARGE DATA
// =====================================================

function removeSensitiveData(
  value,
  depth = 0
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    depth > 12
  ) {
    return;
  }

  const sensitiveKeys = [
    "password",
    "passwd",
    "apikey",
    "api_key",
    "authorization",
    "token",
    "secret",
    "privatekey",
    "private_key",
  ];

  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
    const normalizedKey =
      String(
        key
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9_]/g,
          ""
        );

    const sensitive =
      sensitiveKeys.some(
        (
          sensitiveKey
        ) =>
          normalizedKey.includes(
            sensitiveKey
          )
      );

    if (
      sensitive
    ) {
      value[key] =
        "[REDACTED]";

      continue;
    }

    if (
      typeof child ===
        "string" &&
      (
        child.startsWith(
          "data:image/"
        ) ||
        child.startsWith(
          "data:audio/"
        )
      )
    ) {
      value[key] =
        "[BINARY_DATA_REMOVED]";

      continue;
    }

    if (
      typeof child ===
        "string" &&
      child.length >
        25000
    ) {
      value[key] =
        child.slice(
          0,
          25000
        ) + "…";

      continue;
    }

    if (
      child &&
      typeof child ===
        "object"
    ) {
      removeSensitiveData(
        child,
        depth + 1
      );
    }
  }
}

// =====================================================
// CONTENT
// =====================================================

function normalizeContent(
  content
) {
  if (
    content === null ||
    content === undefined
  ) {
    return "";
  }

  if (
    typeof content ===
      "string"
  ) {
    return content.trim();
  }

  try {
    return JSON.stringify(
      content
    );
  } catch {
    return String(
      content
    );
  }
}

// =====================================================
// JSON
// =====================================================

function compactJSON(
  value
) {
  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(
      value
    );
  }
}

// =====================================================
// CLONE
// =====================================================

function safeClone(
  value
) {
  try {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  } catch {
    return value;
  }
}
