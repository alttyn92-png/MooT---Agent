/**
 * MOOT EXECUTOR
 *
 * Выполняет tool calls через слой src/tools/.
 */

import { messengerTool } from '../tools/messenger.js';
import { monitorTool } from '../tools/monitor.js';
import {
  validateToolCall,
} from "./tool-registry.js";

import {
  clickTool,
  doubleClickTool,
} from "../tools/click.js";

import {
  typeTool,
  clearTool,
} from "../tools/type.js";

import {
  scrollTool,
  scrollIntoViewTool,
} from "../tools/scroll.js";

import {
  navigateTool,
  openUrl,
} from "../tools/navigate.js";

import {
  listTabsTool,
  switchTabTool,
  closeTabTool,
  reloadTabTool,
} from "../tools/tabs.js";

import {
  readPageTool,
  scanDOMTool,
  getDOMSnapshotTool,
} from "../tools/read-page.js";

import {
  screenshotTool,
} from "../tools/screenshot.js";

import {
  waitTool,
  waitForPageChangeTool,
  waitForPageStableTool,
} from "../tools/wait.js";

import {
  selectOptionTool,
  checkTool,
  uncheckTool,
} from "../tools/select.js";

import {
  pressKeyTool,
} from "../tools/keyboard.js";

import {
  fillFormTool,
  submitFormTool,
} from "../tools/forms.js";

// =====================================================
// EXECUTE
// =====================================================

export async function executeToolCall(
  toolCall
) {
  const validation =
    validateToolCall(
      toolCall
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      validation.error
    );
  }

  const name =
    validation.definition
      .name;

  const args =
    validation.arguments ||
    {};

  const startedAt =
    Date.now();

  let result;

  switch (name) {
    case 'monitor':
      result = await monitorTool(args);
      break;
    case 'messenger':
      result = await messengerTool(args);
      break;
    case "read_page":
      result =
        await readPageTool(
          args
        );
      break;

    case "scan_dom":
      result =
        await scanDOMTool(
          args
        );
      break;

    case "get_dom_snapshot":
      result =
        await getDOMSnapshotTool();
      break;

    case "click":
      result =
        await clickTool(
          args
        );
      break;

    case "double_click":
      result =
        await doubleClickTool(
          args
        );
      break;

    case "type_text":
      result =
        await typeTool(
          args
        );
      break;

    case "clear_input":
      result =
        await clearTool(
          args
        );
      break;

    case "scroll":
      result =
        await scrollTool(
          args
        );
      break;

    case "scroll_into_view":
      result =
        await scrollIntoViewTool(
          args
        );
      break;

    case "select_option":
      result =
        await selectOptionTool(
          args
        );
      break;

    case "check":
      result =
        await checkTool(
          args
        );
      break;

    case "uncheck":
      result =
        await uncheckTool(
          args
        );
      break;

    case "press_key":
      result =
        await pressKeyTool(
          args
        );
      break;

    case "open_tab":
      result =
        await openUrl(
          args
        );
      break;

    case "navigate":
      result =
        await navigateTool(
          args
        );
      break;

    case "close_tab":
      result =
        await closeTabTool(
          args
        );
      break;

    case "switch_tab":
      result =
        await switchTabTool(
          args
        );
      break;

    case "list_tabs":
      result =
        await listTabsTool();
      break;

    case "reload_tab":
      result =
        await reloadTabTool(
          args
        );
      break;

    case "screenshot":
      result =
        await screenshotTool(
          args
        );
      break;

    case "wait":
      result =
        await waitTool(
          args
        );
      break;

    case "wait_for_page_change":
      result =
        await waitForPageChangeTool(
          args
        );
      break;

    case "wait_for_page_stable":
      result =
        await waitForPageStableTool(
          args
        );
      break;

    case "fill_form":
      result =
        await fillFormTool(
          args
        );
      break;

    case "submit_form":
      result =
        await submitFormTool(
          args
        );
      break;

    case "stop":
      result =
        await stopMutTool();
      break;

    default:
      throw new Error(
        `Unsupported tool: ${name}`
      );
  }

  return {
    ok: true,

    tool:
      name,

    arguments:
      args,

    result,

    executionTimeMs:
      Date.now() -
      startedAt,

    timestamp:
      Date.now(),
  };
}

// =====================================================
// SAFE EXECUTE
// =====================================================

export async function executeToolCallSafe(
  toolCall
) {
  try {
    return await executeToolCall(
      toolCall
    );
  } catch (error) {
    return {
      ok: false,

      tool:
        toolCall?.name ||
        null,

      error:
        error?.message ||
        String(error),

      timestamp:
        Date.now(),
    };
  }
}

// =====================================================
// STOP
// =====================================================

async function stopMutTool() {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "STOP_MOOT",
    });

  if (
    response?.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Failed to stop MOOT."
    );
  }

  return response;
}
