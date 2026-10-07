/**
 * MOOT DOM SCANNER
 *
 * Даёт MOOT более структурированное представление страницы.
 * Используется агентом для понимания:
 * - заголовков;
 * - секций;
 * - ссылок;
 * - кнопок;
 * - полей;
 * - таблиц;
 * - списков;
 * - диалогов;
 * - навигации;
 *
 * Это не просто "весь HTML", а очищенная структура,
 * удобная для отправки модели.
 */

(() => {
  "use strict";

  const MAX_ITEMS_PER_GROUP = 100;
  const MAX_TEXT = 500;
  const MAX_PAGE_TEXT = 15000;

  const DOMScanner = {
    scan,
    getHeadings,
    getLinks,
    getButtons,
    getInputs,
    getDialogs,
    getTables,
    getLists,
    getLandmarks,
    getCompactSnapshot,
  };

  window.MOOTDOMScanner = DOMScanner;

  // --------------------------------------------------
  // MAIN SCAN
  // --------------------------------------------------

  function scan(options = {}) {
    const config = {
      headings:
        options.headings !== false,

      links:
        options.links !== false,

      buttons:
        options.buttons !== false,

      inputs:
        options.inputs !== false,

      dialogs:
        options.dialogs !== false,

      tables:
        options.tables !== false,

      lists:
        options.lists !== false,

      landmarks:
        options.landmarks !== false,

      pageText:
        options.pageText !== false,
    };

    const result = {
      url: location.href,
      title: document.title || "",
      timestamp: Date.now(),
    };

    if (config.headings) {
      result.headings =
        getHeadings();
    }

    if (config.links) {
      result.links =
        getLinks();
    }

    if (config.buttons) {
      result.buttons =
        getButtons();
    }

    if (config.inputs) {
      result.inputs =
        getInputs();
    }

    if (config.dialogs) {
      result.dialogs =
        getDialogs();
    }

    if (config.tables) {
      result.tables =
        getTables();
    }

    if (config.lists) {
      result.lists =
        getLists();
    }

    if (config.landmarks) {
      result.landmarks =
        getLandmarks();
    }

    if (config.pageText) {
      result.pageText =
        getPageText();
    }

    return result;
  }

  // --------------------------------------------------
  // HEADINGS
  // --------------------------------------------------

  function getHeadings() {
    return Array.from(
      document.querySelectorAll(
        "h1,h2,h3,h4,h5,h6"
      )
    )
      .filter(isVisible)
      .slice(
        0,
        MAX_ITEMS_PER_GROUP
      )
      .map((element) => ({
        level:
          Number(
            element.tagName.slice(1)
          ),

        text:
          cleanText(
            element.innerText ||
            element.textContent
          ),

        id:
          element.id || null,
      }))
      .filter((item) => item.text);
  }

  // --------------------------------------------------
  // LINKS
  // --------------------------------------------------

  function getLinks() {
    return Array.from(
      document.querySelectorAll(
        "a[href]"
      )
    )
      .filter(isVisible)
      .slice(
        0,
        MAX_ITEMS_PER_GROUP
      )
      .map((element) => ({
        text:
          cleanText(
            element.innerText ||
            element.textContent ||
            element.getAttribute(
              "aria-label"
            )
          ),

        href:
          element.href || null,

        target:
          element.target || null,

        ariaLabel:
          cleanText(
            element.getAttribute(
              "aria-label"
            )
          ) || null,

        selector:
          getSelector(element),
      }));
  }

  // --------------------------------------------------
  // BUTTONS
  // --------------------------------------------------

  function getButtons() {
    return Array.from(
      document.querySelectorAll(
        [
          "button",
          "[role='button']",
          "input[type='button']",
          "input[type='submit']",
        ].join(",")
      )
    )
      .filter(isVisible)
      .slice(
        0,
        MAX_ITEMS_PER_GROUP
      )
      .map((element) => ({
        text:
          cleanText(
            element.innerText ||
            element.value ||
            element.getAttribute(
              "aria-label"
            )
          ),

        disabled:
          Boolean(
            element.disabled ||
            element.getAttribute(
              "aria-disabled"
            ) === "true"
          ),

        selector:
          getSelector(element),

        ariaLabel:
          cleanText(
            element.getAttribute(
              "aria-label"
            )
          ) || null,
      }));
  }

  // --------------------------------------------------
  // INPUTS
  // --------------------------------------------------

  function getInputs() {
    return Array.from(
      document.querySelectorAll(
        [
          "input",
          "textarea",
          "select",
          "[contenteditable='true']",
        ].join(",")
      )
    )
      .filter(isVisible)
      .slice(
        0,
        MAX_ITEMS_PER_GROUP
      )
      .map((element) => {
        const tag =
          element.tagName.toLowerCase();

        const type =
          element.getAttribute(
            "type"
          ) || null;

        return {
          tag,
          type,

          name:
            element.getAttribute(
              "name"
            ),

          placeholder:
            element.getAttribute(
              "placeholder"
            ),

          ariaLabel:
            element.getAttribute(
              "aria-label"
            ),

          required:
            Boolean(
              element.required ||
              element.getAttribute(
                "aria-required"
              ) === "true"
            ),

          disabled:
            Boolean(
              element.disabled ||
              element.getAttribute(
                "aria-disabled"
              ) === "true"
            ),

          editable:
            isEditable(
              element
            ),

          selector:
            getSelector(element),
        };
      });
  }

  // --------------------------------------------------
  // DIALOGS / MODALS
  // --------------------------------------------------

  function getDialogs() {
    return Array.from(
      document.querySelectorAll(
        [
          "dialog",
          "[role='dialog']",
          "[role='alertdialog']",
          "[aria-modal='true']",
        ].join(",")
      )
    )
      .filter(isVisible)
      .slice(
        0,
        30
      )
      .map((element) => ({
        text:
          truncate(
            cleanText(
              element.innerText ||
              element.textContent
            ),
            2000
          ),

        ariaLabel:
          element.getAttribute(
            "aria-label"
          ),

        modal:
          element.getAttribute(
            "aria-modal"
          ) === "true",

        selector:
          getSelector(element),
      }));
  }

  // --------------------------------------------------
  // TABLES
  // --------------------------------------------------

  function getTables() {
    return Array.from(
      document.querySelectorAll(
        "table"
      )
    )
      .filter(isVisible)
      .slice(0, 20)
      .map((table, tableIndex) => {
        const headers =
          Array.from(
            table.querySelectorAll(
              "thead th, tr:first-child th"
            )
          )
            .map((cell) =>
              cleanText(
                cell.innerText ||
                cell.textContent
              )
            )
            .filter(Boolean)
            .slice(0, 30);

        const rows =
          Array.from(
            table.querySelectorAll(
              "tbody tr, tr"
            )
          )
            .slice(0, 30)
            .map((row) =>
              Array.from(
                row.querySelectorAll(
                  "td, th"
                )
              )
                .map((cell) =>
                  truncate(
                    cleanText(
                      cell.innerText ||
                      cell.textContent
                    ),
                    200
                  )
                )
                .slice(0, 30)
            )
            .filter(
              (row) =>
                row.length > 0
            );

        return {
          index: tableIndex,
          headers,
          rows,
          selector:
            getSelector(table),
        };
      });
  }

  // --------------------------------------------------
  // LISTS
  // --------------------------------------------------

  function getLists() {
    return Array.from(
      document.querySelectorAll(
        "ul,ol"
      )
    )
      .filter(isVisible)
      .slice(0, 30)
      .map((list, index) => ({
        index,

        type:
          list.tagName.toLowerCase(),

        items:
          Array.from(
            list.children
          )
            .filter(
              (child) =>
                child.tagName === "LI"
            )
            .slice(0, 50)
            .map((item) =>
              truncate(
                cleanText(
                  item.innerText ||
                  item.textContent
                ),
                300
              )
            )
            .filter(Boolean),

        selector:
          getSelector(list),
      }));
  }

  // --------------------------------------------------
  // LANDMARKS
  // --------------------------------------------------

  function getLandmarks() {
    const selector = [
      "main",
      "nav",
      "header",
      "footer",
      "aside",
      "[role='main']",
      "[role='navigation']",
      "[role='banner']",
      "[role='contentinfo']",
      "[role='complementary']",
      "[role='search']",
    ].join(",");

    return Array.from(
      document.querySelectorAll(
        selector
      )
    )
      .filter(isVisible)
      .slice(0, 50)
      .map((element) => ({
        tag:
          element.tagName.toLowerCase(),

        role:
          element.getAttribute(
            "role"
          ),

        ariaLabel:
          element.getAttribute(
            "aria-label"
          ),

        text:
          truncate(
            cleanText(
              element.innerText ||
              element.textContent
            ),
            1000
          ),

        selector:
          getSelector(element),
      }));
  }

  // --------------------------------------------------
  // PAGE TEXT
  // --------------------------------------------------

  function getPageText() {
    if (
      window.MOOTPageReader
    ) {
      return truncate(
        window.MOOTPageReader.readVisibleText(),
        MAX_PAGE_TEXT
      );
    }

    return truncate(
      cleanText(
        document.body?.innerText ||
        ""
      ),
      MAX_PAGE_TEXT
    );
  }

  // --------------------------------------------------
  // COMPACT SNAPSHOT
  // --------------------------------------------------

  function getCompactSnapshot() {
    return {
      url:
        location.href,

      title:
        document.title,

      headings:
        getHeadings().slice(
          0,
          30
        ),

      buttons:
        getButtons().slice(
          0,
          50
        ),

      inputs:
        getInputs().slice(
          0,
          50
        ),

      links:
        getLinks().slice(
          0,
          50
        ),

      dialogs:
        getDialogs().slice(
          0,
          10
        ),

      timestamp:
        Date.now(),
    };
  }

  // --------------------------------------------------
  // HELPERS
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

    return (
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function isEditable(element) {
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

  function cleanText(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return truncate(
      String(value)
        .replace(
          /\s+/g,
          " "
        )
        .trim(),
      MAX_TEXT
    );
  }

  function truncate(
    value,
    maxLength
  ) {
    if (!value) {
      return "";
    }

    const stringValue =
      String(value);

    return stringValue.length >
      maxLength
      ? stringValue.slice(
          0,
          maxLength
        ) + "…"
      : stringValue;
  }

  function getSelector(element) {
    if (
      window.MOOTPageReader
    ) {
      const summary =
        window.MOOTPageReader.getElementSummary(
          element
        );

      if (
        summary?.selector
      ) {
        return summary.selector;
      }
    }

    if (element.id) {
      return `#${CSS.escape(
        element.id
      )}`;
    }

    return element.tagName.toLowerCase();
  }

  console.log(
    "[MOOT] DOM Scanner loaded."
  );
})();