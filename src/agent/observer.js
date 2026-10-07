/**
 * MOOT OBSERVER
 *
 * Собирает актуальное состояние браузера
 * перед следующим решением агента.
 *
 * Observer старается быть дешёвым:
 * сначала compact snapshot,
 * а полный текст страницы получает только при необходимости.
 */

import {
  getActiveTabTool,
  listTabsTool,
} from "../tools/tabs.js";

import {
  getPageStateTool,
  getDOMSnapshotTool,
  readPageTool,
  scanDOMTool,
} from "../tools/read-page.js";

import {
  getPageChangesTool,
  clearPageChangesTool,
  waitForPageStableTool,
} from "../tools/wait.js";

import {
  screenshotTool,
} from "../tools/screenshot.js";

// =====================================================
// DEFAULTS
// =====================================================

const DEFAULT_OPTIONS = {
  includeTabs: true,

  includePageState: true,

  includeSnapshot: true,

  includeChanges: true,

  includeFullPage: false,

  includeDOMScan: false,

  includeScreenshot: false,

  maxChanges: 30,
};

// =====================================================
// OBSERVER
// =====================================================

export class MutObserver {
  constructor(
    options = {}
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.lastObservation =
      null;

    this.observationCount =
      0;
  }

  // ===================================================
  // OBSERVE
  // ===================================================

  async observe(
    options = {}
  ) {
    const config = {
      ...this.options,
      ...options,
    };

    const startedAt =
      Date.now();

    this.observationCount +=
      1;

    const observation = {
      id:
        `obs_${Date.now()}_${this.observationCount}`,

      timestamp:
        startedAt,

      activeTab:
        null,

      tabs:
        null,

      pageState:
        null,

      snapshot:
        null,

      changes:
        null,

      fullPage:
        null,

      dom:
        null,

      screenshot:
        null,

      errors:
        [],
    };

    // -------------------------------------------------
    // ACTIVE TAB
    // -------------------------------------------------

    try {
      observation.activeTab =
        await getActiveTabTool();
    } catch (error) {
      observation.errors.push(
        createObservationError(
          "active_tab",
          error
        )
      );

      this.lastObservation =
        observation;

      return observation;
    }

    // -------------------------------------------------
    // TABS
    // -------------------------------------------------

    if (
      config.includeTabs
    ) {
      try {
        observation.tabs =
          await listTabsTool();
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "tabs",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // CAN CONTROL CURRENT PAGE?
    // -------------------------------------------------

    const controllable =
      isControllableUrl(
        observation.activeTab
          ?.url
      );

    observation.controllable =
      controllable;

    if (
      !controllable
    ) {
      observation.executionTimeMs =
        Date.now() -
        startedAt;

      this.lastObservation =
        observation;

      return observation;
    }

    // -------------------------------------------------
    // PAGE STATE
    // -------------------------------------------------

    if (
      config.includePageState
    ) {
      try {
        observation.pageState =
          await getPageStateTool();
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "page_state",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // COMPACT SNAPSHOT
    // -------------------------------------------------

    if (
      config.includeSnapshot
    ) {
      try {
        observation.snapshot =
          await getDOMSnapshotTool();
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "snapshot",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // MOOTATIONS
    // -------------------------------------------------

    if (
      config.includeChanges
    ) {
      try {
        observation.changes =
          await getPageChangesTool({
            limit:
              config.maxChanges,
          });
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "changes",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // FULL PAGE
    // -------------------------------------------------

    if (
      config.includeFullPage
    ) {
      try {
        observation.fullPage =
          await readPageTool({
            includeText: true,

            includeInteractive:
              true,

            includeForms:
              true,

            includeMetadata:
              true,

            maxElements:
              200,
          });
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "full_page",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // DOM SCAN
    // -------------------------------------------------

    if (
      config.includeDOMScan
    ) {
      try {
        observation.dom =
          await scanDOMTool();
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "dom_scan",
            error
          )
        );
      }
    }

    // -------------------------------------------------
    // SCREENSHOT
    // -------------------------------------------------

    if (
      config.includeScreenshot
    ) {
      try {
        observation.screenshot =
          await screenshotTool({
            format:
              "png",
          });
      } catch (error) {
        observation.errors.push(
          createObservationError(
            "screenshot",
            error
          )
        );
      }
    }

    observation.executionTimeMs =
      Date.now() -
      startedAt;

    this.lastObservation =
      observation;

    return observation;
  }

  // ===================================================
  // DEEP OBSERVATION
  // ===================================================

  async observeDeep({
    screenshot = false,
  } = {}) {
    return this.observe({
      includeTabs: true,

      includePageState:
        true,

      includeSnapshot:
        true,

      includeChanges:
        true,

      includeFullPage:
        true,

      includeDOMScan:
        true,

      includeScreenshot:
        screenshot,
    });
  }

  // ===================================================
  // AFTER ACTION
  // ===================================================

  async observeAfterAction({
    waitForStable = true,
    deep = false,
  } = {}) {
    if (
      waitForStable
    ) {
      try {
        await waitForPageStableTool({
          quietMs: 500,
          timeout: 5000,
        });
      } catch {
        // Страница может постоянно обновляться.
      }
    }

    return deep
      ? this.observeDeep()
      : this.observe();
  }

  // ===================================================
  // SCREENSHOT
  // ===================================================

  async takeScreenshot() {
    return screenshotTool({
      format:
        "png",
    });
  }

  // ===================================================
  // CLEAR CHANGES
  // ===================================================

  async clearChanges() {
    try {
      return await clearPageChangesTool();
    } catch {
      return null;
    }
  }

  // ===================================================
  // LAST
  // ===================================================

  getLastObservation() {
    return this.lastObservation;
  }

  // ===================================================
  // COMPACT FOR MODEL
  // ===================================================

  getCompactContext(
    observation =
      this.lastObservation
  ) {
    if (!observation) {
      return null;
    }

    return {
      activeTab:
        observation.activeTab,

      pageState:
        observation.pageState,

      snapshot:
        observation.snapshot,

      changes:
        observation.changes,

      controllable:
        observation.controllable,

      errors:
        observation.errors
          ?.slice(-5) ||
        [],
    };
  }
}

// =====================================================
// HELPERS
// =====================================================

function isControllableUrl(
  url
) {
  if (
    typeof url !==
      "string"
  ) {
    return false;
  }

  return (
    url.startsWith(
      "https://"
    ) ||
    url.startsWith(
      "http://"
    )
  );
}

function createObservationError(
  source,
  error
) {
  return {
    source,

    message:
      error?.message ||
      String(error),

    timestamp:
      Date.now(),
  };
}

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const observer =
  new MutObserver();