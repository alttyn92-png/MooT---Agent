/**
 * MOOT WAIT TOOL
 *
 * Ожидание:
 * - времени
 * - изменения страницы
 * - стабилизации страницы
 */

export async function waitTool({
  ms = 500,
} = {}) {
  const delay =
    Number.isFinite(
      ms
    )
      ? Math.max(
          0,
          ms
        )
      : 500;

  await new Promise(
    (
      resolve
    ) =>
      setTimeout(
        resolve,
        delay
      )
  );

  return {
    waited: true,
    ms:
      delay,
  };
}

export async function waitForPageChangeTool({
  timeout = 10000,
} = {}) {
  return sendPageCommand({
    type:
      "WAIT_FOR_PAGE_CHANGE",

    options: {
      timeout,
    },
  });
}

export async function waitForPageStableTool({
  quietMs = 800,
  timeout = 10000,
} = {}) {
  return sendPageCommand({
    type:
      "WAIT_FOR_PAGE_STABLE",

    options: {
      quietMs,
      timeout,
    },
  });
}

export async function getPageChangesTool({
  since = 0,
  limit = 100,
} = {}) {
  const response =
    await sendPageCommand({
      type:
        "GET_PAGE_CHANGES",

      options: {
        since,
        limit,
      },
    });

  return {
    observer:
      response.observer ||
      null,

    changes:
      response.changes ||
      [],
  };
}

export async function clearPageChangesTool() {
  return sendPageCommand({
    type:
      "CLEAR_PAGE_CHANGES",
  });
}

async function sendPageCommand(
  command
) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "SEND_TO_PAGE",

      payload: {
        command,
      },
    });

  if (
    response?.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Wait operation failed."
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
      "Page wait failed."
    );
  }

  return (
    pageResponse ||
    response
  );
}