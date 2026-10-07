/**
 * MOOT TYPE TOOL
 *
 * Ввод текста в:
 * - input
 * - textarea
 * - contenteditable
 */

export async function typeTool({
  target,
  text,
  replace = true,
  humanLike = false,
  delayMs = 30,
  highlight = true,
} = {}) {
  if (
    !target ||
    typeof target !== "object"
  ) {
    throw new Error(
      "typeTool requires target."
    );
  }

  if (
    text === undefined ||
    text === null
  ) {
    throw new Error(
      "typeTool requires text."
    );
  }

  return sendPageAction({
    type:
      "type",

    target,

    text:
      String(text),

    options: {
      replace:
        Boolean(
          replace
        ),

      humanLike:
        Boolean(
          humanLike
        ),

      delayMs:
        Number.isFinite(
          delayMs
        )
          ? delayMs
          : 30,

      highlight:
        Boolean(
          highlight
        ),
    },
  });
}

export async function clearTool({
  target,
  highlight = false,
} = {}) {
  if (
    !target ||
    typeof target !== "object"
  ) {
    throw new Error(
      "clearTool requires target."
    );
  }

  return sendPageAction({
    type:
      "clear",

    target,

    options: {
      highlight,
    },
  });
}

export async function focusTool({
  target,
} = {}) {
  if (!target) {
    throw new Error(
      "focusTool requires target."
    );
  }

  return sendPageAction({
    type:
      "focus",

    target,
  });
}

export async function blurTool({
  target,
} = {}) {
  if (!target) {
    throw new Error(
      "blurTool requires target."
    );
  }

  return sendPageAction({
    type:
      "blur",

    target,
  });
}

async function sendPageAction(
  action
) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "SEND_TO_PAGE",

      payload: {
        command: {
          type:
            "EXECUTE_ACTION",

          action,
        },
      },
    });

  if (
    response?.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Typing action failed."
    );
  }

  const pageResponse =
    response?.response;

  if (
    pageResponse?.success ===
    false
  ) {
    throw new Error(
      pageResponse.error ||
      "Page typing failed."
    );
  }

  return (
    pageResponse?.result ||
    pageResponse ||
    response
  );
}