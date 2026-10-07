/**
 * MOOT SERVICE WORKER
 *
 * Главный фоновый процесс расширения.
 *
 * Отвечает за:
 * - запуск MOOT;
 * - Side Panel;
 * - состояние расширения;
 * - события вкладок;
 * - routing сообщений.
 */

import {
  messageRouter,
} from "./message-router.js";

import {
  getActiveTab,
} from "./tab-manager.js";
import { MONITOR_ALARM, monitorTick, restoreMonitorAlarm } from './monitor-controller.js';

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === MONITOR_ALARM) void monitorTick();
});
chrome.runtime.onStartup.addListener(() => { void restoreMonitorAlarm(); });
chrome.runtime.onInstalled.addListener(() => { void restoreMonitorAlarm(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mutState?.oldValue?.running && !changes.mutState?.newValue?.running) {
    void monitorTick();
  }
});

// =====================================================
// VERSION
// =====================================================

const MOOT_VERSION =
  chrome.runtime.getManifest()
    .version ||
  "0.1.0";

// =====================================================
// DEFAULT STATE
// =====================================================

const DEFAULT_STATE = {
  running:
    false,

  stopRequested:
    false,

  currentTaskId:
    null,

  currentStep:
    0,

  currentTabId:
    null,

  currentUrl:
    null,

  currentTitle:
    null,

  lastError:
    null,

  lastTaskStatus:
    null,

  version:
    MOOT_VERSION,
};

// =====================================================
// DEFAULT SETTINGS
// =====================================================

const DEFAULT_SETTINGS = {
  language:
    "ru",

  voiceEnabled:
    true,

  voiceReplies:
    false,

  autoExecute:
    true,

  visionEnabled:
    true,

  saveHistory:
    true,

  preferredLanguage:
    "ru",

  agent: {
    maxSteps:
      50,

    stepDelayMs:
      150,

    autoRecover:
      true,

    observeAfterTool:
      true,
  },

  voice: {
    inputEnabled:
      true,

    outputEnabled:
      false,

    autoSpeak:
      false,

    voice:
      "alloy",
  },

  models: {
    cheapModel:
      "gpt-5.6-luna",

    balancedModel:
      "gpt-5.6-terra",

    strongModel:
      "gpt-5.6-sol",

    visionModel:
      "gpt-5.6-luna",
  },

  openai: {
    apiKey:
      "",
  },
};

// =====================================================
// INSTALL
// =====================================================

chrome.runtime.onInstalled.addListener(
  async (
    details
  ) => {
    console.log(
      "[MOOT] Installed:",
      details.reason
    );

    try {
      await initializeExtension();

      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick:
          true,
      });

      console.log(
        "[MOOT] Installation initialization complete."
      );
    } catch (error) {
      await recordError(
        error
      );
    }
  }
);

// =====================================================
// STARTUP
// =====================================================

chrome.runtime.onStartup.addListener(
  async () => {
    try {
      await initializeExtension();

      await refreshActiveTabState();

      console.log(
        "[MOOT] Startup complete."
      );
    } catch (error) {
      await recordError(
        error
      );
    }
  }
);

// =====================================================
// INITIALIZE
// =====================================================

async function initializeExtension() {
  const result =
    await chrome.storage.local.get([
      "mutState",
      "mutSettings",
    ]);

  if (
    !result.mutState
  ) {
    await chrome.storage.local.set({
      mutState: {
        ...DEFAULT_STATE,

        updatedAt:
          Date.now(),
      },
    });
  } else {
    const mergedState = {
      ...DEFAULT_STATE,
      ...result.mutState,

      running:
        false,

      currentTaskId:
        null,

      updatedAt:
        Date.now(),
    };

    await chrome.storage.local.set({
      mutState:
        mergedState,
    });
  }

  const settings =
    deepMerge(
      DEFAULT_SETTINGS,
      result.mutSettings ||
      {}
    );

  settings.updatedAt =
    Date.now();

  await chrome.storage.local.set({
    mutSettings:
      settings,
  });
}

// =====================================================
// MESSAGE LISTENER
// =====================================================

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {
    messageRouter(
      message,
      sender
    )
      .then(
        (
          response
        ) => {
          sendResponse({
            success:
              true,

            ...response,
          });
        }
      )
      .catch(
        async (
          error
        ) => {
          console.error(
            "[MOOT] Router error:",
            error
          );

          await recordError(
            error
          );

          sendResponse({
            success:
              false,

            error:
              error?.message ||
              String(error),
          });
        }
      );

    return true;
  }
);

// =====================================================
// TAB ACTIVATED
// =====================================================

chrome.tabs.onActivated.addListener(
  async (
    activeInfo
  ) => {
    try {
      const tab =
        await chrome.tabs.get(
          activeInfo.tabId
        );

      await updateState({
        currentTabId:
          tab.id,

        currentUrl:
          tab.url ||
          null,

        currentTitle:
          tab.title ||
          null,
      });
    } catch (error) {
      console.warn(
        "[MOOT] Tab activation error:",
        error
      );
    }
  }
);

// =====================================================
// TAB UPDATED
// =====================================================

chrome.tabs.onUpdated.addListener(
  async (
    tabId,
    changeInfo,
    tab
  ) => {
    if (
      !tab.active
    ) {
      return;
    }

    if (
      !(
        changeInfo.status ||
        changeInfo.url ||
        changeInfo.title
      )
    ) {
      return;
    }

    try {
      await updateState({
        currentTabId:
          tabId,

        currentUrl:
          tab.url ||
          null,

        currentTitle:
          tab.title ||
          null,
      });
    } catch (error) {
      console.warn(
        "[MOOT] Tab update error:",
        error
      );
    }
  }
);

// =====================================================
// TAB REMOVED
// =====================================================

chrome.tabs.onRemoved.addListener(
  async (
    tabId
  ) => {
    try {
      const result =
        await chrome.storage.local.get(
          "mutState"
        );

      const state =
        result.mutState ||
        {};

      if (
        state.currentTabId ===
        tabId
      ) {
        await refreshActiveTabState();
      }
    } catch {
      // ignore
    }
  }
);

// =====================================================
// WINDOW FOCUS
// =====================================================

chrome.windows.onFocusChanged.addListener(
  async (
    windowId
  ) => {
    if (
      windowId ===
      chrome.windows
        .WINDOW_ID_NONE
    ) {
      return;
    }

    try {
      await refreshActiveTabState();
    } catch {
      // ignore
    }
  }
);

// =====================================================
// REFRESH ACTIVE TAB
// =====================================================

async function refreshActiveTabState() {
  try {
    const tab =
      await getActiveTab();

    await updateState({
      currentTabId:
        tab.id,

      currentUrl:
        tab.url ||
        null,

      currentTitle:
        tab.title ||
        null,
    });
  } catch {
    await updateState({
      currentTabId:
        null,

      currentUrl:
        null,

      currentTitle:
        null,
    });
  }
}

// =====================================================
// UPDATE STATE
// =====================================================

async function updateState(
  patch = {}
) {
  const result =
    await chrome.storage.local.get(
      "mutState"
    );

  const current = {
    ...DEFAULT_STATE,
    ...(result.mutState ||
      {}),
  };

  const next = {
    ...current,
    ...patch,

    updatedAt:
      Date.now(),
  };

  await chrome.storage.local.set({
    mutState:
      next,
  });

  // Broadcast only. If there is no Side Panel,
  // the failure can be ignored.
  try {
    await chrome.runtime.sendMessage({
      type:
        "MOOT_STATE_UPDATED",

      payload:
        next,

      source:
        "mut-background",
    });
  } catch {
    // no UI listener
  }

  return next;
}

// =====================================================
// ERROR
// =====================================================

async function recordError(
  error
) {
  console.error(
    "[MOOT]",
    error
  );

  try {
    const result =
      await chrome.storage.local.get(
        "mutState"
      );

    const current =
      result.mutState ||
      {};

    await chrome.storage.local.set({
      mutState: {
        ...DEFAULT_STATE,
        ...current,

        lastError:
          error?.message ||
          String(error),

        updatedAt:
          Date.now(),
      },
    });
  } catch {
    // ignore
  }
}

// =====================================================
// UNHANDLED ERROR
// =====================================================

self.addEventListener(
  "error",
  (
    event
  ) => {
    recordError(
      event.error ||
      new Error(
        event.message
      )
    );
  }
);

self.addEventListener(
  "unhandledrejection",
  (
    event
  ) => {
    recordError(
      event.reason instanceof
        Error
        ? event.reason
        : new Error(
            String(
              event.reason
            )
          )
    );
  }
);

// =====================================================
// MERGE
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

console.log(
  `[MOOT] Service Worker loaded v${MOOT_VERSION}`
);
