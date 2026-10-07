/**
 * MOOT CLICK TOOL
 *
 * Высокоуровневый инструмент клика.
 *
 * Использует content-script -> action-executor.
 */

export async function clickTool({
  target,
  delayMs = 0,
  smooth = false,
  highlight = true,
} = {}) {
  if (
    !target ||
    typeof target !== "object"
  ) {
    throw new Error(
      "clickTool requires target."
    );
  }

  return sendPageAction({
    type: "click",

    target,

    options: {
      delayMs,
      smooth,
      highlight,
    },
  });
}

export async function doubleClickTool({
  target,
  highlight = true,
} = {}) {
  if (
    !target ||
    typeof target !== "object"
  ) {
    throw new Error(
      "doubleClickTool requires target."
    );
  }

  return sendPageAction({
    type: "doubleClick",

    target,

    options: {
      highlight,
    },
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

  if (!response) {
    throw new Error(
      "MOOT background returned no response."
    );
  }

  if (
    response.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Click failed."
    );
  }

  const pageResponse =
    response.response;

  if (
    pageResponse?.success ===
    false
  ) {
    throw new Error(
      pageResponse.error ||
      "Page click failed."
    );
  }

  return (
    pageResponse?.result ||
    pageResponse ||
    response
  );
}