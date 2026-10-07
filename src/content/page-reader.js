/**
 * MOOT PAGE READER
 *
 * Читает текущую веб-страницу и превращает её
 * в компактную структуру, которую позже сможет
 * анализировать AI.
 *
 * ВАЖНО:
 * - пароли никогда не возвращаются;
 * - скрытые input значения не читаются;
 * - слишком длинные тексты обрезаются;
 * - собираются только полезные интерактивные элементы.
 */

(() => {
  "use strict";

  const MAX_TEXT_LENGTH = 12000;
  const MAX_ELEMENTS = 250;
  const MAX_ELEMENT_TEXT = 300;
  const MAX_VALUE_LENGTH = 500;

  // --------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------

  const PageReader = {
    readPage,
    readVisibleText,
    getInteractiveElements,
    getPageMetadata,
    getForms,
    getSelection,
    getElementSummary,
  };

  window.MOOTPageReader = PageReader;

  // --------------------------------------------------
  // MAIN PAGE READER
  // --------------------------------------------------

  function readPage(options = {}) {
    const config = {
      includeText:
        options.includeText !== false,

      includeInteractive:
        options.includeInteractive !== false,

      includeForms:
        options.includeForms !== false,

      includeMetadata:
        options.includeMetadata !== false,

      maxElements:
        Number.isInteger(options.maxElements)
          ? Math.max(
              1,
              Math.min(
                options.maxElements,
                MAX_ELEMENTS
              )
            )
          : MAX_ELEMENTS,
    };

    const result = {
      url: location.href,
      title: document.title || "",
      timestamp: Date.now(),

      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentWidth:
          document.documentElement.scrollWidth,
        documentHeight:
          document.documentElement.scrollHeight,
      },
    };

    if (config.includeMetadata) {
      result.metadata =
        getPageMetadata();
    }

    if (config.includeText) {
      result.text =
        readVisibleText();
    }

    if (config.includeInteractive) {
      result.interactive =
        getInteractiveElements(
          config.maxElements
        );
    }

    if (config.includeForms) {
      result.forms =
        getForms();
    }

    return result;
  }

  // --------------------------------------------------
  // PAGE METADATA
  // --------------------------------------------------

  function getPageMetadata() {
    const description =
      getMetaContent("description");

    const keywords =
      getMetaContent("keywords");

    const canonical =
      document.querySelector(
        'link[rel="canonical"]'
      )?.href || null;

    const language =
      document.documentElement.lang ||
      navigator.language ||
      null;

    return {
      title:
        document.title || "",

      description:
        description || null,

      keywords:
        keywords || null,

      canonical,

      language,

      origin:
        location.origin,

      hostname:
        location.hostname,

      pathname:
        location.pathname,
    };
  }

  function getMetaContent(name) {
    return (
      document.querySelector(
        `meta[name="${CSS.escape(name)}"]`
      )?.content || null
    );
  }

  // --------------------------------------------------
  // VISIBLE PAGE TEXT
  // --------------------------------------------------

  function readVisibleText() {
    const root =
      document.body;

    if (!root) {
      return "";
    }

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const text =
              normalizeText(
                node.nodeValue
              );

            if (!text) {
              return NodeFilter.FILTER_REJECT;
            }

            const parent =
              node.parentElement;

            if (!parent) {
              return NodeFilter.FILTER_REJECT;
            }

            if (
              shouldIgnoreElement(parent)
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            if (
              !isElementVisible(parent)
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

    const parts = [];

    let totalLength = 0;
    let node;

    while (
      (node = walker.nextNode())
    ) {
      const text =
        normalizeText(
          node.nodeValue
        );

      if (!text) {
        continue;
      }

      if (
        totalLength +
          text.length >
        MAX_TEXT_LENGTH
      ) {
        break;
      }

      parts.push(text);
      totalLength +=
        text.length + 1;
    }

    return parts.join("\n");
  }

  // --------------------------------------------------
  // INTERACTIVE ELEMENTS
  // --------------------------------------------------

  function getInteractiveElements(
    maxElements = MAX_ELEMENTS
  ) {
    const selector = [
      "a[href]",
      "button",
      "input",
      "textarea",
      "select",
      "option",
      "[role='button']",
      "[role='link']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='switch']",
      "[role='tab']",
      "[role='menuitem']",
      "[contenteditable]:not([contenteditable='false'])",
      "[tabindex]",
      "summary",
      "details",
    ].join(",");

    const elements = Array.from(
      document.querySelectorAll(
        selector
      )
    );

    const results = [];

    for (
      let index = 0;
      index < elements.length;
      index++
    ) {
      if (
        results.length >=
        maxElements
      ) {
        break;
      }

      const element =
        elements[index];

      if (
        shouldIgnoreElement(
          element
        )
      ) {
        continue;
      }

      if (
        !isElementVisible(
          element
        )
      ) {
        continue;
      }

      const summary =
        getElementSummary(
          element,
          results.length
        );

      if (!summary) {
        continue;
      }

      results.push(summary);
    }

    return results;
  }

  // --------------------------------------------------
  // ELEMENT SUMMARY
  // --------------------------------------------------

  function getElementSummary(
    element,
    index = null
  ) {
    if (
      !(element instanceof Element)
    ) {
      return null;
    }

    const rect =
      element.getBoundingClientRect();

    const tag =
      element.tagName.toLowerCase();

    const type =
      element.getAttribute("type") ||
      null;

    const role =
      element.getAttribute("role") ||
      null;

    const text =
      getUsefulElementText(
        element
      );

    const ariaLabel =
      element.getAttribute(
        "aria-label"
      );

    const placeholder =
      element.getAttribute(
        "placeholder"
      );

    const name =
      element.getAttribute("name");

    const id =
      element.id || null;

    const href =
      element instanceof HTMLAnchorElement
        ? element.href
        : null;

    const disabled =
      isElementDisabled(
        element
      );

    const editable =
      isEditableElement(
        element
      );

    const checked =
      "checked" in element
        ? Boolean(element.checked)
        : null;

    const selected =
      element instanceof HTMLSelectElement
        ? getSafeSelectValue(
            element
          )
        : null;

    const value =
      getSafeElementValue(
        element
      );

    const label =
      findAssociatedLabel(
        element
      );

    return {
      index,

      tag,
      type,
      role,

      text:
        truncate(
          text,
          MAX_ELEMENT_TEXT
        ) || null,

      label:
        truncate(
          label,
          MAX_ELEMENT_TEXT
        ) || null,

      ariaLabel:
        truncate(
          ariaLabel,
          MAX_ELEMENT_TEXT
        ) || null,

      placeholder:
        truncate(
          placeholder,
          MAX_ELEMENT_TEXT
        ) || null,

      name,
      id,
      href,

      value,

      checked,
      selected,

      disabled,
      editable,

      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width:
          Math.round(rect.width),
        height:
          Math.round(rect.height),
      },

      selector:
        buildStableSelector(
          element
        ),
    };
  }

  // --------------------------------------------------
  // FORMS
  // --------------------------------------------------

  function getForms() {
    const forms = Array.from(
      document.forms || []
    );

    return forms
      .filter((form) =>
        isElementVisible(form)
      )
      .slice(0, 50)
      .map((form, index) => {
        const fields = Array.from(
          form.querySelectorAll(
            [
              "input",
              "textarea",
              "select",
              "button",
            ].join(",")
          )
        )
          .filter((element) =>
            isElementVisible(
              element
            )
          )
          .slice(0, 100)
          .map(
            (
              element,
              fieldIndex
            ) =>
              getElementSummary(
                element,
                fieldIndex
              )
          )
          .filter(Boolean);

        return {
          index,

          action:
            form.action || null,

          method:
            (
              form.method ||
              "get"
            ).toUpperCase(),

          name:
            form.name || null,

          id:
            form.id || null,

          fields,
        };
      });
  }

  // --------------------------------------------------
  // SAFE VALUES
  // --------------------------------------------------

  function getSafeElementValue(
    element
  ) {
    if (
      element instanceof
      HTMLInputElement
    ) {
      const type =
        (
          element.type || ""
        ).toLowerCase();

      const blockedTypes = [
        "password",
        "hidden",
        "file",
      ];

      if (
        blockedTypes.includes(
          type
        )
      ) {
        return null;
      }

      if (
        type === "checkbox" ||
        type === "radio"
      ) {
        return null;
      }

      if (
        looksSensitive(
          element
        )
      ) {
        return null;
      }

      return truncate(
        element.value,
        MAX_VALUE_LENGTH
      );
    }

    if (
      element instanceof
      HTMLTextAreaElement
    ) {
      if (
        looksSensitive(
          element
        )
      ) {
        return null;
      }

      return truncate(
        element.value,
        MAX_VALUE_LENGTH
      );
    }

    if (
      element instanceof
      HTMLSelectElement
    ) {
      return getSafeSelectValue(
        element
      );
    }

    if (
      element.getAttribute(
        "contenteditable"
      ) === "true"
    ) {
      if (
        looksSensitive(
          element
        )
      ) {
        return null;
      }

      return truncate(
        normalizeText(
          element.innerText
        ),
        MAX_VALUE_LENGTH
      );
    }

    return null;
  }

  function getSafeSelectValue(
    select
  ) {
    if (
      !(
        select instanceof
        HTMLSelectElement
      )
    ) {
      return null;
    }

    return {
      value:
        truncate(
          select.value,
          MAX_VALUE_LENGTH
        ),

      text:
        truncate(
          select.options[
            select.selectedIndex
          ]?.text || "",
          MAX_VALUE_LENGTH
        ),
    };
  }

  // --------------------------------------------------
  // SENSITIVE FIELD DETECTION
  // --------------------------------------------------

  function looksSensitive(
    element
  ) {
    const text = [
      element.getAttribute(
        "name"
      ),
      element.getAttribute(
        "id"
      ),
      element.getAttribute(
        "autocomplete"
      ),
      element.getAttribute(
        "placeholder"
      ),
      element.getAttribute(
        "aria-label"
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const sensitiveTerms = [
      "password",
      "passwd",
      "passcode",
      "pin",
      "cvv",
      "cvc",
      "security-code",
      "card-number",
      "credit-card",
      "secret",
      "token",
      "api-key",
      "apikey",
      "private-key",
    ];

    return sensitiveTerms.some(
      (term) =>
        text.includes(term)
    );
  }

  // --------------------------------------------------
  // ELEMENT TEXT
  // --------------------------------------------------

  function getUsefulElementText(
    element
  ) {
    const candidates = [
      element.getAttribute(
        "aria-label"
      ),

      element.getAttribute(
        "title"
      ),

      element instanceof
      HTMLInputElement
        ? element.value
        : null,

      element.innerText,

      element.textContent,
    ];

    for (const value of candidates) {
      const normalized =
        normalizeText(value);

      if (normalized) {
        return normalized;
      }
    }

    return "";
  }

  // --------------------------------------------------
  // LABELS
  // --------------------------------------------------

  function findAssociatedLabel(
    element
  ) {
    if (
      !(
        element instanceof
          HTMLInputElement ||
        element instanceof
          HTMLTextAreaElement ||
        element instanceof
          HTMLSelectElement
      )
    ) {
      return null;
    }

    if (
      element.labels &&
      element.labels.length
    ) {
      return normalizeText(
        Array.from(
          element.labels
        )
          .map(
            (label) =>
              label.innerText
          )
          .join(" ")
      );
    }

    const parentLabel =
      element.closest("label");

    if (parentLabel) {
      return normalizeText(
        parentLabel.innerText
      );
    }

    return null;
  }

  // --------------------------------------------------
  // VISIBILITY
  // --------------------------------------------------

  function isElementVisible(
    element
  ) {
    if (
      !(element instanceof Element)
    ) {
      return false;
    }

    const style =
      window.getComputedStyle(
        element
      );

    if (
      style.display === "none" ||
      style.visibility ===
        "hidden" ||
      style.visibility ===
        "collapse" ||
      Number(style.opacity) === 0
    ) {
      return false;
    }

    const rect =
      element.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return false;
    }

    return true;
  }

  function shouldIgnoreElement(
    element
  ) {
    const tag =
      element.tagName?.toLowerCase();

    if (
      [
        "script",
        "style",
        "noscript",
        "template",
        "svg",
      ].includes(tag)
    ) {
      return true;
    }

    if (
      element.closest(
        "[data-mut-ignore='true']"
      )
    ) {
      return true;
    }

    return false;
  }

  // --------------------------------------------------
  // EDITABLE / DISABLED
  // --------------------------------------------------

  function isEditableElement(
    element
  ) {
    return Boolean(
      element instanceof
        HTMLInputElement ||
        element instanceof
          HTMLTextAreaElement ||
        element instanceof
          HTMLSelectElement ||
        element.isContentEditable
    );
  }

  function isElementDisabled(
    element
  ) {
    return Boolean(
      element.hasAttribute(
        "disabled"
      ) ||
        element.getAttribute(
          "aria-disabled"
        ) === "true"
    );
  }

  // --------------------------------------------------
  // SELECTOR BUILDER
  // --------------------------------------------------

  function buildStableSelector(
    element
  ) {
    if (
      !(element instanceof Element)
    ) {
      return null;
    }

    if (
      element.id &&
      isUniqueSelector(
        `#${CSS.escape(
          element.id
        )}`
      )
    ) {
      return `#${CSS.escape(
        element.id
      )}`;
    }

    const testId =
      element.getAttribute(
        "data-testid"
      );

    if (testId) {
      const selector =
        `[data-testid="${cssAttrEscape(
          testId
        )}"]`;

      if (
        isUniqueSelector(
          selector
        )
      ) {
        return selector;
      }
    }

    const name =
      element.getAttribute("name");

    if (name) {
      const selector =
        `${element.tagName.toLowerCase()}[name="${cssAttrEscape(
          name
        )}"]`;

      if (
        isUniqueSelector(
          selector
        )
      ) {
        return selector;
      }
    }

    return buildCssPath(
      element
    );
  }

  function buildCssPath(
    element
  ) {
    const parts = [];

    let current = element;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE &&
      current !==
        document.documentElement
    ) {
      let part =
        current.tagName.toLowerCase();

      const parent =
        current.parentElement;

      if (parent) {
        const sameTagSiblings =
          Array.from(
            parent.children
          ).filter(
            (child) =>
              child.tagName ===
              current.tagName
          );

        if (
          sameTagSiblings.length >
          1
        ) {
          const index =
            sameTagSiblings.indexOf(
              current
            ) + 1;

          part +=
            `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);

      const selector =
        parts.join(" > ");

      if (
        isUniqueSelector(
          selector
        )
      ) {
        return selector;
      }

      current = parent;
    }

    return parts.join(" > ");
  }

  function isUniqueSelector(
    selector
  ) {
    try {
      return (
        document.querySelectorAll(
          selector
        ).length === 1
      );
    } catch {
      return false;
    }
  }

  function cssAttrEscape(
    value
  ) {
    return String(value)
      .replace(
        /\\/g,
        "\\\\"
      )
      .replace(
        /"/g,
        '\\"'
      );
  }

  // --------------------------------------------------
  // SELECTION
  // --------------------------------------------------

  function getSelection() {
    const selection =
      window.getSelection();

    if (!selection) {
      return "";
    }

    return truncate(
      normalizeText(
        selection.toString()
      ),
      5000
    );
  }

  // --------------------------------------------------
  // UTILITIES
  // --------------------------------------------------

  function normalizeText(
    value
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function truncate(
    value,
    maxLength
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const stringValue =
      String(value);

    if (
      stringValue.length <=
      maxLength
    ) {
      return stringValue;
    }

    return (
      stringValue.slice(
        0,
        maxLength
      ) + "…"
    );
  }

  console.log(
    "[MOOT] Page Reader loaded."
  );
})();
