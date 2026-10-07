/**
 * MOOT ACTION EXECUTOR
 *
 * Выполняет физические действия MOOT на веб-странице.
 *
 * Поддерживает:
 *
 * click
 * doubleClick
 * type
 * clear
 * focus
 * blur
 * scroll
 * scrollIntoView
 * select
 * check
 * uncheck
 * hover
 * pressKey
 *
 * Перед важными действиями может визуально
 * подсвечивать целевой элемент.
 */

(() => {
  "use strict";

  const DEFAULT_HIGHLIGHT_MS =
    450;

  const ActionExecutor = {
    execute,
    click,
    doubleClick,
    typeText,
    clear,
    focus,
    blur,
    scroll,
    scrollIntoView,
    select,
    setChecked,
    pressKey,
    hover,
  };

  window.MOOTActionExecutor =
    ActionExecutor;

  // ==================================================
  // MAIN EXECUTOR
  // ==================================================

  async function execute(
    action = {}
  ) {
    if (
      !action ||
      typeof action !== "object"
    ) {
      throw new Error(
        "Invalid MOOT action."
      );
    }

    if (
      !action.type
    ) {
      throw new Error(
        "Action type is missing."
      );
    }

    switch (
      action.type
    ) {
      case "click":
        return click(
          action.target,
          action.options || {}
        );

      case "doubleClick":
        return doubleClick(
          action.target,
          action.options || {}
        );

      case "type":
        return typeText(
          action.target,
          action.text,
          action.options || {}
        );

      case "clear":
        return clear(
          action.target,
          action.options || {}
        );

      case "focus":
        return focus(
          action.target,
          action.options || {}
        );

      case "blur":
        return blur(
          action.target
        );

      case "scroll":
        return scroll(
          action.options || {}
        );

      case "scrollIntoView":
        return scrollIntoView(
          action.target,
          action.options || {}
        );

      case "select":
        return select(
          action.target,
          action.value,
          action.options || {}
        );

      case "check":
        return setChecked(
          action.target,
          true,
          action.options || {}
        );

      case "uncheck":
        return setChecked(
          action.target,
          false,
          action.options || {}
        );

      case "hover":
        return hover(
          action.target,
          action.options || {}
        );

      case "pressKey":
        return pressKey(
          action.target,
          action.key,
          action.options || {}
        );

      default:
        throw new Error(
          `Unknown MOOT action: ${action.type}`
        );
    }
  }

  // ==================================================
  // TARGET
  // ==================================================

  function getTarget(
    target
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
          target || {}
        );

    if (!element) {
      throw new Error(
        `Target element not found: ${safeStringify(
          target
        )}`
      );
    }

    return element;
  }

  // ==================================================
  // VISUAL HIGHLIGHT
  // ==================================================

  async function maybeHighlight(
    element,
    options = {}
  ) {
    if (
      options.highlight ===
      false
    ) {
      return;
    }

    if (
      !window.MOOTPageOverlay
    ) {
      return;
    }

    try {
      window.MOOTPageOverlay
        .highlightElement(
          element,
          {
            label:
              options.highlightLabel ||
              null,
          }
        );

      const duration =
        Number.isFinite(
          options.highlightMs
        )
          ? Math.max(
              0,
              options.highlightMs
            )
          : DEFAULT_HIGHLIGHT_MS;

      if (
        duration > 0
      ) {
        await sleep(
          duration
        );
      }

      window.MOOTPageOverlay
        .clear();
    } catch {
      // Overlay should never block actual action.
    }
  }

  // ==================================================
  // CLICK
  // ==================================================

  async function click(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    ensureEnabled(
      element
    );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          options.highlightLabel ||
          "Click",
      }
    );

    element.focus?.({
      preventScroll: true,
    });

    dispatchPointerSequence(
      element
    );

    element.click();

    return successResult(
      "click",
      element
    );
  }

  // ==================================================
  // DOUBLE CLICK
  // ==================================================

  async function doubleClick(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    ensureEnabled(
      element
    );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          "Double click",
      }
    );

    dispatchPointerSequence(
      element
    );

    element.dispatchEvent(
      new MouseEvent(
        "dblclick",
        {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          detail: 2,
        }
      )
    );

    return successResult(
      "doubleClick",
      element
    );
  }

  // ==================================================
  // TYPE
  // ==================================================

  async function typeText(
    target,
    text,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    ensureEnabled(
      element
    );

    ensureEditable(
      element
    );

    const value =
      text === null ||
      text === undefined
        ? ""
        : String(text);

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          "Type",
      }
    );

    element.focus?.({
      preventScroll: true,
    });

    const verification = await window.MOOTEditor.write(element, value, { replace: options.replace !== false });

    return {
      ...successResult(
        "type",
        element
      ),

      ...verification,
    };
  }

  // ==================================================
  // CLEAR
  // ==================================================

  async function clear(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    ensureEnabled(
      element
    );

    ensureEditable(
      element
    );

    await bringIntoView(
      element,
      options
    );

    element.focus?.();

    await window.MOOTEditor.write(element, '', { replace: true });

    return successResult(
      "clear",
      element
    );
  }

  // ==================================================
  // FOCUS
  // ==================================================

  async function focus(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    await bringIntoView(
      element,
      options
    );

    element.focus?.();

    return successResult(
      "focus",
      element
    );
  }

  function blur(
    target
  ) {
    const element =
      getTarget(
        target
      );

    element.blur?.();

    return successResult(
      "blur",
      element
    );
  }

  // ==================================================
  // SCROLL
  // ==================================================

  function scroll(
    options = {}
  ) {
    if (options.target) {
      const container = getTarget(options.target);
      const amount = Number.isFinite(options.amount) ? options.amount : 600;
      const behavior = options.smooth ? 'smooth' : 'auto';
      if (options.direction === 'top' || options.direction === 'bottom') {
        container.scrollTo({ top: options.direction === 'top' ? 0 : container.scrollHeight, behavior });
      } else {
        const offsets = { up: [0, -amount], down: [0, amount], left: [-amount, 0], right: [amount, 0] };
        if (options.direction && !offsets[options.direction]) throw new Error('Неизвестное направление прокрутки.');
        const [left, top] = offsets[options.direction] || [Number(options.x) || 0, Number(options.y) || 0];
        container.scrollBy({ left, top, behavior });
      }
      return { ...successResult('scroll', container), position: { x: container.scrollLeft, y: container.scrollTop } };
    }
    const behavior =
      options.smooth
        ? "smooth"
        : "auto";

    const amount =
      Number.isFinite(
        options.amount
      )
        ? options.amount
        : 600;

    if (
      options.direction
    ) {
      switch (
        options.direction
      ) {
        case "up":
          window.scrollBy({
            top: -amount,
            behavior,
          });
          break;

        case "down":
          window.scrollBy({
            top: amount,
            behavior,
          });
          break;

        case "left":
          window.scrollBy({
            left: -amount,
            behavior,
          });
          break;

        case "right":
          window.scrollBy({
            left: amount,
            behavior,
          });
          break;

        case "top":
          window.scrollTo({
            top: 0,
            behavior,
          });
          break;

        case "bottom":
          window.scrollTo({
            top:
              document.documentElement
                .scrollHeight,
            behavior,
          });
          break;

        default:
          throw new Error(
            `Unknown scroll direction: ${options.direction}`
          );
      }
    } else {
      window.scrollBy({
        left:
          Number(
            options.x || 0
          ),

        top:
          Number(
            options.y || 0
          ),

        behavior,
      });
    }

    return {
      ok: true,

      action:
        "scroll",

      position: {
        x:
          window.scrollX,

        y:
          window.scrollY,
      },

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // SCROLL INTO VIEW
  // ==================================================

  async function scrollIntoView(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          "Target",
      }
    );

    return successResult(
      "scrollIntoView",
      element
    );
  }

  // ==================================================
  // SELECT
  // ==================================================

  async function select(
    target,
    value,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    if (
      !(
        element instanceof
        HTMLSelectElement
      )
    ) {
      throw new Error(
        "Target is not a select element."
      );
    }

    ensureEnabled(
      element
    );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          "Select",
      }
    );

    const requested =
      String(value);

    const option =
      Array.from(
        element.options
      ).find(
        (candidate) =>
          candidate.value ===
            requested ||
          candidate.text
            .trim()
            .toLowerCase() ===
            requested
              .trim()
              .toLowerCase()
      );

    if (!option) {
      throw new Error(
        `Select option not found: ${requested}`
      );
    }

    element.value =
      option.value;

    element.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true,
          composed: true,
        }
      )
    );

    dispatchChange(
      element
    );

    return {
      ...successResult(
        "select",
        element
      ),

      value:
        element.value,

      text:
        option.text,
    };
  }

  // ==================================================
  // CHECK / UNCHECK
  // ==================================================

  async function setChecked(
    target,
    checked,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    if (
      !(
        element instanceof
        HTMLInputElement
      ) ||
      ![
        "checkbox",
        "radio",
      ].includes(
        element.type
      )
    ) {
      throw new Error(
        "Target must be checkbox or radio."
      );
    }

    ensureEnabled(
      element
    );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          checked
            ? "Check"
            : "Uncheck",
      }
    );

    if (
      element.checked !==
      checked
    ) {
      element.click();
    }

    return {
      ...successResult(
        checked
          ? "check"
          : "uncheck",
        element
      ),

      checked:
        element.checked,
    };
  }

  // ==================================================
  // HOVER
  // ==================================================

  async function hover(
    target,
    options = {}
  ) {
    const element =
      getTarget(
        target
      );

    await bringIntoView(
      element,
      options
    );

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          "Hover",
      }
    );

    const rect =
      element.getBoundingClientRect();

    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX:
        rect.left +
        rect.width / 2,

      clientY:
        rect.top +
        rect.height / 2,

      view:
        window,
    };

    element.dispatchEvent(
      new MouseEvent(
        "mouseenter",
        eventInit
      )
    );

    element.dispatchEvent(
      new MouseEvent(
        "mouseover",
        eventInit
      )
    );

    element.dispatchEvent(
      new MouseEvent(
        "mousemove",
        eventInit
      )
    );

    return successResult(
      "hover",
      element
    );
  }

  // ==================================================
  // KEYBOARD
  // ==================================================

  async function pressKey(
    target,
    key,
    options = {}
  ) {
    if (!key) {
      throw new Error(
        "pressKey requires key."
      );
    }

    const element =
      target
        ? getTarget(
            target
          )
        : document.activeElement;

    if (
      !element ||
      !(
        element instanceof
        Element
      )
    ) {
      throw new Error(
        "No element available for key press."
      );
    }

    await maybeHighlight(
      element,
      {
        ...options,

        highlightLabel:
          `Key: ${key}`,
      }
    );

    element.focus?.({ preventScroll: true });
    const keyCode = ({ Enter: 13, Escape: 27, Tab: 9, Backspace: 8, Delete: 46, ArrowDown: 40, ArrowUp: 38 })[key] || 0;
    const init = {
      keyCode, which: keyCode,
      key:
        String(key),

      code:
        options.code ||
        String(key),

      bubbles: true,
      cancelable: true,
      composed: true,

      ctrlKey:
        Boolean(
          options.ctrlKey
        ),

      shiftKey:
        Boolean(
          options.shiftKey
        ),

      altKey:
        Boolean(
          options.altKey
        ),

      metaKey:
        Boolean(
          options.metaKey
        ),
    };

    element.dispatchEvent(
      new KeyboardEvent(
        "keydown",
        init
      )
    );

    element.dispatchEvent(
      new KeyboardEvent(
        "keyup",
        init
      )
    );

    return {
      ...successResult(
        "pressKey",
        element
      ),

      key:
        String(key),
    };
  }

  // ==================================================
  // BRING INTO VIEW
  // ==================================================

  async function bringIntoView(
    element,
    options = {}
  ) {
    element.scrollIntoView({
      behavior:
        options.smooth
          ? "smooth"
          : "auto",

      block:
        options.block ||
        "center",

      inline:
        options.inline ||
        "center",
    });

    if (
      Number.isFinite(
        options.delayMs
      ) &&
      options.delayMs > 0
    ) {
      await sleep(
        options.delayMs
      );
    }
  }

  // ==================================================
  // POINTER SEQUENCE
  // ==================================================

  function dispatchPointerSequence(
    element
  ) {
    const rect =
      element.getBoundingClientRect();

    const clientX =
      rect.left +
      rect.width / 2;

    const clientY =
      rect.top +
      rect.height / 2;

    const options = {
      bubbles: true,
      cancelable: true,
      composed: true,

      clientX,
      clientY,

      view: window,
      button: 0,
      buttons: 1,
    };

    const events = [
      "pointerover",
      "mouseover",
      "pointerenter",
      "mouseenter",
      "pointermove",
      "mousemove",
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
    ];

    for (
      const eventName of
      events
    ) {
      const EventClass =
        eventName.startsWith(
          "pointer"
        ) &&
        typeof PointerEvent !==
          "undefined"
          ? PointerEvent
          : MouseEvent;

      element.dispatchEvent(
        new EventClass(
          eventName,
          options
        )
      );
    }
  }

  // ==================================================
  // EDITABLE VALUES
  // ==================================================

  function setEditableValue(
    element,
    value
  ) {
    if (
      element instanceof
      HTMLInputElement
    ) {
      setNativeProperty(
        element,
        HTMLInputElement.prototype,
        "value",
        value
      );

      return;
    }

    if (
      element instanceof
      HTMLTextAreaElement
    ) {
      setNativeProperty(
        element,
        HTMLTextAreaElement.prototype,
        "value",
        value
      );

      return;
    }

    if (
      element.isContentEditable
    ) {
      element.textContent =
        value;

      return;
    }

    throw new Error(
      "Unsupported editable element."
    );
  }

  function setNativeProperty(
    element,
    prototype,
    property,
    value
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        prototype,
        property
      );

    if (
      descriptor?.set
    ) {
      descriptor.set.call(
        element,
        value
      );
    } else {
      element[property] =
        value;
    }
  }

  function appendCharacter(
    element,
    character
  ) {
    if (
      element instanceof
        HTMLInputElement ||
      element instanceof
        HTMLTextAreaElement
    ) {
      const current =
        element.value ||
        "";

      setEditableValue(
        element,
        current +
        character
      );
    } else if (
      element.isContentEditable
    ) {
      element.textContent =
        (
          element.textContent ||
          ""
        ) +
        character;
    }

    dispatchInput(
      element,
      character,
      "insertText"
    );
  }

  // ==================================================
  // EVENTS
  // ==================================================

  function dispatchInput(
    element,
    data,
    inputType
  ) {
    try {
      element.dispatchEvent(
        new InputEvent(
          "input",
          {
            bubbles: true,
            cancelable: false,
            composed: true,
            data,
            inputType,
          }
        )
      );
    } catch {
      element.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true,
            composed: true,
          }
        )
      );
    }
  }

  function dispatchChange(
    element
  ) {
    element.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  // ==================================================
  // VALIDATION
  // ==================================================

  function ensureEnabled(
    element
  ) {
    if (!element.isConnected) throw new Error('Элемент изменился. Прочитай страницу заново.');
    if (
      element.hasAttribute(
        "disabled"
      ) ||
      element.getAttribute(
        "aria-disabled"
      ) === "true"
    ) {
      throw new Error(
        "Target element is disabled."
      );
    }
  }

  function ensureEditable(
    element
  ) {
    const editable =
      element instanceof
        HTMLInputElement ||
      element instanceof
        HTMLTextAreaElement ||
      element.isContentEditable;

    if (!editable) {
      throw new Error(
        "Target element is not editable."
      );
    }

    if (
      element instanceof
        HTMLInputElement &&
      [
        "button",
        "submit",
        "reset",
        "checkbox",
        "radio",
        "file",
        "hidden",
      ].includes(
        element.type
      )
    ) {
      throw new Error(
        `Input type "${element.type}" cannot receive typed text.`
      );
    }
  }

  // ==================================================
  // RESULT
  // ==================================================

  function successResult(
    action,
    element
  ) {
    let description =
      null;

    try {
      description =
        window.MOOTElementFinder
          ?.describeElement(
            element
          ) ||
        null;
    } catch {
      description =
        null;
    }

    return {
      ok: true,

      action,

      element:
        description,

      url:
        location.href,

      timestamp:
        Date.now(),
    };
  }

  // ==================================================
  // HELPERS
  // ==================================================

  function sleep(
    ms
  ) {
    return new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          Math.max(
            0,
            Number(ms) ||
            0
          )
        )
    );
  }

  function safeStringify(
    value
  ) {
    try {
      return JSON.stringify(
        value
      );
    } catch {
      return String(value);
    }
  }

  console.log(
    "[MOOT] Action Executor loaded."
  );
})();
