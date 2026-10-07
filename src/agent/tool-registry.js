/**
 * MOOT TOOL REGISTRY
 *
 * Единый список инструментов,
 * доступных модели.
 */

const TOOL_DEFINITIONS = {
  monitor: {
    name: 'monitor', category: 'action',
    description: 'Add/status/stop independent persistent chat monitors across WhatsApp, Telegram and Discord. Start ADDS a monitor without stopping others. Use one dedicated tab per monitored chat. Foreground user commands can operate across all sites while monitoring continues. Start requires observed targets and stable message IDs. Save the exact user task. Status returns all monitors with IDs and tab IDs. Stop with id stops only that monitor; omit id to stop all. Browser and chat tabs must stay open.',
    parameters: { type: 'object', required: ['action'], properties: {
      action: { type: 'string', enum: ['start', 'status', 'stop'] },
      id: { type: 'string', description: 'Monitor ID from status; for stopping one monitor. Omit to stop all.' },
      tabId: { type: 'integer', description: 'Observed dedicated chat tab ID for start; defaults to active tab.' },
      instruction: { type: 'string', description: 'User-authorized monitoring task: when to reply, tone, allowed actions and exclusions.' },
      expectedChat: { type: 'string' }, chatTarget: { type: 'object' }, messageListTarget: { type: 'object' },
      composerTarget: { type: 'object' }, sendTarget: { type: 'object' },
      messageSelector: { type: 'string', description: 'Observed CSS selector for message rows INSIDE the message list. Each row must have a unique stable ID.' },
      idAttribute: { type: 'string', description: 'Observed stable message ID attribute: id, data-id, data-mid, etc.' },
      textSelector: { type: 'string', description: 'Optional text-only descendant inside each message row, excluding timestamp/controls.' },
      outgoingSelector: { type: 'string', description: 'Observed CSS selector matching outgoing rows, to avoid replying to self.' },
      allowActions: { type: 'boolean', description: 'Enable bounded browser actions only when requested; false for replies-only.' },
    } },
  },
  messenger: {
    name: 'messenger', category: 'action',
    description: 'WhatsApp Web, Telegram Web and Discord Web: inspect controls, open a chat, draft verified text, or send once and verify it appeared in the conversation. First inspect/read_page; use observed targets. Sending needs a user request, matching current chat header, exact existing draft and message list. Never retry unconfirmed sends via another tool.',
    parameters: {
      type: 'object', required: ['action'],
      properties: {
        action: { type: 'string', enum: ['inspect', 'open_chat', 'draft', 'send'] },
        target: { type: 'object', description: 'Observed unique element: chat row for open_chat, composer for draft/send.' },
        chatTarget: { type: 'object', description: 'Observed current conversation header, not a sidebar search result.' },
        expectedChat: { type: 'string', description: 'Exact current header text. Verify recipient/channel against user request.' },
        text: { type: 'string' },
        sendTarget: { type: 'object', description: 'Observed Send button. If absent, one Enter press is attempted.' },
        messageListTarget: { type: 'object', description: 'Observed message history container, excluding composer. Required for send.' },
      },
    },
  },
  read_page: {
    name: "read_page",
    description:
      "Read the current webpage including text, forms and interactive elements.",
    category: "page",
    parameters: {
      type: "object",
      properties: {
        includeText: {
          type: "boolean",
        },

        includeInteractive: {
          type: "boolean",
        },

        includeForms: {
          type: "boolean",
        },

        includeMetadata: {
          type: "boolean",
        },

        maxElements: {
          type: "number",
        },
      },
    },
  },

  scan_dom: {
    name: "scan_dom",
    description:
      "Scan the structure of the current webpage.",
    category: "page",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  get_dom_snapshot: {
    name:
      "get_dom_snapshot",
    description:
      "Get a compact DOM snapshot of the current page.",
    category:
      "page",
    parameters: {
      type:
        "object",
      properties: {},
    },
  },

  click: {
    name:
      "click",
    description:
      "Click an element on the current webpage.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },

        delayMs: {
          type:
            "number",
        },

        smooth: {
          type:
            "boolean",
        },
      },
    },
  },

  double_click: {
    name:
      "double_click",
    description:
      "Double-click an element.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },
      },
    },
  },

  type_text: {
    name:
      "type_text",
    description:
      "Type text into an editable webpage element.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
        "text",
      ],
      properties: {
        target: {
          type:
            "object",
        },

        text: {
          type:
            "string",
        },

        replace: {
          type:
            "boolean",
        },

        humanLike: {
          type:
            "boolean",
        },

        delayMs: {
          type:
            "number",
        },
      },
    },
  },

  clear_input: {
    name:
      "clear_input",
    description:
      "Clear an editable field.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },
      },
    },
  },

  scroll: {
    name:
      "scroll",
    description:
      "Scroll the webpage or an observed scrollable panel such as a chat list or message history. Set target for nested panels.",
    category:
      "action",
    parameters: {
      type:
        "object",
      properties: {
        target: { type: 'object', description: 'Optional observed scrollable container target.' },
        direction: {
          type:
            "string",
        },

        amount: {
          type:
            "number",
        },

        x: {
          type:
            "number",
        },

        y: {
          type:
            "number",
        },

        smooth: {
          type:
            "boolean",
        },
      },
    },
  },

  scroll_into_view: {
    name:
      "scroll_into_view",
    description:
      "Scroll until the target element is visible.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },

        smooth: {
          type:
            "boolean",
        },
      },
    },
  },

  select_option: {
    name:
      "select_option",
    description:
      "Select an option in a select element.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
        "value",
      ],
      properties: {
        target: {
          type:
            "object",
        },

        value: {
          type:
            "string",
        },
      },
    },
  },

  check: {
    name:
      "check",
    description:
      "Check a checkbox or radio field.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },
      },
    },
  },

  uncheck: {
    name:
      "uncheck",
    description:
      "Uncheck a checkbox field.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "target",
      ],
      properties: {
        target: {
          type:
            "object",
        },
      },
    },
  },

  press_key: {
    name:
      "press_key",
    description:
      "Press a keyboard key.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "key",
      ],
      properties: {
        target: {
          type:
            "object",
        },

        key: {
          type:
            "string",
        },

        code: {
          type:
            "string",
        },

        ctrlKey: {
          type:
            "boolean",
        },

        shiftKey: {
          type:
            "boolean",
        },

        altKey: {
          type:
            "boolean",
        },

        metaKey: {
          type:
            "boolean",
        },
      },
    },
  },

  open_tab: {
    name:
      "open_tab",
    description:
      "Open a new browser tab.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      required: [
        "url",
      ],
      properties: {
        url: {
          type:
            "string",
        },

        active: {
          type:
            "boolean",
        },
      },
    },
  },

  navigate: {
    name:
      "navigate",
    description:
      "Navigate the current browser tab to a URL.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      required: [
        "url",
      ],
      properties: {
        url: {
          type:
            "string",
        },

        tabId: {
          type:
            "number",
        },
      },
    },
  },

  close_tab: {
    name:
      "close_tab",
    description:
      "Close a browser tab.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      properties: {
        tabId: {
          type:
            "number",
        },
      },
    },
  },

  switch_tab: {
    name:
      "switch_tab",
    description:
      "Switch to another browser tab.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      required: [
        "tabId",
      ],
      properties: {
        tabId: {
          type:
            "number",
        },
      },
    },
  },

  list_tabs: {
    name:
      "list_tabs",
    description:
      "List open tabs.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      properties: {},
    },
  },

  reload_tab: {
    name:
      "reload_tab",
    description:
      "Reload a browser tab.",
    category:
      "browser",
    parameters: {
      type:
        "object",
      properties: {
        tabId: {
          type:
            "number",
        },

        bypassCache: {
          type:
            "boolean",
        },
      },
    },
  },

  screenshot: {
    name:
      "screenshot",
    description:
      "Capture a screenshot of the visible tab.",
    category:
      "vision",
    parameters: {
      type:
        "object",
      properties: {
        format: {
          type:
            "string",
        },

        quality: {
          type:
            "number",
        },
      },
    },
  },

  wait: {
    name:
      "wait",
    description:
      "Wait for a specified number of milliseconds.",
    category:
      "observer",
    parameters: {
      type:
        "object",
      properties: {
        ms: {
          type:
            "number",
        },
      },
    },
  },

  wait_for_page_change: {
    name:
      "wait_for_page_change",
    description:
      "Wait until the webpage changes.",
    category:
      "observer",
    parameters: {
      type:
        "object",
      properties: {
        timeout: {
          type:
            "number",
        },
      },
    },
  },

  wait_for_page_stable: {
    name:
      "wait_for_page_stable",
    description:
      "Wait until the webpage stops changing.",
    category:
      "observer",
    parameters: {
      type:
        "object",
      properties: {
        quietMs: {
          type:
            "number",
        },

        timeout: {
          type:
            "number",
        },
      },
    },
  },

  fill_form: {
    name:
      "fill_form",
    description:
      "Fill multiple fields in a form.",
    category:
      "action",
    parameters: {
      type:
        "object",
      required: [
        "fields",
      ],
      properties: {
        fields: {
          type:
            "array",
          items: {
            type:
              "object",
          },
        },

        submit: {
          type:
            "boolean",
        },

        submitTarget: {
          type:
            "object",
        },
      },
    },
  },

  submit_form: {
    name:
      "submit_form",
    description:
      "Submit a form using a visible submit control.",
    category:
      "action",
    parameters: {
      type:
        "object",
      properties: {
        target: {
          type:
            "object",
        },

        submitText: {
          type:
            "string",
        },
      },
    },
  },

  stop: {
    name:
      "stop",
    description:
      "Stop the current MOOT task.",
    category:
      "system",
    parameters: {
      type:
        "object",
      properties: {},
    },
  },
};

// =====================================================
// GETTERS
// =====================================================

export function getToolDefinition(
  name
) {
  return (
    TOOL_DEFINITIONS[
      name
    ] ||
    null
  );
}

export function getAllTools() {
  return Object.values(
    TOOL_DEFINITIONS
  );
}

export function getToolNames() {
  return Object.keys(
    TOOL_DEFINITIONS
  );
}

export function toolExists(
  name
) {
  return Boolean(
    TOOL_DEFINITIONS[
      name
    ]
  );
}

// =====================================================
// VALIDATION
// =====================================================

export function validateToolCall(
  toolCall
) {
  if (
    !toolCall ||
    typeof toolCall !==
      "object"
  ) {
    return {
      valid: false,
      error:
        "Tool call must be an object.",
    };
  }

  const name =
    toolCall.name;

  if (
    !name ||
    !toolExists(
      name
    )
  ) {
    return {
      valid: false,
      error:
        `Unknown MOOT tool: ${name}`,
    };
  }

  const definition =
    getToolDefinition(
      name
    );

  const args =
    toolCall.arguments &&
    typeof toolCall.arguments ===
      "object"
      ? toolCall.arguments
      : {};

  for (
    const field of
    definition.parameters
      ?.required ||
    []
  ) {
    if (
      args[field] ===
        undefined ||
      args[field] ===
        null
    ) {
      return {
        valid: false,

        error:
          `Missing "${field}" for ${name}.`,
      };
    }
  }

  return {
    valid: true,
    definition,
    arguments:
      args,
  };
}

// =====================================================
// MODEL TOOL SCHEMA
// =====================================================

export function getFunctionToolsSchema() {
  return getAllTools().map(
    (tool) => ({
      type:
        "function",

      function: {
        name:
          tool.name,

        description:
          tool.description,

        parameters:
          tool.parameters,
      },
    })
  );
}

export function getToolsForPrompt() {
  return getAllTools().map(
    (tool) => ({
      name:
        tool.name,

      description:
        tool.description,

      category:
        tool.category,

      parameters:
        tool.parameters,
    })
  );
}

export const MOOT_TOOLS =
  Object.freeze(
    TOOL_DEFINITIONS
  );
