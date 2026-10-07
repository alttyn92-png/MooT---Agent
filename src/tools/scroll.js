/**
 * MOOT SCROLL TOOL
 *
 * Управляет прокруткой страницы.
 */

export async function scrollTool({
  target = null,
  direction = null,
  amount = 600,
  x = 0,
  y = 0,
  smooth = false,
} = {}) {
  return sendPageAction({
    type:
      "scroll",

    options: {
      target,
      direction,

      amount:
        Number.isFinite(
          amount
        )
          ? amount
          : 600,

      x:
        Number.isFinite(
          x
        )
          ? x
          : 0,

      y:
        Number.isFinite(
          y
        )
          ? y
          : 0,

      smooth:
        Boolean(
          smooth
        ),
    },
  });
}

export async function scrollDown(
  amount = 600
) {
  return scrollTool({
    direction:
      "down",

    amount,
  });
}

export async function scrollUp(
  amount = 600
) {
  return scrollTool({
    direction:
      "up",

    amount,
  });
}

export async function scrollTop() {
  return scrollTool({
    direction:
      "top",
  });
}

export async function scrollBottom() {
  return scrollTool({
    direction:
      "bottom",
  });
}

export async function scrollIntoViewTool({
  target,
  smooth = false,
  block = "center",
  inline = "nearest",
} = {}) {
  if (!target) {
    throw new Error(
      "scrollIntoViewTool requires target."
    );
  }

  return sendPageAction({
    type:
      "scrollIntoView",

    target,

    options: {
      smooth,
      block,
      inline,
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

  if (
    response?.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Scroll failed."
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
      "Page scroll failed."
    );
  }

  return (
    pageResponse?.result ||
    pageResponse ||
    response
  );
}
