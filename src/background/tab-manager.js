/**
 * MOOT TAB MANAGER
 *
 * Управляет вкладками Chrome.
 *
 * Возможности:
 * - получить активную вкладку
 * - список вкладок
 * - открыть
 * - закрыть
 * - переключить
 * - перезагрузить
 * - перейти по URL
 */

import {
  BLOCKED_PAGE_PREFIXES,
} from "../utils/constants.js";

// =====================================================
// ACTIVE TAB
// =====================================================

export async function getActiveTab() {
  const tabs =
    await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

  const tab =
    tabs[0];

  if (!tab) {
    throw new Error(
      "No active Chrome tab found."
    );
  }

  return sanitizeTab(
    tab
  );
}

// =====================================================
// GET TAB
// =====================================================

export async function getTab(
  tabId
) {
  if (
    !Number.isInteger(
      tabId
    )
  ) {
    throw new Error(
      "Invalid tabId."
    );
  }

  const tab =
    await chrome.tabs.get(
      tabId
    );

  return sanitizeTab(
    tab
  );
}

// =====================================================
// LIST TABS
// =====================================================

export async function listTabs({
  currentWindow = true,
} = {}) {
  const tabs =
    await chrome.tabs.query(
      currentWindow
        ? {
            currentWindow: true,
          }
        : {}
    );

  return tabs.map(
    sanitizeTab
  );
}

// =====================================================
// OPEN TAB
// =====================================================

export async function openTab({
  url =
    "about:blank",

  active =
    true,
} = {}) {
  validateNavigationUrl(
    url
  );

  const tab =
    await chrome.tabs.create({
      url,
      active,
    });

  return sanitizeTab(
    tab
  );
}

// =====================================================
// CLOSE TAB
// =====================================================

export async function closeTab({
  tabId = null,
} = {}) {
  const resolvedTabId =
    Number.isInteger(
      tabId
    )
      ? tabId
      : (
          await getActiveTab()
        ).id;

  if (
    !Number.isInteger(
      resolvedTabId
    )
  ) {
    throw new Error(
      "Could not resolve tabId."
    );
  }

  await chrome.tabs.remove(
    resolvedTabId
  );

  return {
    closed: true,
    tabId:
      resolvedTabId,
  };
}

// =====================================================
// SWITCH TAB
// =====================================================

export async function switchTab({
  tabId,
} = {}) {
  if (
    !Number.isInteger(
      tabId
    )
  ) {
    throw new Error(
      "switchTab requires tabId."
    );
  }

  const tab =
    await chrome.tabs.update(
      tabId,
      {
        active: true,
      }
    );

  if (
    Number.isInteger(
      tab.windowId
    )
  ) {
    await chrome.windows.update(
      tab.windowId,
      {
        focused: true,
      }
    );
  }

  return sanitizeTab(
    tab
  );
}

// =====================================================
// RELOAD
// =====================================================

export async function reloadTab({
  tabId = null,
  bypassCache = false,
} = {}) {
  const resolvedTabId =
    Number.isInteger(
      tabId
    )
      ? tabId
      : (
          await getActiveTab()
        ).id;

  await chrome.tabs.reload(
    resolvedTabId,
    {
      bypassCache:
        Boolean(
          bypassCache
        ),
    }
  );

  return {
    reloaded: true,
    tabId:
      resolvedTabId,
  };
}

// =====================================================
// NAVIGATE
// =====================================================

export async function navigateTab({
  tabId = null,
  url,
} = {}) {
  if (!url) {
    throw new Error(
      "navigateTab requires url."
    );
  }

  validateNavigationUrl(
    url
  );

  const resolvedTabId =
    Number.isInteger(
      tabId
    )
      ? tabId
      : (
          await getActiveTab()
        ).id;

  const tab =
    await chrome.tabs.update(
      resolvedTabId,
      {
        url,
      }
    );

  return sanitizeTab(
    tab
  );
}

// =====================================================
// CONTROLLABLE
// =====================================================

export function isControllableTab(
  tab
) {
  if (!tab?.url) {
    return false;
  }

  const url =
    String(
      tab.url
    );

  if (
    BLOCKED_PAGE_PREFIXES.some(
      (prefix) =>
        url.startsWith(
          prefix
        )
    )
  ) {
    return false;
  }

  return (
    url.startsWith(
      "http://"
    ) ||
    url.startsWith(
      "https://"
    )
  );
}

// =====================================================
// VALIDATE URL
// =====================================================

export function validateNavigationUrl(
  url
) {
  if (
    typeof url !==
      "string"
  ) {
    throw new Error(
      "URL must be a string."
    );
  }

  const trimmed =
    url.trim();

  if (!trimmed) {
    throw new Error(
      "URL cannot be empty."
    );
  }

  if (
    trimmed ===
    "about:blank"
  ) {
    return true;
  }

  let parsed;

  try {
    parsed =
      new URL(
        trimmed
      );
  } catch {
    throw new Error(
      `Invalid URL: ${trimmed}`
    );
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      parsed.protocol
    )
  ) {
    throw new Error(
      `Unsupported URL protocol: ${parsed.protocol}`
    );
  }

  return true;
}

// =====================================================
// SANITIZE
// =====================================================

export function sanitizeTab(
  tab
) {
  if (!tab) {
    return null;
  }

  return {
    id:
      tab.id ??
      null,

    windowId:
      tab.windowId ??
      null,

    index:
      tab.index ??
      null,

    active:
      Boolean(
        tab.active
      ),

    pinned:
      Boolean(
        tab.pinned
      ),

    title:
      tab.title ||
      "",

    url:
      tab.url ||
      "",

    pendingUrl:
      tab.pendingUrl ||
      null,

    favIconUrl:
      tab.favIconUrl ||
      null,

    status:
      tab.status ||
      null,

    audible:
      Boolean(
        tab.audible
      ),

    discarded:
      Boolean(
        tab.discarded
      ),

    incognito:
      Boolean(
        tab.incognito
      ),
  };
}