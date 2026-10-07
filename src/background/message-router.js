/**
 * MOOT MESSAGE ROUTER
 *
 * Центральный маршрутизатор Background Service Worker.
 *
 * Side Panel
 *    ↓
 * Message Router
 *    ↓
 * Tab Manager / Screenshot Manager / Content Script
 */

import {
  getActiveTab,
  listTabs,
  openTab,
  closeTab,
  switchTab,
  reloadTab,
  navigateTab,
  isControllableTab,
} from "./tab-manager.js";

import {
  captureVisibleTab,
} from "./screenshot-manager.js";

import {
  getPermissionStatus,
  hasPermissions,
  requestPermissions,
} from "./permission-manager.js";
import { ensurePageConnection, sendPageCommand } from './page-connection.js';
import { monitorStart, monitorStatus, monitorStop, monitorTick } from './monitor-controller.js';

// =====================================================
// ROUTER
// =====================================================

export async function messageRouter(
  message,
  sender
) {
  if (
    !message ||
    typeof message !== "object"
  ) {
    throw new Error(
      "Invalid MOOT message."
    );
  }

  const type =
    message.type;

  if (!type) {
    throw new Error(
      "MOOT message type is missing."
    );
  }

  switch (type) {
    case 'MONITOR_START':
      return { monitor: await monitorStart(message.payload || {}) };
    case 'MONITOR_STOP':
      return { monitor: await monitorStop(message.payload || {}) };
    case 'MONITOR_STATUS':
      return { monitor: await monitorStatus() };
    case 'MONITOR_TICK':
      if (!sender?.tab?.id) return { received: false };
      await monitorTick(sender.tab.id, message.id);
      return { received: true };
    // =================================================
    // SYSTEM
    // =================================================

    case "PING":
      return {
        type:
          "PONG",

        timestamp:
          Date.now(),

        message:
          "MOOT background is alive.",
      };

    case "GET_EXTENSION_INFO":
      return getExtensionInfo();

    // =================================================
    // STATE
    // =================================================

    case "GET_MOOT_STATE":
      return getMutState();

    case "SET_MOOT_STATE":
      return setMutState(
        message.payload
      );

    case "MOOT_STATE_UPDATED":
      return {
        received: true,
      };

    // =================================================
    // SETTINGS
    // =================================================

    case "GET_SETTINGS":
      return getSettings();

    case "UPDATE_SETTINGS":
      return updateSettings(
        message.payload
      );

    // =================================================
    // PERMISSIONS
    // =================================================

    case "GET_PERMISSION_STATUS":
      return {
        permissions:
          await getPermissionStatus(),
      };

    case "HAS_PERMISSIONS":
      return {
        granted:
          await hasPermissions(
            message.payload ||
            {}
          ),
      };

    case "REQUEST_PERMISSIONS":
      return requestPermissions(
        message.payload ||
        {}
      );

    // =================================================
    // ACTIVE TAB
    // =================================================

    case "GET_ACTIVE_TAB":
      return {
        tab:
          await getActiveTab(),
      };

    case "GET_CURRENT_PAGE": {
      const tab =
        await getActiveTab();

      return {
        page: {
          tabId:
            tab.id,

          title:
            tab.title,

          url:
            tab.url,

          controllable:
            isControllableTab(
              tab
            ),
        },
      };
    }

    // =================================================
    // TABS
    // =================================================

    case "OPEN_TAB":
      return {
        tab:
          await openTab(
            message.payload ||
            {}
          ),
      };

    case "CLOSE_TAB":
      return closeTab(
        message.payload ||
        {}
      );

    case "SWITCH_TAB":
      return {
        tab:
          await switchTab(
            message.payload ||
            {}
          ),
      };

    case "RELOAD_TAB":
      return reloadTab(
        message.payload ||
        {}
      );

    case "NAVIGATE_TAB":
      return {
        tab:
          await navigateTab(
            message.payload ||
            {}
          ),
      };

    case "LIST_TABS":
      return {
        tabs:
          await listTabs(
            message.payload ||
            {}
          ),
      };

    // =================================================
    // PAGE
    // =================================================

    case "CHECK_PAGE_CONNECTION":
      return checkPageConnection(
        message.payload ||
        {}
      );

    case "SEND_TO_PAGE":
      return sendToPage(
        message.payload ||
        {}
      );

    // =================================================
    // SCREENSHOT
    // =================================================

    case "CAPTURE_VISIBLE_TAB":
      return captureVisibleTab(
        message.payload ||
        {}
      );

    // =================================================
    // PAGE EVENTS FROM CONTENT SCRIPT
    // =================================================

    case "PAGE_EVENT":
      return handlePageEvent(
        message,
        sender
      );

    // =================================================
    // STOP
    // =================================================

    case "STOP_MOOT":
      return stopMut();

    default:
      throw new Error(
        `Unknown MOOT message type: ${type}`
      );
  }
}

// =====================================================
// EXTENSION INFO
// =====================================================

function getExtensionInfo() {
  const manifest =
    chrome.runtime.getManifest();

  return {
    extension: {
      name:
        manifest.name,

      version:
        manifest.version,

      description:
        manifest.description,
    },
  };
}

// =====================================================
// STATE
// =====================================================

async function getMutState() {
  const result =
    await chrome.storage.local.get(
      "mutState"
    );

  return {
    state:
      result.mutState ||
      null,
  };
}

async function setMutState(
  payload = {}
) {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    throw new Error(
      "SET_MOOT_STATE requires an object."
    );
  }

  const result =
    await chrome.storage.local.get(
      "mutState"
    );

  const current =
    result.mutState ||
    {};

  const next = {
    ...current,
    ...payload,

    updatedAt:
      Date.now(),
  };

  await chrome.storage.local.set({
    mutState:
      next,
  });

  return {
    state:
      next,
  };
}

// =====================================================
// SETTINGS
// =====================================================

async function getSettings() {
  const result =
    await chrome.storage.local.get(
      "mutSettings"
    );

  return {
    settings:
      result.mutSettings ||
      {},
  };
}

async function updateSettings(
  payload = {}
) {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    throw new Error(
      "UPDATE_SETTINGS requires an object."
    );
  }

  const result =
    await chrome.storage.local.get(
      "mutSettings"
    );

  const current =
    result.mutSettings ||
    {};

  const next =
    deepMerge(
      current,
      payload
    );

  next.updatedAt =
    Date.now();

  await chrome.storage.local.set({
    mutSettings:
      next,
  });

  return {
    settings:
      next,
  };
}

// =====================================================
// SEND TO CONTENT SCRIPT
// =====================================================

async function resolvePageTab(payload) {
  return Number.isInteger(payload.tabId)
    ? chrome.tabs.get(payload.tabId)
    : getActiveTab();
}

async function sendToPage(payload = {}) {
  if (!payload.command || typeof payload.command !== 'object') {
    throw new Error('SEND_TO_PAGE requires command.');
  }
  const tab = await resolvePageTab(payload);
  return { tabId: tab.id, response: await sendPageCommand(tab.id, payload.command) };
}

async function checkPageConnection(payload = {}) {
  const tab = await resolvePageTab(payload);
  if (!isControllableTab(tab)) {
    return { connected: false, controllable: false, tabId: tab.id, url: tab.url || null };
  }
  try {
    return { connected: true, controllable: true, tabId: tab.id, response: await ensurePageConnection(tab.id) };
  } catch (error) {
    return { connected: false, controllable: true, tabId: tab.id, error: error.message };
  }
}

// =====================================================
// PAGE EVENT
// =====================================================

async function handlePageEvent(
  message,
  sender
) {
  const event =
    message.event ||
    {};

  const tabId =
    sender?.tab?.id ||
    null;

  const record = {
    ...event,

    tabId,

    receivedAt:
      Date.now(),
  };

  await chrome.storage.local.set({
    mutLastPageEvent:
      record,
  });

  return {
    received: true,

    event:
      record,
  };
}

// =====================================================
// STOP
// =====================================================

async function stopMut() {
  const result =
    await chrome.storage.local.get(
      "mutState"
    );

  const current =
    result.mutState ||
    {};

  const next = {
    ...current,

    running:
      false,

    stopRequested:
      true,

    currentTaskId:
      null,

    updatedAt:
      Date.now(),
  };

  await chrome.storage.local.set({
    mutState:
      next,
  });

  return {
    stopped: true,

    state:
      next,
  };
}

// =====================================================
// DEEP MERGE
// =====================================================

function deepMerge(
  target,
  source
) {
  const result = {
    ...(target || {}),
  };

  for (
    const [
      key,
      value,
    ] of Object.entries(
      source || {}
    )
  ) {
    if (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value
      )
    ) {
      result[key] =
        deepMerge(
          result[key] || {},
          value
        );
    } else {
      result[key] =
        value;
    }
  }

  return result;
}
