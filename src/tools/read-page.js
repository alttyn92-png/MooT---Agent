/**
 * MOOT READ PAGE TOOL
 *
 * Высокоуровневое чтение страницы.
 *
 * Поддерживает:
 * - полный read_page
 * - compact DOM snapshot
 * - DOM scan
 * - visible text
 * - forms
 * - interactive elements
 */

export async function readPageTool(
  options = {}
) {
  return sendPageCommand({
    type: "READ_PAGE",

    options: {
      includeText:
        options.includeText !== false,

      includeInteractive:
        options.includeInteractive !== false,

      includeForms:
        options.includeForms !== false,

      includeMetadata:
        options.includeMetadata !== false,

      maxElements:
        Number.isInteger(
          options.maxElements
        )
          ? options.maxElements
          : 200,
    },
  });
}

export async function getDOMSnapshotTool() {
  const response =
    await sendPageCommand({
      type:
        "GET_DOM_SNAPSHOT",
    });

  return (
    response.snapshot ||
    response
  );
}

export async function scanDOMTool(
  options = {}
) {
  const response =
    await sendPageCommand({
      type:
        "SCAN_DOM",

      options,
    });

  return (
    response.dom ||
    response
  );
}

export async function readPageTextTool() {
  const response =
    await sendPageCommand({
      type:
        "READ_PAGE_TEXT",
    });

  return (
    response.text ||
    ""
  );
}

export async function getFormsTool() {
  const response =
    await sendPageCommand({
      type:
        "GET_FORMS",
    });

  return (
    response.forms ||
    []
  );
}

export async function getInteractiveElementsTool({
  maxElements = 200,
} = {}) {
  const response =
    await sendPageCommand({
      type:
        "GET_INTERACTIVE_ELEMENTS",

      options: {
        maxElements,
      },
    });

  return (
    response.elements ||
    []
  );
}

export async function getPageMetadataTool() {
  const response =
    await sendPageCommand({
      type:
        "GET_PAGE_METADATA",
    });

  return (
    response.metadata ||
    null
  );
}

export async function getPageStateTool() {
  const response =
    await sendPageCommand({
      type:
        "GET_PAGE_STATE",
    });

  return (
    response.pageState ||
    null
  );
}

async function sendPageCommand(
  command
) {
  const response =
    await chrome.runtime.sendMessage({
      type:
        "SEND_TO_PAGE",

      payload: {
        command,
      },
    });

  if (!response) {
    throw new Error(
      "MOOT background returned no response."
    );
  }

  if (
    response.success ===
    false
  ) {
    throw new Error(
      response.error ||
      "Page read failed."
    );
  }

  const pageResponse =
    response.response;

  if (
    pageResponse?.success ===
    false
  ) {
    throw new Error(
      pageResponse.error ||
      "Page command failed."
    );
  }

  return (
    pageResponse ||
    response
  );
}