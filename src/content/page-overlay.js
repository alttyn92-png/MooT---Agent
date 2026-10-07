/**
 * MOOT PAGE OVERLAY
 *
 * Визуально подсвечивает элементы на странице.
 *
 * Нужно для:
 * - отладки;
 * - показа текущей цели агента;
 * - демонстрации, что сейчас делает MOOT.
 *
 * Работает только визуально и не меняет
 * саму логику страницы.
 */

(() => {
  "use strict";

  const OVERLAY_ID =
    "__mut_overlay_root__";

  const state = {
    root: null,

    highlight:
      null,

    label:
      null,

    target:
      null,

    visible:
      false,
  };

  const PageOverlay = {
    highlightElement,
    highlightTarget,
    clear,
    showMessage,
    hideMessage,
    getState,
  };

  window.MOOTPageOverlay =
    PageOverlay;

  // ===================================================
  // ENSURE ROOT
  // ===================================================

  function ensureRoot() {
    if (
      state.root &&
      document.contains(
        state.root
      )
    ) {
      return state.root;
    }

    const existing =
      document.getElementById(
        OVERLAY_ID
      );

    if (existing) {
      state.root =
        existing;

      return existing;
    }

    const root =
      document.createElement(
        "div"
      );

    root.id =
      OVERLAY_ID;

    root.dataset.mutIgnore =
      "true";

    Object.assign(
      root.style,
      {
        position:
          "fixed",

        inset:
          "0",

        zIndex:
          "2147483647",

        pointerEvents:
          "none",

        overflow:
          "visible",
      }
    );

    document.documentElement.appendChild(
      root
    );

    state.root =
      root;

    return root;
  }

  // ===================================================
  // HIGHLIGHT ELEMENT
  // ===================================================

  function highlightElement(
    element,
    options = {}
  ) {
    if (
      !(element instanceof Element)
    ) {
      throw new Error(
        "highlightElement requires Element."
      );
    }

    ensureRoot();

    clearHighlightOnly();

    const rect =
      element.getBoundingClientRect();

    const box =
      document.createElement(
        "div"
      );

    box.dataset.mutIgnore =
      "true";

    Object.assign(
      box.style,
      {
        position:
          "fixed",

        left:
          `${Math.round(
            rect.left
          )}px`,

        top:
          `${Math.round(
            rect.top
          )}px`,

        width:
          `${Math.max(
            0,
            Math.round(
              rect.width
            )
          )}px`,

        height:
          `${Math.max(
            0,
            Math.round(
              rect.height
            )
          )}px`,

        border:
          "2px solid rgba(124, 92, 255, 0.95)",

        borderRadius:
          "8px",

        boxShadow:
          "0 0 0 3px rgba(124, 92, 255, 0.18), 0 8px 30px rgba(0,0,0,0.25)",

        background:
          "rgba(124, 92, 255, 0.06)",

        transition:
          "all 120ms ease",

        pointerEvents:
          "none",
      }
    );

    state.root.appendChild(
      box
    );

    state.highlight =
      box;

    state.target =
      element;

    state.visible =
      true;

    if (
      options.label
    ) {
      const label =
        createLabel(
          String(
            options.label
          ),
          rect
        );

      state.root.appendChild(
        label
      );

      state.label =
        label;
    }

    return {
      visible: true,

      rect: {
        x:
          rect.x,

        y:
          rect.y,

        width:
          rect.width,

        height:
          rect.height,
      },
    };
  }

  // ===================================================
  // HIGHLIGHT TARGET
  // ===================================================

  function highlightTarget(
    target,
    options = {}
  ) {
    if (
      !window.MOOTElementFinder
    ) {
      throw new Error(
        "MOOT Element Finder is not loaded."
      );
    }

    const element =
      window.MOOTElementFinder
        .findElement(
          target
        );

    if (!element) {
      throw new Error(
        "Overlay target element not found."
      );
    }

    return highlightElement(
      element,
      options
    );
  }

  // ===================================================
  // LABEL
  // ===================================================

  function createLabel(
    text,
    rect
  ) {
    const label =
      document.createElement(
        "div"
      );

    label.dataset.mutIgnore =
      "true";

    label.textContent =
      text;

    Object.assign(
      label.style,
      {
        position:
          "fixed",

        left:
          `${Math.max(
            6,
            Math.round(
              rect.left
            )
          )}px`,

        top:
          `${Math.max(
            6,
            Math.round(
              rect.top - 30
            )
          )}px`,

        maxWidth:
          "320px",

        padding:
          "5px 8px",

        borderRadius:
          "8px",

        background:
          "rgba(20, 20, 28, 0.96)",

        color:
          "#ffffff",

        fontFamily:
          "system-ui, sans-serif",

        fontSize:
          "12px",

        lineHeight:
          "1.25",

        boxShadow:
          "0 6px 20px rgba(0,0,0,0.3)",

        pointerEvents:
          "none",
      }
    );

    return label;
  }

  // ===================================================
  // MESSAGE
  // ===================================================

  function showMessage(
    text,
    options = {}
  ) {
    ensureRoot();

    const old =
      state.root.querySelector(
        "[data-mut-overlay-message]"
      );

    old?.remove();

    const message =
      document.createElement(
        "div"
      );

    message.dataset.mutOverlayMessage =
      "true";

    message.dataset.mutIgnore =
      "true";

    message.textContent =
      String(
        text || ""
      );

    Object.assign(
      message.style,
      {
        position:
          "fixed",

        top:
          options.top ||
          "16px",

        left:
          "50%",

        transform:
          "translateX(-50%)",

        maxWidth:
          "80vw",

        padding:
          "8px 12px",

        borderRadius:
          "10px",

        background:
          "rgba(15, 17, 21, 0.96)",

        color:
          "#ffffff",

        fontFamily:
          "system-ui, sans-serif",

        fontSize:
          "13px",

        boxShadow:
          "0 10px 30px rgba(0,0,0,0.3)",

        pointerEvents:
          "none",
      }
    );

    state.root.appendChild(
      message
    );

    if (
      Number.isFinite(
        options.durationMs
      ) &&
      options.durationMs > 0
    ) {
      setTimeout(
        () => {
          message.remove();
        },
        options.durationMs
      );
    }

    return true;
  }

  function hideMessage() {
    state.root
      ?.querySelector(
        "[data-mut-overlay-message]"
      )
      ?.remove();
  }

  // ===================================================
  // CLEAR
  // ===================================================

  function clear() {
    clearHighlightOnly();
    hideMessage();

    if (
      state.root &&
      !state.root.children
        .length
    ) {
      state.root.remove();

      state.root =
        null;
    }

    state.target =
      null;

    state.visible =
      false;

    return {
      cleared: true,
    };
  }

  function clearHighlightOnly() {
    state.highlight
      ?.remove();

    state.label
      ?.remove();

    state.highlight =
      null;

    state.label =
      null;

    state.target =
      null;

    state.visible =
      false;
  }

  // ===================================================
  // STATE
  // ===================================================

  function getState() {
    return {
      visible:
        state.visible,

      hasTarget:
        Boolean(
          state.target
        ),

      timestamp:
        Date.now(),
    };
  }

  console.log(
    "[MOOT] Page Overlay loaded."
  );
})();