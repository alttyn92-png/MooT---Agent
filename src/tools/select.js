/**
 * MOOT SELECT TOOL
 *
 * Работает с:
 * - select
 * - checkbox
 * - radio
 */

export async function selectOptionTool({
  target,
  value,
  highlight = true,
} = {}) {
  if (!target) {
    throw new Error(
      "selectOptionTool requires target."
    );
  }

  if (
    value === null ||
    value === undefined
  ) {
    throw new Error(
      "selectOptionTool requires value."
    );
  }

  return sendAction({
    type:
      "select",

    target,

    value:
      String(value),

    options: {
      highlight,
    },
  });
}

export async function checkTool({
  target,
  highlight = true,
} = {}) {
  if (!target) {
    throw new Error(
      "checkTool requires target."
    );
  }

  return sendAction({
    type:
      "check",

    target,

    options: {
      highlight,
    },
  });
}

export async function uncheckTool({
  target,
  highlight = true,
} = {}) {
  if (!target) {
    throw new Error(
      "uncheckTool requires target."
    );
  }

  return sendAction({
    type:
      "uncheck",

    target,

    options: {
      highlight,
    },
  });
}

async function sendAction(
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
      "Select action failed."
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
      "Page select action failed."
    );
  }

  return (
    pageResponse?.result ||
    pageResponse ||
    response
  );
}