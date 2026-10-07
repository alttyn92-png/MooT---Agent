/**
 * MOOT PAGE OBSERVER
 *
 * Следит за изменениями страницы после действий агента.
 *
 * Использует MutationObserver и события браузера.
 *
 * Нужен для сценария:
 *
 * MOOT нажал кнопку
 * ↓
 * страница изменилась
 * ↓
 * observer сообщает об изменениях
 * ↓
 * агент снова анализирует страницу
 */

(() => {
  "use strict";

  window.MOOTPageObserver?.stop();

  const MAX_MOOTATIONS = 100;

  const state = {
    observer: null,
    running: false,

    mutations: [],

    lastMutationAt: null,
    lastUrl: location.href,

    listeners: new Set(),
  };

  const PageObserver = {
    start,
    stop,
    clear,
    getState,
    getChanges,
    waitForChange,
    waitForStable,
    subscribe,
    unsubscribe,
  };

  window.MOOTPageObserver =
    PageObserver;

  // --------------------------------------------------
  // START
  // --------------------------------------------------

  function start() {
    if (state.running) {
      return {
        running: true,
        alreadyRunning: true,
      };
    }

    state.observer =
      new MutationObserver(
        handleMutations
      );

    state.observer.observe(
      document.documentElement,
      {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,

        attributeFilter: [
          "class",
          "style",
          "hidden",
          "disabled",
          "aria-hidden",
          "aria-expanded",
          "aria-selected",
          "aria-checked",
          "aria-disabled",
          "value",
        ],
      }
    );

    state.running = true;

    window.addEventListener(
      "popstate",
      handleNavigation
    );

    window.addEventListener(
      "hashchange",
      handleNavigation
    );

    return {
      running: true,
      startedAt: Date.now(),
    };
  }

  // --------------------------------------------------
  // STOP
  // --------------------------------------------------

  function stop() {
    if (
      state.observer
    ) {
      state.observer.disconnect();
    }

    state.observer = null;
    state.running = false;

    window.removeEventListener(
      "popstate",
      handleNavigation
    );

    window.removeEventListener(
      "hashchange",
      handleNavigation
    );

    return {
      running: false,
      stoppedAt: Date.now(),
    };
  }

  // --------------------------------------------------
  // MOOTATIONS
  // --------------------------------------------------

  function handleMutations(
    mutationList
  ) {
    const timestamp =
      Date.now();

    for (
      const mutation of
      mutationList
    ) {
      const record =
        mutationToRecord(
          mutation,
          timestamp
        );

      if (!record) {
        continue;
      }

      state.mutations.push(
        record
      );

      if (
        state.mutations.length >
        MAX_MOOTATIONS
      ) {
        state.mutations.shift();
      }
    }

    state.lastMutationAt =
      timestamp;

    notifyListeners({
      type: "mutation",
      timestamp,
      count:
        mutationList.length,
    });
  }

  // --------------------------------------------------
  // CONVERT MOOTATION
  // --------------------------------------------------

  function mutationToRecord(
    mutation,
    timestamp
  ) {
    const target =
      mutation.target;

    if (
      !(target instanceof Node)
    ) {
      return null;
    }

    const element =
      target instanceof Element
        ? target
        : target.parentElement;

    const record = {
      type:
        mutation.type,

      timestamp,

      tag:
        element?.tagName
          ?.toLowerCase() ||
        null,

      id:
        element?.id ||
        null,

      className:
        safeClassName(
          element
        ),

      text:
        getSmallText(
          element
        ),
    };

    if (
      mutation.type ===
      "attributes"
    ) {
      record.attribute =
        mutation.attributeName;
    }

    if (
      mutation.type ===
      "childList"
    ) {
      record.addedNodes =
        mutation.addedNodes.length;

      record.removedNodes =
        mutation.removedNodes.length;
    }

    return record;
  }

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  function handleNavigation() {
    const url =
      location.href;

    if (
      url ===
      state.lastUrl
    ) {
      return;
    }

    const oldUrl =
      state.lastUrl;

    state.lastUrl = url;

    const record = {
      type: "navigation",

      oldUrl,
      url,

      timestamp:
        Date.now(),
    };

    state.mutations.push(
      record
    );

    notifyListeners(
      record
    );
  }

  // --------------------------------------------------
  // CHANGES
  // --------------------------------------------------

  function getChanges(
    options = {}
  ) {
    const since =
      Number(
        options.since || 0
      );

    const limit =
      Number.isFinite(
        options.limit
      )
        ? Math.max(
            1,
            Math.min(
              100,
              options.limit
            )
          )
        : 100;

    return state.mutations
      .filter(
        (item) =>
          item.timestamp >=
          since
      )
      .slice(-limit);
  }

  // --------------------------------------------------
  // CLEAR
  // --------------------------------------------------

  function clear() {
    state.mutations = [];
    state.lastMutationAt =
      null;

    return {
      cleared: true,
    };
  }

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  function getState() {
    return {
      running:
        state.running,

      mutationCount:
        state.mutations.length,

      lastMutationAt:
        state.lastMutationAt,

      lastUrl:
        state.lastUrl,

      timestamp:
        Date.now(),
    };
  }

  // --------------------------------------------------
  // WAIT FOR ANY CHANGE
  // --------------------------------------------------

  function waitForChange(
    options = {}
  ) {
    const timeout =
      Number.isFinite(
        options.timeout
      )
        ? Math.max(
            100,
            options.timeout
          )
        : 10000;

    const startedAt =
      Date.now();

    return new Promise(
      (resolve) => {
        let finished = false;

        const finish = (
          result
        ) => {
          if (finished) {
            return;
          }

          finished = true;

          unsubscribe(
            listener
          );

          clearTimeout(
            timer
          );

          resolve(result);
        };

        const listener = (
          event
        ) => {
          finish({
            changed: true,
            event,
            waitedMs:
              Date.now() -
              startedAt,
          });
        };

        subscribe(
          listener
        );

        const timer =
          setTimeout(() => {
            finish({
              changed: false,
              timeout: true,
              waitedMs:
                Date.now() -
                startedAt,
            });
          }, timeout);
      }
    );
  }

  // --------------------------------------------------
  // WAIT UNTIL PAGE BECOMES STABLE
  // --------------------------------------------------

  async function waitForStable(
    options = {}
  ) {
    const quietMs =
      Number.isFinite(
        options.quietMs
      )
        ? Math.max(
            100,
            options.quietMs
          )
        : 800;

    const timeout =
      Number.isFinite(
        options.timeout
      )
        ? Math.max(
            quietMs,
            options.timeout
          )
        : 10000;

    const startedAt =
      Date.now();

    let lastChange =
      state.lastMutationAt ||
      Date.now();

    return new Promise(
      (resolve) => {
        let interval;

        const finish = (
          result
        ) => {
          clearInterval(
            interval
          );

          resolve(result);
        };

        interval =
          setInterval(() => {
            const now =
              Date.now();

            if (
              state.lastMutationAt
            ) {
              lastChange =
                state.lastMutationAt;
            }

            const quietFor =
              now - lastChange;

            if (
              quietFor >=
              quietMs
            ) {
              finish({
                stable: true,

                quietFor,

                waitedMs:
                  now -
                  startedAt,
              });

              return;
            }

            if (
              now -
                startedAt >=
              timeout
            ) {
              finish({
                stable: false,

                timeout: true,

                waitedMs:
                  now -
                  startedAt,
              });
            }
          }, 100);
      }
    );
  }

  // --------------------------------------------------
  // SUBSCRIPTIONS
  // --------------------------------------------------

  function subscribe(
    listener
  ) {
    if (
      typeof listener !==
      "function"
    ) {
      return false;
    }

    state.listeners.add(
      listener
    );

    return true;
  }

  function unsubscribe(
    listener
  ) {
    return state.listeners.delete(
      listener
    );
  }

  function notifyListeners(
    event
  ) {
    for (
      const listener of
      state.listeners
    ) {
      try {
        listener(event);
      } catch (error) {
        console.warn(
          "[MOOT] Page Observer listener error:",
          error
        );
      }
    }
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function safeClassName(
    element
  ) {
    if (!element) {
      return null;
    }

    if (
      typeof element.className ===
      "string"
    ) {
      return element.className
        .slice(0, 200);
    }

    return null;
  }

  function getSmallText(
    element
  ) {
    if (!element) {
      return null;
    }

    const text =
      (
        element.innerText ||
        element.textContent ||
        ""
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (!text) {
      return null;
    }

    return text.slice(
      0,
      300
    );
  }

  // --------------------------------------------------
  // AUTO START
  // --------------------------------------------------

  start();

  console.log(
    "[MOOT] Page Observer loaded."
  );
})();
