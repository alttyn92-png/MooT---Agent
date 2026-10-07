/**
 * MOOT ELEMENT FINDER
 *
 * Ищет элементы на странице по:
 * - CSS selector
 * - id
 * - index из PageReader
 * - тексту
 * - aria-label
 * - placeholder
 * - name
 * - role
 *
 * Возвращает наиболее подходящий DOM-элемент.
 */

(() => {
  "use strict";

  const MAX_SEARCH_RESULTS = 50;

  const ElementFinder = {
    findElement,
    findElements,
    describeElement,
    isVisible,
  };

  window.MOOTElementFinder = ElementFinder;

  // --------------------------------------------------
  // FIND SINGLE ELEMENT
  // --------------------------------------------------

  function findElement(target = {}) {
    const results = findElements(target);

    if (!results.length) {
      return null;
    }

    if (results.length > 1) {
      throw new Error('Найдено несколько подходящих элементов. Уточни цель по свежему снимку страницы.');
    }
    return results[0];
  }

  // --------------------------------------------------
  // FIND MULTIPLE ELEMENTS
  // --------------------------------------------------

  function findElements(target = {}) {
    if (!target || typeof target !== "object") {
      return [];
    }

    // 1. Selector
    if (target.selector) {
      const bySelector =
        findBySelector(target.selector);

      return bySelector;
    }

    // 2. ID
    if (target.id) {
      const element =
        document.getElementById(
          target.id
        );

      if (
        element &&
        isVisible(element)
      ) {
        return [element];
      }
      return [];
    }

    // 3. Index from PageReader
    if (
      Number.isInteger(target.index)
    ) {
      const byIndex =
        findByInteractiveIndex(
          target.index
        );

      if (byIndex) {
        return [byIndex];
      }
      return [];
    }

    // 4. Scored search
    return findByScoring(target);
  }

  // --------------------------------------------------
  // SELECTOR
  // --------------------------------------------------

  function findBySelector(selector) {
    try {
      return Array.from(
        document.querySelectorAll(
          selector
        )
      )
        .filter(isVisible)
        .slice(
          0,
          MAX_SEARCH_RESULTS
        );
    } catch {
      return [];
    }
  }

  // --------------------------------------------------
  // INDEX
  // --------------------------------------------------

  function findByInteractiveIndex(index) {
    const reader =
      window.MOOTPageReader;

    if (!reader) {
      return null;
    }

    const items =
      reader.getInteractiveElements();

    const item =
      items.find(
        (entry) =>
          entry.index === index
      );

    if (!item) {
      return null;
    }

    if (item.selector) {
      try {
        const element =
          document.querySelector(
            item.selector
          );

        if (
          element &&
          isVisible(element)
        ) {
          return element;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  // --------------------------------------------------
  // SCORED SEARCH
  // --------------------------------------------------

  function findByScoring(target) {
    const selector = [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "[role]",
      "[contenteditable]:not([contenteditable='false'])",
      "[title]",
      "[tabindex]",
      "summary",
      "details",
      "label",
    ].join(",");

    const candidates =
      Array.from(
        document.querySelectorAll(
          selector
        )
      ).filter(isVisible);

    const scored =
      candidates
        .map((element) => ({
          element,
          score:
            scoreElement(
              element,
              target
            ),
        }))
        .filter(
          (item) =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(
          0,
          MAX_SEARCH_RESULTS
        );

    return scored.map(
      (item) => item.element
    );
  }

  // --------------------------------------------------
  // SCORING
  // --------------------------------------------------

  function scoreElement(
    element,
    target
  ) {
    let score = 0;

    const tag =
      element.tagName
        .toLowerCase();

    const text =
      normalize(
        element.innerText ||
        element.textContent
      );

    const ariaLabel =
      normalize(
        element.getAttribute(
          "aria-label"
        )
      );

    const placeholder =
      normalize(
        element.getAttribute(
          "placeholder"
        )
      );

    const name =
      normalize(
        element.getAttribute(
          "name"
        )
      );

    const title =
      normalize(
        element.getAttribute(
          "title"
        )
      );

    const role =
      normalize(
        element.getAttribute(
          "role"
        ) || ({ button: 'button', a: 'link', textarea: 'textbox', select: 'combobox', input: 'textbox' })[tag]
      );

    const id =
      normalize(
        element.id
      );

    const type =
      normalize(
        element.getAttribute(
          "type"
        )
      );

    const targetText =
      normalize(target.text);

    const targetAria =
      normalize(
        target.ariaLabel
      );

    const targetPlaceholder =
      normalize(
        target.placeholder
      );

    const targetName =
      normalize(target.name);

    const targetRole =
      normalize(target.role);

    const targetTag =
      normalize(target.tag);

    const targetType =
      normalize(target.type);

    // Every requested qualifier must match. Interactivity alone is not a match.
    const qualifiers = [
      [targetText, [text, ariaLabel, title]], [targetAria, [ariaLabel]],
      [targetPlaceholder, [placeholder]], [targetName, [name]],
      [targetRole, [role]], [targetTag, [tag]], [targetType, [type]],
    ].filter(([requested]) => requested);
    if (!qualifiers.length || qualifiers.some(([requested, values]) => !values.includes(requested))) return 0;

    // Exact matches are strongest

    if (
      targetText &&
      text === targetText
    ) {
      score += 100;
    }

    if (
      targetText &&
      text.includes(
        targetText
      )
    ) {
      score += 55;
    }

    if (
      targetAria &&
      ariaLabel === targetAria
    ) {
      score += 90;
    }

    if (
      targetAria &&
      ariaLabel.includes(
        targetAria
      )
    ) {
      score += 45;
    }

    if (
      targetPlaceholder &&
      placeholder ===
        targetPlaceholder
    ) {
      score += 85;
    }

    if (
      targetPlaceholder &&
      placeholder.includes(
        targetPlaceholder
      )
    ) {
      score += 40;
    }

    if (
      targetName &&
      name === targetName
    ) {
      score += 80;
    }

    if (
      targetRole &&
      role === targetRole
    ) {
      score += 35;
    }

    if (
      targetTag &&
      tag === targetTag
    ) {
      score += 25;
    }

    if (
      targetType &&
      type === targetType
    ) {
      score += 25;
    }

    if (
      target.id &&
      id ===
        normalize(target.id)
    ) {
      score += 110;
    }

    // Secondary text signals

    if (
      targetText &&
      ariaLabel.includes(
        targetText
      )
    ) {
      score += 40;
    }

    if (
      targetText &&
      placeholder.includes(
        targetText
      )
    ) {
      score += 30;
    }

    if (
      targetText &&
      title.includes(
        targetText
      )
    ) {
      score += 25;
    }

    if (
      targetText &&
      name.includes(
        targetText
      )
    ) {
      score += 20;
    }

    // Prefer interactive elements

    if (
      isInteractive(
        element
      )
    ) {
      score += 10;
    }

    if (
      element.hasAttribute(
        "disabled"
      )
    ) {
      score -= 100;
    }

    if (
      element.getAttribute(
        "aria-disabled"
      ) === "true"
    ) {
      score -= 100;
    }

    return score;
  }

  // --------------------------------------------------
  // DESCRIBE ELEMENT
  // --------------------------------------------------

  function describeElement(
    element
  ) {
    if (
      !(element instanceof Element)
    ) {
      return null;
    }

    const rect =
      element.getBoundingClientRect();

    return {
      tag:
        element.tagName.toLowerCase(),

      id:
        element.id || null,

      role:
        element.getAttribute(
          "role"
        ),

      type:
        element.getAttribute(
          "type"
        ),

      text:
        normalize(
          element.innerText ||
          element.textContent
        ).slice(0, 300),

      ariaLabel:
        element.getAttribute(
          "aria-label"
        ),

      placeholder:
        element.getAttribute(
          "placeholder"
        ),

      name:
        element.getAttribute(
          "name"
        ),

      disabled:
        Boolean(
          element.hasAttribute(
            "disabled"
          ) ||
          element.getAttribute(
            "aria-disabled"
          ) === "true"
        ),

      position: {
        x:
          Math.round(rect.x),

        y:
          Math.round(rect.y),

        width:
          Math.round(
            rect.width
          ),

        height:
          Math.round(
            rect.height
          ),
      },
    };
  }

  // --------------------------------------------------
  // VISIBILITY
  // --------------------------------------------------

  function isVisible(element) {
    if (
      !(element instanceof Element)
    ) {
      return false;
    }

    const style =
      getComputedStyle(
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

  // --------------------------------------------------
  // INTERACTIVITY
  // --------------------------------------------------

  function isInteractive(
    element
  ) {
    const tag =
      element.tagName
        .toLowerCase();

    if (
      [
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "summary",
      ].includes(tag)
    ) {
      return true;
    }

    if (
      element.isContentEditable
    ) {
      return true;
    }

    const role =
      element.getAttribute(
        "role"
      );

    return [
      "button",
      "link",
      "checkbox",
      "radio",
      "switch",
      "tab",
      "menuitem",
      "textbox",
      "combobox",
    ].includes(role);
  }

  // --------------------------------------------------
  // NORMALIZE
  // --------------------------------------------------

  function normalize(value) {
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
      .trim()
      .toLowerCase();
  }

  console.log(
    "[MOOT] Element Finder loaded."
  );
})();
