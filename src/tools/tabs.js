/**
 * MOOT TABS TOOL
 *
 * Высокоуровневое управление вкладками Chrome.
 */

export async function listTabsTool() {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "LIST_TABS",
    });

  ensureSuccess(
    response,
    "Failed to list tabs."
  );

  return (
    response.tabs ||
    []
  );
}

export async function getActiveTabTool() {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "GET_ACTIVE_TAB",
    });

  ensureSuccess(
    response,
    "Failed to get active tab."
  );

  return (
    response.tab ||
    null
  );
}

export async function openTabTool({
  url =
    "about:blank",

  active =
    true,
} = {}) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "OPEN_TAB",

      payload: {
        url,
        active,
      },
    });

  ensureSuccess(
    response,
    "Failed to open tab."
  );

  return (
    response.tab ||
    null
  );
}

export async function switchTabTool({
  tabId,
} = {}) {
  if (
    !Number.isInteger(
      tabId
    )
  ) {
    throw new Error(
      "switchTabTool requires tabId."
    );
  }

  const response =
    await chrome.runtime.sendMessage({
      type:
        "SWITCH_TAB",

      payload: {
        tabId,
      },
    });

  ensureSuccess(
    response,
    "Failed to switch tab."
  );

  return (
    response.tab ||
    null
  );
}

export async function closeTabTool({
  tabId = null,
} = {}) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "CLOSE_TAB",

      payload: {
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
    "Failed to close tab."
  );

  return response;
}

export async function reloadTabTool({
  tabId = null,
  bypassCache = false,
} = {}) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "RELOAD_TAB",

      payload: {
        tabId:
          Number.isInteger(
            tabId
          )
            ? tabId
            : null,

        bypassCache:
          Boolean(
            bypassCache
          ),
      },
    });

  ensureSuccess(
    response,
    "Failed to reload tab."
  );

  return response;
}

export async function findTab({
  title = null,
  url = null,
} = {}) {
  const tabs =
    await listTabsTool();

  const normalizedTitle =
    String(
      title || ""
    )
      .trim()
      .toLowerCase();

  const normalizedUrl =
    String(
      url || ""
    )
      .trim()
      .toLowerCase();

  return (
    tabs.find(
      (
        tab
      ) => {
        if (
          normalizedTitle &&
          String(
            tab.title || ""
          )
            .toLowerCase()
            .includes(
              normalizedTitle
            )
        ) {
          return true;
        }

        if (
          normalizedUrl &&
          String(
            tab.url || ""
          )
            .toLowerCase()
            .includes(
              normalizedUrl
            )
        ) {
          return true;
        }

        return false;
      }
    ) ||
    null
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