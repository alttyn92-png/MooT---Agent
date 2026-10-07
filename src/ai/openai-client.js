import { fetchWithTimeout } from './request.js';
/**
 * MOOT OPENAI CLIENT
 *
 * OpenAI Responses API client.
 *
 * API key хранится локально:
 *
 * chrome.storage.local
 * -> mutSettings.openai.apiKey
 */

import {
  selectModel,
  classifyTask,
  estimateContextSize,
} from "./model-router.js";

// =====================================================
// CONSTANTS
// =====================================================

const RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_TIMEOUT =
  120000;

// =====================================================
// CLIENT
// =====================================================

export class MutOpenAIClient {
  constructor(
    options = {}
  ) {
    this.baseURL =
      options.baseURL ||
      RESPONSES_URL;

    this.timeout =
      options.timeout ||
      DEFAULT_TIMEOUT;

    this.apiKey =
      options.apiKey ||
      null;
  }

  // ===================================================
  // API KEY
  // ===================================================

  async getApiKey() {
    if (
      this.apiKey
    ) {
      return String(
        this.apiKey
      ).trim();
    }

    if (
      typeof chrome ===
        "undefined" ||
      !chrome.storage?.local
    ) {
      throw new Error(
        "OpenAI API key is not configured."
      );
    }

    const result =
      await chrome.storage.local.get(
        "mutSettings"
      );

    const key =
      result.mutSettings
        ?.openai
        ?.apiKey;

    if (
      typeof key !==
        "string" ||
      !key.trim()
    ) {
      throw new Error(
        "OpenAI API key is missing. Open MOOT settings and add your API key."
      );
    }

    return key.trim();
  }

  // ===================================================
  // RAW RESPONSE
  // ===================================================

  async createResponse({
    model,

    instructions = "",

    input,

    tools = [],

    reasoningEffort =
      "low",

    maxOutputTokens =
      4096,

    metadata = null,

    signal = null,
  } = {}) {
    if (!model) {
      throw new Error(
        "OpenAI model is required."
      );
    }

    if (
      input ===
        undefined ||
      input === null
    ) {
      throw new Error(
        "OpenAI input is required."
      );
    }

    const apiKey =
      await this.getApiKey();

    const body = {
      model,

      input,

      max_output_tokens:
        maxOutputTokens,
    };

    if (
      String(
        instructions ||
        ""
      ).trim()
    ) {
      body.instructions =
        String(
          instructions
        ).trim();
    }

    if (
      reasoningEffort
    ) {
      body.reasoning = {
        effort:
          reasoningEffort,
      };
    }

    const normalizedTools =
      normalizeTools(
        tools
      );

    if (
      normalizedTools.length
    ) {
      body.parallel_tool_calls = false;
      body.tools =
        normalizedTools;

      body.tool_choice =
        "auto";
    }

    if (
      metadata &&
      typeof metadata ===
        "object"
    ) {
      body.metadata =
        normalizeMetadata(
          metadata
        );
    }

    const response =
      await fetchWithTimeout(
        this.baseURL,
        {
          method:
            "POST",

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

          signal,
        },
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

    return normalizeResponse(
      data
    );
  }

  // ===================================================
  // AGENT DECISION
  // ===================================================

  async decide({
    userMessage = "",

    systemPrompt = "",

    conversation = [],

    tools = [],

    browserContext = null,

    taskState = null,

    step = 1,

    consecutiveErrors = 0,

    images = [],

    forceModel = null,
    signal = null,
  } = {}) {
    const hasImage =
      Array.isArray(
        images
      ) &&
      images.length > 0;

    const taskType =
      classifyTask({
        userMessage,

        hasImage,

        consecutiveErrors,
      });

    const contextSize =
      estimateContextSize({
        systemPrompt,
        userMessage,

        conversation,

        browserContext,

        taskState,
      });

    const selected =
      await selectModel({
        taskType,

        step,

        consecutiveErrors,

        hasImage,

        contextSize,

        forceModel,
      });

    const input =
      buildInput({
        userMessage,

        conversation,

        browserContext,

        taskState,

        images,
      });

    return this.createResponse({
      signal,
      model:
        selected.model,

      instructions:
        systemPrompt,

      input,

      tools,

      reasoningEffort:
        selected.reasoningEffort,

      maxOutputTokens:
        4096,

      metadata: {
        mut_task_type:
          taskType,

        mut_model_reason:
          selected.reason,

        mut_step:
          String(step),
      },
    });
  }

  // ===================================================
  // TEST
  // ===================================================

  async testConnection({
    model =
      "gpt-5.6-luna",
  } = {}) {
    const response =
      await this.createResponse({
        model,

        input:
          "Reply with exactly MOOT_OK",

        reasoningEffort:
          "none",

        maxOutputTokens:
          32,
      });

    return {
      ok:
        response.text
          .trim() ===
        "MOOT_OK",

      model:
        response.model,

      responseId:
        response.id,
    };
  }
}

// =====================================================
// INPUT BUILDER
// =====================================================

function buildInput({
  userMessage,
  conversation,
  browserContext,
  taskState,
  images,
}) {
  const input = [];
  conversation = [...(conversation || [])];
  if (conversation.at(-1)?.role === 'user' && conversation.at(-1)?.content === userMessage) conversation.pop();

  // ---------------------------------------------------
  // HISTORY
  // ---------------------------------------------------

  for (
    const message of
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
        message?.role
      )
    ) {
      continue;
    }

    const content =
      String(
        message.content ||
        ""
      ).trim();

    if (!content) {
      continue;
    }

    input.push({
      role:
        message.role,

      content,
    });
  }

  // ---------------------------------------------------
  // CURRENT USER CONTENT
  // ---------------------------------------------------

  const content = [];

  if (
    String(
      userMessage ||
      ""
    ).trim()
  ) {
    content.push({
      type:
        "input_text",

      text:
        String(
          userMessage
        ).trim(),
    });
  }

  if (
    browserContext
  ) {
    content.push({
      type:
        "input_text",

      text:
        `CURRENT_BROWSER_OBSERVATION:\n${safeStringify(
          sanitizeContext(
            browserContext
          )
        )}`,
    });
  }

  if (
    taskState
  ) {
    content.push({
      type:
        "input_text",

      text:
        `CURRENT_TASK_STATE:\n${safeStringify(
          sanitizeContext(
            taskState
          )
        )}`,
    });
  }

  for (
    const image of
    Array.isArray(
      images
    )
      ? images
      : []
  ) {
    const imageUrl =
      normalizeImage(
        image
      );

    if (!imageUrl) {
      continue;
    }

    content.push({
      type:
        "input_image",

      image_url:
        imageUrl,

      detail:
        "auto",
    });
  }

  if (
    content.length
  ) {
    input.push({
      role:
        "user",

      content,
    });
  }

  return input;
}

// =====================================================
// RESPONSES API TOOL NORMALIZATION
// =====================================================

function normalizeTools(
  tools
) {
  if (
    !Array.isArray(
      tools
    )
  ) {
    return [];
  }

  return tools
    .map(
      (
        tool
      ) => {
        // Already Responses format.
        if (
          tool?.type ===
            "function" &&
          tool.name
        ) {
          return {
            type: "function",
          strict: false,

            name:
              tool.name,

            description:
              tool.description ||
              "",

            parameters:
              normalizeParameters(
                tool.parameters
              ),
          };
        }

        // Registry currently emits wrapper format.
        if (
          tool?.type ===
            "function" &&
          tool.function
            ?.name
        ) {
          return {
            type: "function",
          strict: false,

            name:
              tool.function
                .name,

            description:
              tool.function
                .description ||
              "",

            parameters:
              normalizeParameters(
                tool.function
                  .parameters
              ),
          };
        }

        if (
          tool?.name
        ) {
          return {
            type: "function",
          strict: false,

            name:
              tool.name,

            description:
              tool.description ||
              "",

            parameters:
              normalizeParameters(
                tool.parameters
              ),
          };
        }

        return null;
      }
    )
    .filter(Boolean);
}

// =====================================================
// PARAMETERS
// =====================================================

function normalizeParameters(
  parameters
) {
  if (
    !parameters ||
    typeof parameters !==
      "object"
  ) {
    return {
      type:
        "object",

      properties: {},
      additionalProperties:
        false,
    };
  }

  return {
    type:
      "object",

    properties:
      parameters.properties ||
      {},

    ...(Array.isArray(
      parameters.required
    )
      ? {
          required:
            parameters.required,
        }
      : {}),

    additionalProperties:
      false,
  };
}

// =====================================================
// RESPONSE NORMALIZATION
// =====================================================

function normalizeResponse(
  data
) {
  return {
    id:
      data.id ||
      null,

    model:
      data.model ||
      null,

    status:
      data.status ||
      null,

    text:
      extractText(
        data
      ),

    toolCalls:
      extractToolCalls(
        data
      ),

    usage:
      data.usage ||
      null,

    output:
      data.output ||
      [],

    raw:
      data,
  };
}

// =====================================================
// TEXT
// =====================================================

function extractText(
  data
) {
  if (
    typeof data.output_text ===
      "string"
  ) {
    return data.output_text;
  }

  const parts = [];

  for (
    const item of
    data.output ||
    []
  ) {
    if (
      item.type !==
      "message"
    ) {
      continue;
    }

    for (
      const content of
      item.content ||
      []
    ) {
      if (
        content.type ===
          "output_text" &&
        typeof content.text ===
          "string"
      ) {
        parts.push(
          content.text
        );
      }
    }
  }

  return parts
    .join("\n")
    .trim();
}

// =====================================================
// TOOL CALLS
// =====================================================

function extractToolCalls(
  data
) {
  const calls = [];

  for (
    const item of
    data.output ||
    []
  ) {
    if (
      item.type !==
      "function_call"
    ) {
      continue;
    }

    let args =
      {};

    if (
      typeof item.arguments ===
        "string"
    ) {
      try {
        args =
          JSON.parse(
            item.arguments
          );
      } catch {
        args =
          {};
      }
    } else if (
      item.arguments &&
      typeof item.arguments ===
        "object"
    ) {
      args =
        item.arguments;
    }

    calls.push({
      id:
        item.id ||
        null,

      callId:
        item.call_id ||
        null,

      name:
        item.name ||
        null,

      arguments:
        args,
    });
  }

  return calls;
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
// SANITIZE
// =====================================================

function sanitizeContext(
  value
) {
  let clone;

  try {
    clone =
      JSON.parse(
        JSON.stringify(
          value
        )
      );
  } catch {
    return value;
  }

  removeBinaryData(
    clone
  );

  return clone;
}

function removeBinaryData(
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

  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
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
      child &&
      typeof child ===
        "object"
    ) {
      removeBinaryData(
        child,
        depth + 1
      );
    }
  }
}

// =====================================================
// METADATA
// =====================================================

function normalizeMetadata(
  metadata
) {
  const result = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(
      metadata
    )
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    result[
      String(
        key
      ).slice(
        0,
        64
      )
    ] =
      String(
        value
      ).slice(
        0,
        512
      );
  }

  return result;
}

// =====================================================
// FETCH
// =====================================================


// =====================================================
// RESPONSE PARSER
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
// API ERROR
// =====================================================

function createAPIError(
  data,
  status
) {
  const message =
    data?.error?.message ||
    data?.message ||
    `OpenAI API error (${status}).`;

  const error =
    new Error(message);

  error.status =
    status;

  error.code =
    data?.error?.code ||
    null;

  error.type =
    data?.error?.type ||
    null;

  return error;
}

// =====================================================
// JSON
// =====================================================

function safeStringify(
  value
) {
  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(value);
  }
}

// =====================================================
// DEFAULT
// =====================================================

export const openAI =
  new MutOpenAIClient();
