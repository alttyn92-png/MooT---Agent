/**
 * MOOT SCREENSHOT TOOL
 *
 * Делает screenshot текущей видимой вкладки.
 */

export async function screenshotTool({
  format = "png",
  quality = null,
} = {}) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "CAPTURE_VISIBLE_TAB",

      payload: {
        format,
        quality,
      },
    });

  if (!response) {
    throw new Error(
      "Screenshot returned no response."
    );
  }

  if (
    response.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Screenshot failed."
    );
  }

  return {
    image:
      response.image ||
      null,

    tabId:
      response.tabId ||
      null,

    windowId:
      response.windowId ||
      null,

    url:
      response.url ||
      null,

    title:
      response.title ||
      null,

    format:
      response.format ||
      format,

    capturedAt:
      response.capturedAt ||
      Date.now(),
  };
}

export function isScreenshotDataUrl(
  value
) {
  return (
    typeof value ===
      "string" &&
    value.startsWith(
      "data:image/"
    )
  );
}

export function estimateScreenshotBytes(
  dataUrl
) {
  if (
    !isScreenshotDataUrl(
      dataUrl
    )
  ) {
    return 0;
  }

  const comma =
    dataUrl.indexOf(
      ","
    );

  if (
    comma < 0
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