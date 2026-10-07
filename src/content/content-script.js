/**
 * MOOT CONTENT SCRIPT
 *
 * Главный контроллер внутри веб-страницы.
 *
 * Подключает:
 *
 * Page Reader
 * DOM Scanner
 * Element Finder
 * Page Overlay
 * Action Executor
 * Page Observer
 *
 * Background
 *    ↕
 * Content Script
 *    ↕
 * Web Page
 */

(() => {
  "use strict";

  const VERSION =
    chrome.runtime.getManifest().version;

  const connectedAt =
    Date.now();

  // ==================================================
  // PREVENT DUPLICATE INIT
  // ==================================================

  if (
    window.__MOOT_MESSAGE_LISTENER__ &&
    chrome.runtime.onMessage.hasListener(window.__MOOT_MESSAGE_LISTENER__)
  ) {
    console.log(
      "[MOOT] Content script already initialized."
    );

    return;
  }

  window.__MOOT_CONTENT_SCRIPT_LOADED__ =
    true;

  // ==================================================
  // MESSAGE LISTENER
  // ==================================================

  const messageListener = (
      message,
      sender,
      sendResponse
    ) => {
      handleMessage(
        message,
        sender
      )
        .then(
          (result) => {
            sendResponse({
              success: true,
              ...result,
            });
          }
        )
        .catch(
          (error) => {
            console.error(
              "[MOOT] Content command failed:",
              error
            );

            sendResponse({
              success: false,

              error:
                error?.message ||
                String(error),

              timestamp:
                Date.now(),
            });
          }
        );

      return true;
    };
  window.__MOOT_MESSAGE_LISTENER__ = messageListener;
  chrome.runtime.onMessage.addListener(messageListener);

  // ==================================================
  // ROUTER
  // ==================================================

  async function handleMessage(
    message,
    sender
  ) {
    if (
      !message ||
      typeof message !== "object"
    ) {
      throw new Error(
        "Invalid MOOT page message."
      );
    }

    const type =
      message.type;

    if (!type) {
      throw new Error(
        "Message type is required."
      );
    }

    switch (type) {
      // ==============================================
      // SYSTEM
      // ==============================================

      case "PING_PAGE":
        return ping();
      case "MESSENGER":
        return { messenger: await window.MOOTMessenger.execute(message.args) };
      case 'MONITOR_SNAPSHOT':
        return { monitor: window.MOOTChatMonitor.snapshot(message.config) };
      case 'MONITOR_ATTACH':
        return { monitor: window.MOOTChatMonitor.start(message.config) };
      case 'MONITOR_DETACH':
        window.MOOTChatMonitor.stop();
        return { monitor: { stopped: true } };
      case 'MONITOR_ACTION':
        return { monitor: await window.MOOTChatMonitor.action(message.config, message.action) };

      // ==============================================
      // PAGE READ
      // ==============================================

      case "READ_PAGE":
        return readPage(
          message.options || {}
        );

      case "READ_PAGE_TEXT":
        return readPageText();

      case "GET_INTERACTIVE_ELEMENTS":
        return getInteractiveElements(
          message.options || {}
        );

      case "GET_FORMS":
        return getForms();

      case "GET_PAGE_METADATA":
        return getPageMetadata();

      case "GET_SELECTION":
        return getSelection();

      case "GET_PAGE_STATE":
        return getPageState();

      // ==============================================
      // DOM
      // ==============================================

      case "SCAN_DOM":
        return scanDOM(
          message.options || {}
        );

      case "GET_DOM_SNAPSHOT":
        return getDOMSnapshot();

      // ==============================================
      // ACTIONS
      // ==============================================

      case "EXECUTE_ACTION":
        return executeAction(
          message.action
        );

      // ==============================================
      // OVERLAY
      // ==============================================

      case "HIGHLIGHT_TARGET":
        return highlightTarget(
          message.target,
          message.options || {}
        );

      case "CLEAR_HIGHLIGHT":
        return clearHighlight();

      case "SHOW_PAGE_MESSAGE":
        return showPageMessage(
          message.text,
          message.options || {}
        );

      case "HIDE_PAGE_MESSAGE":
        return hidePageMessage();

      // ==============================================
      // OBSERVER
      // ==============================================

      case "GET_PAGE_CHANGES":
        return getPageChanges(
          message.options || {}
        );

      case "CLEAR_PAGE_CHANGES":
        return clearPageChanges();

      case "WAIT_FOR_PAGE_CHANGE":
        return waitForPageChange(
          message.options || {}
        );

      case "WAIT_FOR_PAGE_STABLE":
        return waitForPageStable(
          message.options || {}
        );

      case "START_PAGE_OBSERVER":
        return startPageObserver();

      case "STOP_PAGE_OBSERVER":
        return stopPageObserver();

      case "GET_PAGE_OBSERVER_STATE":
        return getPageObserverState();

      default:
        throw new Error(
          `Unknown MOOT page command: ${type}`
        );
    }
  }

  // ==================================================
  // MODULE CHECKERS
  // ==================================================

  function requirePageReader() {
    if (
      !window.MOOTPageReader
    ) {
      throw new Error(
        "MOOT Page Reader is not loaded."
      );
    }

    return window.MOOTPageReader;
  }

  function requireDOMScanner() {
    if (
      !window.MOOTDOMScanner
    ) {
      throw new Error(
        "MOOT DOM Scanner is not loaded."
      );
    }

    return window.MOOTDOMScanner;
  }

  function requireElementFinder() {
    if (
      !window.MOOTElementFinder
    ) {
      throw new Error(
        "MOOT Element Finder is not loaded."
      );
    }

    return window.MOOTElementFinder;
  }

  function requireActionExecutor() {
    if (
      !window.MOOTActionExecutor
    ) {
      throw new Error(
        "MOOT Action Executor is not loaded."
      );
    }

    return window.MOOTActionExecutor;
  }

  function requireObserver() {
    if (
      !window.MOOTPageObserver
    ) {
      throw new Error(
        "MOOT Page Observer is not loaded."
      );
    }

    return window.MOOTPageObserver;
  }

  function requireOverlay() {
    if (
      !window.MOOTPageOverlay
    ) {
      throw new Error(
        "MOOT Page Overlay is not loaded."
      );
    }

    return window.MOOTPageOverlay;
  }

  // ==================================================
  // SYSTEM
  // ==================================================

  function ping() {
    return {
      type:
        "PONG_PAGE",

      version:
        VERSION,

      url:
        location.href,

      title:
        document.title,

      readyState:
        document.readyState,

      connectedAt,

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // PAGE READER
  // ==================================================

  function readPage(
    options = {}
  ) {
    const page =
      requirePageReader()
        .readPage(
          options
        );

    return {
      page,

      timestamp:
        Date.now(),
    };
  }

  function readPageText() {
    const text =
      requirePageReader()
        .readVisibleText();

    return {
      text,

      length:
        text.length,

      timestamp:
        Date.now(),
    };
  }

  function getInteractiveElements(
    options = {}
  ) {
    const elements =
      requirePageReader()
        .getInteractiveElements(
          Number.isInteger(
            options.maxElements
          )
            ? options.maxElements
            : undefined
        );

    return {
      elements,

      count:
        elements.length,

      timestamp:
        Date.now(),
    };
  }

  function getForms() {
    const forms =
      requirePageReader()
        .getForms();

    return {
      forms,

      count:
        forms.length,

      timestamp:
        Date.now(),
    };
  }

  function getPageMetadata() {
    return {
      metadata:
        requirePageReader()
          .getPageMetadata(),

      timestamp:
        Date.now(),
    };
  }

  function getSelection() {
    return {
      selection:
        requirePageReader()
          .getSelection(),

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // DOM SCANNER
  // ==================================================

  function scanDOM(
    options = {}
  ) {
    return {
      dom:
        requireDOMScanner()
          .scan(
            options
          ),

      timestamp:
        Date.now(),
    };
  }

  function getDOMSnapshot() {
    return {
      snapshot:
        requireDOMScanner()
          .getCompactSnapshot(),

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // ACTION EXECUTOR
  // ==================================================

  async function executeAction(
    action
  ) {
    if (
      !action ||
      typeof action !== "object"
    ) {
      throw new Error(
        "EXECUTE_ACTION requires action object."
      );
    }

    const startedAt =
      Date.now();

    const result =
      await requireActionExecutor()
        .execute(
          action
        );

    return {
      result,

      executionTimeMs:
        Date.now() -
        startedAt,

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // OVERLAY
  // ==================================================

  function highlightTarget(
    target,
    options = {}
  ) {
    return {
      result:
        requireOverlay()
          .highlightTarget(
            target,
            options
          ),

      timestamp:
        Date.now(),
    };
  }

  function clearHighlight() {
    return {
      result:
        requireOverlay()
          .clear(),

      timestamp:
        Date.now(),
    };
  }

  function showPageMessage(
    text,
    options = {}
  ) {
    requireOverlay()
      .showMessage(
        String(
          text || ""
        ),
        options
      );

    return {
      shown: true,

      timestamp:
        Date.now(),
    };
  }

  function hidePageMessage() {
    requireOverlay()
      .hideMessage();

    return {
      hidden: true,

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // PAGE OBSERVER
  // ==================================================

  function getPageChanges(
    options = {}
  ) {
    const observer =
      requireObserver();

    return {
      observer:
        observer.getState(),

      changes:
        observer.getChanges(
          options
        ),

      timestamp:
        Date.now(),
    };
  }

  function clearPageChanges() {
    return {
      ...requireObserver()
        .clear(),

      timestamp:
        Date.now(),
    };
  }

  async function waitForPageChange(
    options = {}
  ) {
    return {
      ...await requireObserver()
        .waitForChange(
          options
        ),

      timestamp:
        Date.now(),
    };
  }

  async function waitForPageStable(
    options = {}
  ) {
    return {
      ...await requireObserver()
        .waitForStable(
          options
        ),

      timestamp:
        Date.now(),
    };
  }

  function startPageObserver() {
    return {
      ...requireObserver()
        .start(),

      timestamp:
        Date.now(),
    };
  }

  function stopPageObserver() {
    return {
      ...requireObserver()
        .stop(),

      timestamp:
        Date.now(),
    };
  }

  function getPageObserverState() {
    return {
      observer:
        requireObserver()
          .getState(),

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // PAGE STATE
  // ==================================================

  function getPageState() {
    const finder =
      window.MOOTElementFinder;

    let activeElement =
      null;

    if (
      finder &&
      document.activeElement instanceof
        Element
    ) {
      try {
        activeElement =
          finder.describeElement(
            document.activeElement
          );
      } catch {
        activeElement =
          null;
      }
    }

    return {
      pageState: {
        url:
          location.href,

        origin:
          location.origin,

        hostname:
          location.hostname,

        pathname:
          location.pathname,

        title:
          document.title,

        readyState:
          document.readyState,

        focused:
          document.hasFocus(),

        visibility:
          document.visibilityState,

        activeElement,

        viewport: {
          width:
            window.innerWidth,

          height:
            window.innerHeight,

          scrollX:
            window.scrollX,

          scrollY:
            window.scrollY,

          devicePixelRatio:
            window.devicePixelRatio,
        },

        document: {
          width:
            document.documentElement
              .scrollWidth,

          height:
            document.documentElement
              .scrollHeight,
        },

        observer:
          window.MOOTPageObserver
            ?.getState?.() ||
          null,

        timestamp:
          Date.now(),
      },
    };
  }

  // ==================================================
  // PAGE EVENTS
  // ==================================================

  function sendPageEvent(
    eventType,
    payload = {}
  ) {
    try {
      chrome.runtime.sendMessage(
        {
          type:
            "PAGE_EVENT",

          source:
            "mut-content",

          event: {
            type:
              eventType,

            payload,

            url:
              location.href,

            title:
              document.title,

            timestamp:
              Date.now(),
          },
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    } catch {
      // Extension may have been reloaded.
    }
  }

  window.addEventListener(
    "focus",
    () => {
      sendPageEvent(
        "PAGE_FOCUS"
      );
    }
  );

  window.addEventListener(
    "blur",
    () => {
      sendPageEvent(
        "PAGE_BLUR"
      );
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      sendPageEvent(
        "PAGE_VISIBILITY_CHANGED",
        {
          visibility:
            document.visibilityState,
        }
      );
    }
  );

  window.addEventListener(
    "load",
    () => {
      sendPageEvent(
        "PAGE_LOADED",
        {
          readyState:
            document.readyState,
        }
      );
    }
  );

  // ==================================================
  // SPA NAVIGATION TRACKING
  // ==================================================

  let previousUrl =
    location.href;

  function notifyUrlChange() {
    const currentUrl =
      location.href;

    if (
      currentUrl ===
      previousUrl
    ) {
      return;
    }

    const oldUrl =
      previousUrl;

    previousUrl =
      currentUrl;

    sendPageEvent(
      "PAGE_URL_CHANGED",
      {
        oldUrl,
        url:
          currentUrl,
      }
    );
  }

  window.addEventListener(
    "hashchange",
    notifyUrlChange
  );

  window.addEventListener(
    "popstate",
    notifyUrlChange
  );

  installHistoryHooks();

  function installHistoryHooks() {
    if (
      window.__MOOT_HISTORY_HOOKS__
    ) {
      return;
    }

    window.__MOOT_HISTORY_HOOKS__ =
      true;

    const originalPushState =
      history.pushState;

    const originalReplaceState =
      history.replaceState;

    history.pushState =
      function (
        ...args
      ) {
        const result =
          originalPushState.apply(
            this,
            args
          );

        queueMicrotask(
          notifyUrlChange
        );

        return result;
      };

    history.replaceState =
      function (
        ...args
      ) {
        const result =
          originalReplaceState.apply(
            this,
            args
          );

        queueMicrotask(
          notifyUrlChange
        );

        return result;
      };
  }

  // ==================================================
  // READY
  // ==================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        sendPageEvent(
          "DOM_READY",
          {
            readyState:
              document.readyState,
          }
        );
      },
      {
        once: true,
      }
    );
  } else {
    sendPageEvent(
      "DOM_READY",
      {
        readyState:
          document.readyState,
      }
    );
  }

  console.log(
    `[MOOT] Content Script connected v${VERSION}`
  );

  sendPageEvent(
    "PAGE_CONNECTED",
    {
      version:
        VERSION,

      title:
        document.title,

      readyState:
        document.readyState,

      connectedAt,
    }
  );
})();
