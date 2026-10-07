/**
 * MOOT NAVIGATE TOOL
 *
 * Управляет переходами по URL.
 */

export async function navigateTool({
  url,
  tabId = null,
} = {}) {
  if (
    typeof url !==
      "string" ||
    !url.trim()
  ) {
    throw new Error(
      "navigateTool requires URL."
    );
  }

  const response =
    await chrome.runtime.sendMessage({
      type:
        "NAVIGATE_TAB",

      payload: {
        url:
          normalizeUrl(
            url
          ),

        tabId:
          Number.isInteger(
            tabId
          )
            ? tabId
            : null,
      },
    });

  ensureSuccess(
    response,
    "Navigation failed."
  );

  return (
    response.tab ||
    response
  );
}

export async function openUrl({
  url,
  active = true,
} = {}) {
  if (
    typeof url !==
      "string" ||
    !url.trim()
  ) {
    throw new Error(
      "openUrl requires URL."
    );
  }

  const response =
    await chrome.runtime.sendMessage({
      type:
        "OPEN_TAB",

      payload: {
        url:
          normalizeUrl(
            url
          ),

        active:
          Boolean(
            active
          ),
      },
    });

  ensureSuccess(
    response,
    "Could not open URL."
  );

  return (
    response.tab ||
    response
  );
}

export async function reloadCurrentPage({
  bypassCache = false,
} = {}) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "RELOAD_TAB",

      payload: {
        bypassCache:
          Boolean(
            bypassCache
          ),
      },
    });

  ensureSuccess(
    response,
    "Reload failed."
  );

  return response;
}

function normalizeUrl(
  value
) {
  const text =
    String(
      value
    ).trim();

  if (
    /^https?:\/\//i.test(
      text
    )
  ) {
    return text;
  }

  if (
    text.includes(".") &&
    !text.includes(" ")
  ) {
    return `https://${text}`;
  }

  throw new Error(
    `Invalid URL: ${text}`
  );
}

function ensureSuccess(
  response,
  fallback
) {
  if (!response) {
    throw new Error(
      fallback
    );
  }

  if (
    response.success ===
    false
  ) {
    throw new Error(
      response.error ||
      fallback
    );
  }
}