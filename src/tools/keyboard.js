/**
 * MOOT KEYBOARD TOOL
 *
 * Управляет клавиатурными событиями страницы.
 */

export async function pressKeyTool({
  target = null,
  key,
  code = null,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  metaKey = false,
  highlight = false,
} = {}) {
  if (!key) {
    throw new Error(
      "pressKeyTool requires key."
    );
  }

  const action = {
    type:
      "pressKey",

    key:
      String(key),

    options: {
      code:
        code ||
        String(key),

      ctrlKey:
        Boolean(
          ctrlKey
        ),

      shiftKey:
        Boolean(
          shiftKey
        ),

      altKey:
        Boolean(
          altKey
        ),

      metaKey:
        Boolean(
          metaKey
        ),

      highlight:
        Boolean(
          highlight
        ),
    },
  };

  if (target) {
    action.target =
      target;
  }

  return sendAction(
    action
  );
}

export async function pressEnter(
  target = null
) {
  return pressKeyTool({
    target,
    key:
      "Enter",
    code:
      "Enter",
  });
}

export async function pressEscape(
  target = null
) {
  return pressKeyTool({
    target,
    key:
      "Escape",
    code:
      "Escape",
  });
}

export async function pressTab(
  target = null
) {
  return pressKeyTool({
    target,
    key:
      "Tab",
    code:
      "Tab",
  });
}

export async function pressArrowDown(
  target = null
) {
  return pressKeyTool({
    target,
    key:
      "ArrowDown",
    code:
      "ArrowDown",
  });
}

export async function pressArrowUp(
  target = null
) {
  return pressKeyTool({
    target,
    key:
      "ArrowUp",
    code:
      "ArrowUp",
  });
}

export async function pressShortcut({
  target = null,
  key,
  ctrl = false,
  shift = false,
  alt = false,
  meta = false,
} = {}) {
  return pressKeyTool({
    target,
    key,
    ctrlKey:
      ctrl,
    shiftKey:
      shift,
    altKey:
      alt,
    metaKey:
      meta,
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
      "Keyboard action failed."
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
      "Page keyboard action failed."
    );
  }

  return (
    pageResponse?.result ||
    pageResponse ||
    response
  );
}