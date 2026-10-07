/**
 * MOOT SCREENSHOT MANAGER
 *
 * Управляет снимками текущей вкладки.
 *
 * Используется для:
 * - vision
 * - анализа сложного интерфейса
 * - проверки результата
 */

import {
  getActiveTab,
} from "./tab-manager.js";

// =====================================================
// CAPTURE
// =====================================================

export async function captureVisibleTab({
  windowId = null,
  format = "png",
  quality = null,
} = {}) {
  const activeTab =
    await getActiveTab();

  const resolvedWindowId =
    Number.isInteger(
      windowId
    )
      ? windowId
      : activeTab.windowId;

  const options = {
    format:
      format ===
      "jpeg"
        ? "jpeg"
        : "png",
  };

  if (
    options.format ===
      "jpeg" &&
    Number.isFinite(
      quality
    )
  ) {
    options.quality =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            quality
          )
        )
      );
  }

  const dataUrl =
    await chrome.tabs.captureVisibleTab(
      resolvedWindowId,
      options
    );

  return {
    image:
      dataUrl,

    tabId:
      activeTab.id,

    windowId:
      resolvedWindowId,

    url:
      activeTab.url,

    title:
      activeTab.title,

    format:
      options.format,

    capturedAt:
      Date.now(),
  };
}

// =====================================================
// DATA URL -> BLOB
// =====================================================

export async function screenshotToBlob(
  dataUrl
) {
  if (
    typeof dataUrl !==
      "string" ||
    !dataUrl.startsWith(
      "data:image/"
    )
  ) {
    throw new Error(
      "Invalid screenshot data URL."
    );
  }

  const response =
    await fetch(
      dataUrl
    );

  return response.blob();
}

// =====================================================
// SIZE
// =====================================================

export function getScreenshotSize(
  dataUrl
) {
  if (
    typeof dataUrl !==
      "string"
  ) {
    return 0;
  }

  const comma =
    dataUrl.indexOf(
      ","
    );

  if (
    comma === -1
  ) {
    return 0;
  }

  const base64 =
    dataUrl.slice(
      comma + 1
    );

  return Math.ceil(
    (
      base64.length *
      3
    ) / 4
  );
}